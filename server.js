const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const session = require('express-session');
const db = require('./lib/database');
const gameLogic = require('./lib/game-logic');
const AIOpponent = require('./lib/ai-opponent');
const { v4: uuidv4 } = require('uuid');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = process.env.PORT || 3000;
// when using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const SESSION_SECRET = process.env.SESSION_SECRET || 'dead-and-wounded-secret-key-nextjs';

// Session configuration
const sessionMiddleware = session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: true, // Changed to true to save session on first request
    cookie: {
        secure: false, // Set to false for Railway (Railway handles HTTPS termination)
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days instead of 24 hours
        sameSite: 'lax'
    }
});

// Initialize DB
app.prepare().then(async () => {
    try {
        await db.initDatabase();
        console.log('✅ Database initialized successfully');
    } catch (error) {
        console.error('⚠️ Database initialization failed:', error.message);
        console.error('Server will continue but features requiring database will not work');
    }
    const server = createServer(async (req, res) => {
        try {
            // Parse request URL
            const parsedUrl = parse(req.url, true);

            // Run session middleware manually for HTTP requests
            await new Promise((resolve, reject) => {
                sessionMiddleware(req, res, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            // Handle with Next.js
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    });

    // Socket.IO Setup with CORS
    const io = new Server(server, {
        cors: {
            origin: "*", // Allow all origins in production (Railway handles this)
            methods: ["GET", "POST"],
            credentials: true
        },
        allowEIO3: true
    });

    // Wrap session middleware for Socket.IO
    const wrap = middleware => (socket, next) => middleware(socket.request, {}, next);
    io.use(wrap(sessionMiddleware));

    // Track connected sockets by user ID
    const userSockets = new Map();

    // Socket.IO connection handler
    io.on('connection', (socket) => {
        const session = socket.request.session;

        console.log('Socket connection attempt');
        console.log('Session exists:', !!session);
        console.log('Session userId:', session?.userId);

        // Check auth from session - disconnect if not authenticated
        if (!session || !session.userId) {
            console.log('⚠️ Unauthenticated socket - disconnecting');
            socket.disconnect(true);
            return;
        }

        const userId = session.userId;
        const username = session.username;

        console.log(`User ${username} (${userId}) connected`);
        userSockets.set(userId, socket);

        // --- REUSED GAME LOGIC FROM PREVIOUS SERVER.JS ---
        // Check for existing active game
        db.gameOps.findActiveForUser(userId).then(existingGame => {
            if (existingGame) {
                socket.emit('game:rejoin', formatGameState(existingGame, userId));
            }
        }).catch(err => console.error('Error finding active game:', err));

        socket.on('game:find', async () => {
            try {
                const activeGame = await db.gameOps.findActiveForUser(userId);
                if (activeGame) {
                    socket.emit('game:found', formatGameState(activeGame, userId));
                    return;
                }

                const waitingGame = await db.gameOps.findWaiting(userId);

                if (waitingGame) {
                    await db.gameOps.join(userId, waitingGame.id);
                    const game = await db.gameOps.findById(waitingGame.id);

                    socket.emit('game:found', formatGameState(game, userId));

                    const opponentSocket = userSockets.get(waitingGame.player1_id);
                    if (opponentSocket) {
                        opponentSocket.emit('game:opponent_joined', formatGameState(game, waitingGame.player1_id));
                    }
                } else {
                    const gameId = uuidv4();
                    await db.gameOps.create(gameId, userId);
                    socket.emit('game:waiting', { gameId });
                }
            } catch (error) {
                console.error('Find game error:', error);
                socket.emit('error', { message: 'Failed to find game' });
            }
        });

        socket.on('game:create_private', async () => {
            try {
                const activeGame = await db.gameOps.findActiveForUser(userId);
                if (activeGame) {
                    socket.emit('game:error', { message: 'You already have an active game' });
                    return;
                }

                // Generate unique 6-character code
                let gameCode;
                let attempts = 0;
                do {
                    gameCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                    const existing = await db.gameOps.findByCode(gameCode);
                    if (!existing) break;
                    attempts++;
                } while (attempts < 10);

                if (attempts >= 10) {
                    socket.emit('game:error', { message: 'Failed to generate unique code' });
                    return;
                }

                const gameId = uuidv4();
                await db.gameOps.createPrivate(gameId, userId, gameCode);
                socket.emit('game:private_created', { gameId, gameCode });
            } catch (error) {
                console.error('Create private game error:', error);
                socket.emit('game:error', { message: 'Failed to create private game' });
            }
        });

        socket.on('game:join_private', async ({ gameCode }) => {
            try {
                const activeGame = await db.gameOps.findActiveForUser(userId);
                if (activeGame) {
                    socket.emit('game:error', { message: 'You already have an active game' });
                    return;
                }

                const game = await db.gameOps.findByCode(gameCode.toUpperCase());
                if (!game) {
                    socket.emit('game:error', { message: 'Invalid game code' });
                    return;
                }

                if (game.status !== 'waiting') {
                    socket.emit('game:error', { message: 'Game already started or finished' });
                    return;
                }

                if (game.player1_id === userId) {
                    socket.emit('game:error', { message: 'Cannot join your own game' });
                    return;
                }

                await db.gameOps.join(userId, game.id);
                const updatedGame = await db.gameOps.findById(game.id);

                socket.emit('game:found', formatGameState(updatedGame, userId));

                const opponentSocket = userSockets.get(game.player1_id);
                if (opponentSocket) {
                    opponentSocket.emit('game:opponent_joined', formatGameState(updatedGame, game.player1_id));
                }
            } catch (error) {
                console.error('Join private game error:', error);
                socket.emit('game:error', { message: 'Failed to join private game' });
            }
        });

        socket.on('game:history', async ({ limit = 20 }) => {
            try {
                const history = await db.gameOps.getHistory(userId, limit);
                socket.emit('game:history_result', { history });
            } catch (error) {
                console.error('Get history error:', error);
                socket.emit('game:error', { message: 'Failed to fetch history' });
            }
        });

        socket.on('game:play_ai', async ({ difficulty = 'medium' }) => {
            try {
                // Validate difficulty
                const validDifficulties = ['easy', 'medium', 'hard'];
                const aiDifficulty = validDifficulties.includes(difficulty) ? difficulty : 'medium';

                const activeGame = await db.gameOps.findActiveForUser(userId);
                if (activeGame) {
                    socket.emit('game:error', { message: 'You already have an active game' });
                    return;
                }

                const gameId = uuidv4();
                await db.gameOps.createAI(gameId, userId, aiDifficulty);

                // Create AI opponent
                const ai = new AIOpponent(aiDifficulty);
                const aiSecret = ai.generateSecret();

                // Store AI secret
                await db.gameOps.setSecrets(gameId, null, aiSecret);

                const game = await db.gameOps.findById(gameId);
                socket.emit('game:ai_created', {
                    ...formatGameState(game, userId),
                    aiDifficulty: aiDifficulty,
                    opponentName: `AI (${aiDifficulty.charAt(0).toUpperCase() + aiDifficulty.slice(1)})`
                });
            } catch (error) {
                console.error('Create AI game error:', error);
                socket.emit('game:error', { message: 'Failed to create AI game' });
            }
        });

        socket.on('game:practice', async () => {
            try {
                const activeGame = await db.gameOps.findActiveForUser(userId);
                if (activeGame) {
                    socket.emit('game:error', { message: 'You already have an active game' });
                    return;
                }

                const gameId = uuidv4();
                await db.gameOps.createPractice(gameId, userId);

                // Generate random secret for practice
                const ai = new AIOpponent();
                const practiceSecret = ai.generateSecret();

                await db.gameOps.setSecrets(gameId, null, practiceSecret);
                await db.gameOps.start(userId, gameId);

                const game = await db.gameOps.findById(gameId);
                socket.emit('game:practice_created', {
                    ...formatGameState(game, userId),
                    isPractice: true
                });
            } catch (error) {
                console.error('Create practice game error:', error);
                socket.emit('game:error', { message: 'Failed to create practice game' });
            }
        });

        socket.on('game:secret', async ({ gameId, secret }) => {
            try {
                const validation = gameLogic.validateNumber(secret);
                if (!validation.valid) {
                    socket.emit('game:error', { message: validation.error });
                    return;
                }

                const game = await db.gameOps.findById(gameId);
                if (!game || (game.player1_id !== userId && game.player2_id !== userId)) {
                    socket.emit('game:error', { message: 'Invalid game' });
                    return;
                }

                if (game.player1_id === userId) await db.gameOps.setPlayer1Secret(secret, gameId);
                else await db.gameOps.setPlayer2Secret(secret, gameId);

                const updatedGame = await db.gameOps.findById(gameId);

                if (updatedGame.player1_secret && updatedGame.player2_secret) {
                    await db.gameOps.start(updatedGame.player1_id, gameId);
                    const startedGame = await db.gameOps.findById(gameId);

                    const p1Socket = userSockets.get(startedGame.player1_id);
                    const p2Socket = userSockets.get(startedGame.player2_id);

                    if (p1Socket) p1Socket.emit('game:started', formatGameState(startedGame, startedGame.player1_id));
                    if (p2Socket) p2Socket.emit('game:started', formatGameState(startedGame, startedGame.player2_id));
                } else {
                    socket.emit('game:secret_set', { message: 'Secret set! Waiting for opponent...' });
                }
            } catch (error) {
                console.error('Secret error:', error);
            }
        });

        socket.on('game:guess', async ({ gameId, guess }) => {
            try {
                const validation = gameLogic.validateNumber(guess);
                if (!validation.valid) {
                    socket.emit('game:error', { message: validation.error });
                    return;
                }

                const game = await db.gameOps.findById(gameId);
                if (!game || game.status !== 'playing' || game.current_turn !== userId) {
                    socket.emit('game:error', { message: 'Invalid move' });
                    return;
                }

                // Check for duplicate guesses
                const previousGuesses = await db.guessOps.getByPlayer(gameId, userId);
                if (previousGuesses.some(g => g.guess === guess)) {
                    socket.emit('game:error', { message: 'You already guessed this number!' });
                    return;
                }

                const opponentSecret = game.player1_id === userId ? game.player2_secret : game.player1_secret;
                const result = gameLogic.calculateDeadWounded(opponentSecret, guess);

                await db.guessOps.add(gameId, userId, guess, result.dead, result.wounded);

                if (gameLogic.isWinningGuess(result.dead)) {
                    await db.gameOps.end(userId, gameId);
                    const loserId = game.player1_id === userId ? game.player2_id : game.player1_id;
                    await db.userOps.updateStats(1, 0, userId);
                    await db.userOps.updateStats(0, 1, loserId);

                    const finishedGame = await db.gameOps.findById(gameId);
                    const guesses = await db.guessOps.getAll(gameId);

                    const gameOverData = {
                        winnerId: userId,
                        winnerUsername: username,
                        guesses: guesses,
                        player1Secret: game.player1_secret,
                        player2Secret: game.player2_secret,
                        ...result // include last guess result
                    };

                    const p1Socket = userSockets.get(game.player1_id);
                    const p2Socket = userSockets.get(game.player2_id);

                    if (p1Socket) p1Socket.emit('game:over', { ...formatGameState(finishedGame, game.player1_id), ...gameOverData });
                    if (p2Socket) p2Socket.emit('game:over', { ...formatGameState(finishedGame, game.player2_id), ...gameOverData });

                } else {
                    const nextTurn = game.player1_id === userId ? game.player2_id : game.player1_id;
                    await db.gameOps.switchTurn(nextTurn, gameId);

                    const updatedGame = await db.gameOps.findById(gameId);
                    const guessData = { playerId: userId, playerUsername: username, guess, ...result };

                    const p1Socket = userSockets.get(game.player1_id);
                    const p2Socket = userSockets.get(game.player2_id);

                    const p1Guesses = await db.guessOps.getByPlayer(gameId, game.player1_id);
                    const p2Guesses = await db.guessOps.getByPlayer(gameId, game.player2_id);

                    if (p1Socket) p1Socket.emit('game:guess_result', {
                        ...formatGameState(updatedGame, game.player1_id),
                        lastGuess: guessData,
                        guesses: p1Guesses
                    });
                    if (p2Socket) p2Socket.emit('game:guess_result', {
                        ...formatGameState(updatedGame, game.player2_id),
                        lastGuess: guessData,
                        guesses: p2Guesses
                    });

                    // Handle AI turn if this is an AI game
                    if (game.is_ai && !game.is_practice) {
                        socket.emit('game:ai_thinking', { thinking: true });

                        setTimeout(async () => {
                            try {
                                const ai = new AIOpponent(game.ai_difficulty);
                                const aiGuesses = await db.guessOps.getByPlayer(gameId, null);
                                const aiGuess = ai.makeGuess(aiGuesses.map(g => ({ guess: g.guess, dead: g.dead, wounded: g.wounded })));

                                const playerSecret = game.player1_secret;
                                const aiResult = gameLogic.calculateDeadWounded(playerSecret, aiGuess);

                                await db.guessOps.add(gameId, null, aiGuess, aiResult.dead, aiResult.wounded);

                                if (gameLogic.isWinningGuess(aiResult.dead)) {
                                    await db.gameOps.end(null, gameId);
                                    await db.userOps.updateStats(0, 1, userId);

                                    const finishedGame = await db.gameOps.findById(gameId);
                                    const allGuesses = await db.guessOps.getAll(gameId);

                                    socket.emit('game:over', {
                                        ...formatGameState(finishedGame, userId),
                                        winnerId: null,
                                        winnerUsername: `AI (${game.ai_difficulty})`,
                                        guesses: allGuesses,
                                        player1Secret: game.player1_secret,
                                        player2Secret: game.player2_secret
                                    });
                                } else {
                                    await db.gameOps.switchTurn(userId, gameId);
                                    const gameAfterAI = await db.gameOps.findById(gameId);
                                    const playerGuesses = await db.guessOps.getByPlayer(gameId, userId);
                                    const aiAllGuesses = await db.guessOps.getByPlayer(gameId, null);

                                    socket.emit('game:ai_thinking', { thinking: false });
                                    socket.emit('game:guess_result', {
                                        ...formatGameState(gameAfterAI, userId),
                                        lastGuess: { playerId: null, playerUsername: `AI (${game.ai_difficulty})`, guess: aiGuess, ...aiResult },
                                        guesses: playerGuesses
                                    });
                                }
                            } catch (error) {
                                console.error('AI turn error:', error);
                                socket.emit('game:ai_thinking', { thinking: false });
                            }
                        }, 1500);
                    }
                }
            } catch (error) {
                console.error('Guess error:', error);
            }
        });

        socket.on('disconnect', async () => {
            console.log(`User ${username} (${userId}) disconnected`);
            userSockets.delete(userId);

            // Find and handle any active games
            const activeGame = await db.gameOps.findActiveForUser(userId);
            if (activeGame && activeGame.status !== 'finished') {
                const opponentId = activeGame.player1_id === userId
                    ? activeGame.player2_id
                    : activeGame.player1_id;

                if (opponentId) {
                    const oppSocket = userSockets.get(opponentId);
                    if (oppSocket) {
                        oppSocket.emit('game:opponent_disconnected', {
                            message: 'Opponent disconnected. Reconnecting...'
                        });
                    }
                }
            }
        });

        socket.on('game:leave', async ({ gameId }) => {
            // (Simplify logic: just forfeit if playing)
            const game = await db.gameOps.findById(gameId);
            if (game && (game.status === 'playing' || game.status === 'setup')) {
                const winnerId = game.player1_id === userId ? game.player2_id : game.player1_id;
                await db.gameOps.end(winnerId, gameId);
                await db.userOps.updateStats(0, 1, userId);
                await db.userOps.updateStats(1, 0, winnerId);

                const oppSocket = userSockets.get(winnerId);
                if (oppSocket) oppSocket.emit('game:opponent_left', { message: 'Opponent left. You win!' });
            } else if (game && game.status === 'waiting') {
                await db.gameOps.delete(gameId);
            }
            socket.emit('game:left');
        });
    });

    server.listen(port, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
});


function formatGameState(game, playerId) {
    const isPlayer1 = game.player1_id === playerId;
    const opponentId = isPlayer1 ? game.player2_id : game.player1_id;
    const opponent = opponentId ? db.userOps.findById(opponentId) : null;

    return {
        gameId: game.id,
        status: game.status,
        isYourTurn: game.current_turn === playerId,
        yourSecret: isPlayer1 ? game.player1_secret : game.player2_secret,
        hasSetSecret: isPlayer1 ? !!game.player1_secret : !!game.player2_secret,
        opponentHasSetSecret: isPlayer1 ? !!game.player2_secret : !!game.player1_secret,
        opponent: opponent ? { id: opponent.id, username: opponent.username } : null
    };
}
