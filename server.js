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
    console.log('🔍 Connecting to database...');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('NODE_ENV:', process.env.NODE_ENV);

    try {
        await db.init();
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

    // Helper function to format game state for client
    function formatGameState(game, userId) {
        if (!game) return null;

        const isPlayer1 = game.player1_id === userId;
        const hasSetSecret = isPlayer1 ? !!game.player1_secret : !!game.player2_secret;
        const opponentHasSetSecret = isPlayer1 ? !!game.player2_secret : !!game.player1_secret;

        // Determine game status for client
        let status = game.status;
        if (game.status === 'waiting' && !hasSetSecret) {
            status = 'setup';
        } else if (game.status === 'waiting' && hasSetSecret) {
            status = 'setup'; // Still waiting for opponent
        }

        return {
            gameId: game.id,
            status: status,
            hasSetSecret: hasSetSecret,
            isYourTurn: game.current_turn === userId,
            yourSecret: isPlayer1 ? game.player1_secret : game.player2_secret,
            opponent: {
                username: isPlayer1 ? game.player2_username : game.player1_username,
                hasSetSecret: opponentHasSetSecret
            },
            guesses: [],
            isAI: game.is_ai || false,
            isPractice: game.is_practice || false,
            aiDifficulty: game.ai_difficulty,
            timeControl: game.time_control_seconds,
            player1Time: game.player1_time_remaining,
            player2Time: game.player2_time_remaining,
            isPlayer1: isPlayer1
        };
    }

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
                const { timeControlSeconds } = data || {};

                // Validate time control if provided (minimum 30 seconds)
                if (timeControlSeconds !== undefined && timeControlSeconds !== null) {
                    if (timeControlSeconds < 30) {
                        socket.emit('game:error', { message: 'Minimum time control is 30 seconds' });
                        return;
                    }
                    await db.gameOps.createPrivateTimed(gameId, userId, gameCode, timeControlSeconds);
                } else {
                    await db.gameOps.createPrivate(gameId, userId, gameCode);
                }

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

        // ===== TOURNAMENT EVENTS =====

        socket.on('tournament:create', async (data) => {
            try {
                const { name, maxPlayers, timeControlSeconds, minLevel } = data;

                if (!name || name.trim().length === 0) {
                    socket.emit('game:error', { message: 'Tournament name required' });
                    return;
                }

                const tournamentId = await db.tournamentOps.create(userId, name.trim(), {
                    maxPlayers: maxPlayers || 8,
                    timeControlSeconds,
                    minLevel: minLevel || 1
                });

                // Creator automatically joins
                const user = await db.userOps.findById(userId);
                await db.tournamentOps.join(tournamentId, userId, user.username, user.level);

                const tournament = await db.tournamentOps.findById(tournamentId);
                socket.emit('tournament:created', { tournament });

                // Broadcast to all clients
                io.emit('tournament:list_updated');
            } catch (error) {
                console.error('Create tournament error:', error);
                socket.emit('game:error', { message: error.message || 'Failed to create tournament' });
            }
        });

        socket.on('tournament:join', async (data) => {
            try {
                const { tournamentId } = data;
                const user = await db.userOps.findById(userId);

                await db.tournamentOps.join(tournamentId, userId, user.username, user.level);

                const tournament = await db.tournamentOps.findById(tournamentId);
                const players = await db.tournamentOps.getPlayers(tournamentId);

                socket.emit('tournament:joined', { tournament, players });

                // Notify all players in tournament
                io.emit('tournament:updated', { tournamentId, players });
                io.emit('tournament:list_updated');
            } catch (error) {
                console.error('Join tournament error:', error);
                socket.emit('game:error', { message: error.message || 'Failed to join tournament' });
            }
        });

        socket.on('tournament:leave', async (data) => {
            try {
                const { tournamentId } = data;

                await db.tournamentOps.leave(tournamentId, userId);

                socket.emit('tournament:left', { tournamentId });

                // Notify remaining players
                const players = await db.tournamentOps.getPlayers(tournamentId);
                io.emit('tournament:updated', { tournamentId, players });
                io.emit('tournament:list_updated');
            } catch (error) {
                console.error('Leave tournament error:', error);
                socket.emit('game:error', { message: error.message || 'Failed to leave tournament' });
            }
        });

        socket.on('tournament:start', async (data) => {
            try {
                const { tournamentId } = data;
                const tournament = await db.tournamentOps.findById(tournamentId);

                if (tournament.creator_id !== userId) {
                    socket.emit('game:error', { message: 'Only creator can start tournament' });
                    return;
                }

                await db.tournamentOps.start(tournamentId);

                const updatedTournament = await db.tournamentOps.findById(tournamentId);
                const matches = await db.tournamentOps.getMatches(tournamentId, 1);

                // Create games for all matches in round 1
                const { v4: uuidv4 } = require('uuid');
                for (const match of matches) {
                    const gameId = uuidv4();

                    // Create game with time control if tournament has it
                    if (tournament.time_control_seconds) {
                        await db.gameOps.createPrivateTimed(
                            gameId,
                            match.player1_id,
                            null, // No game code for tournament games
                            tournament.time_control_seconds
                        );
                    } else {
                        await db.gameOps.createPrivate(gameId, match.player1_id, null);
                    }

                    // Join player 2
                    await db.gameOps.join(match.player2_id, gameId);

                    // Link game to match
                    await db.tournamentOps.linkGameToMatch(match.id, gameId);

                    // Notify both players
                    const player1Socket = userSockets.get(match.player1_id);
                    const player2Socket = userSockets.get(match.player2_id);

                    const game = await db.gameOps.findById(gameId);

                    if (player1Socket) {
                        player1Socket.emit('game:found', formatGameState(game, match.player1_id));
                    }
                    if (player2Socket) {
                        player2Socket.emit('game:found', formatGameState(game, match.player2_id));
                    }
                }

                // Notify all players tournament has started
                const players = await db.tournamentOps.getPlayers(tournamentId);
                for (const player of players) {
                    const playerSocket = userSockets.get(player.user_id);
                    if (playerSocket) {
                        playerSocket.emit('tournament:started', {
                            tournament: updatedTournament,
                            matches,
                            players
                        });
                    }
                }

                io.emit('tournament:list_updated');
            } catch (error) {
                console.error('Start tournament error:', error);
                socket.emit('game:error', { message: error.message || 'Failed to start tournament' });
            }
        });

        socket.on('tournament:get_list', async () => {
            try {
                const tournaments = await db.tournamentOps.findOpen();
                socket.emit('tournament:list', { tournaments });
            } catch (error) {
                console.error('Get tournament list error:', error);
                socket.emit('game:error', { message: 'Failed to load tournaments' });
            }
        });

        // ===== ANALYTICS HANDLERS =====
        socket.on('stats:get', async () => {
            try {
                const stats = await db.analyticsOps.getPlayerStats(userId);
                socket.emit('stats:data', stats);
            } catch (error) {
                console.error('Get stats error:', error);
                socket.emit('game:error', { message: 'Failed to load statistics' });
            }
        });

        // ===== SOCIAL HANDLERS =====
        socket.on('friend:request', async (data) => {
            try {
                const { friendId } = data;
                await db.socialOps.sendFriendRequest(userId, friendId);

                // Notify the friend
                const friendSocket = userSockets.get(friendId);
                if (friendSocket) {
                    friendSocket.emit('friend:request_received', {
                        userId,
                        username
                    });
                }

                socket.emit('friend:request_sent', { friendId });
            } catch (error) {
                console.error('Friend request error:', error);
                socket.emit('game:error', { message: error.message || 'Failed to send friend request' });
            }
        });

        socket.on('friend:accept', async (data) => {
            try {
                const { friendId } = data;
                await db.socialOps.acceptFriendRequest(userId, friendId);

                // Notify both users
                const friendSocket = userSockets.get(friendId);
                if (friendSocket) {
                    friendSocket.emit('friend:accepted', {
                        userId,
                        username
                    });
                }

                socket.emit('friend:accepted', { friendId });
            } catch (error) {
                console.error('Accept friend error:', error);
                socket.emit('game:error', { message: 'Failed to accept friend request' });
            }
        });

        socket.on('friend:reject', async (data) => {
            try {
                const { friendId } = data;
                await db.socialOps.rejectFriendRequest(userId, friendId);
                socket.emit('friend:rejected', { friendId });
            } catch (error) {
                console.error('Reject friend error:', error);
                socket.emit('game:error', { message: 'Failed to reject friend request' });
            }
        });

        socket.on('friend:remove', async (data) => {
            try {
                const { friendId } = data;
                await db.socialOps.removeFriend(userId, friendId);

                // Notify the friend
                const friendSocket = userSockets.get(friendId);
                if (friendSocket) {
                    friendSocket.emit('friend:removed', { userId });
                }

                socket.emit('friend:removed', { friendId });
            } catch (error) {
                console.error('Remove friend error:', error);
                socket.emit('game:error', { message: 'Failed to remove friend' });
            }
        });

        socket.on('friend:list', async () => {
            try {
                const friends = await db.socialOps.getFriends(userId);
                const pendingRequests = await db.socialOps.getPendingRequests(userId);

                socket.emit('friend:list_data', {
                    friends,
                    pendingRequests
                });
            } catch (error) {
                console.error('Get friends error:', error);
                socket.emit('game:error', { message: 'Failed to load friends' });
            }
        });

        // ===== CHALLENGE HANDLERS =====
        socket.on('challenge:send', async (data) => {
            try {
                const { friendId, timeControlSeconds } = data;
                const challengeId = await db.socialOps.sendChallenge(userId, friendId, timeControlSeconds);

                // Notify the friend
                const friendSocket = userSockets.get(friendId);
                if (friendSocket) {
                    friendSocket.emit('challenge:received', {
                        challengeId,
                        challengerId: userId,
                        challengerUsername: username,
                        timeControlSeconds
                    });
                }

                socket.emit('challenge:sent', { challengeId, friendId });
            } catch (error) {
                console.error('Send challenge error:', error);
                socket.emit('game:error', { message: 'Failed to send challenge' });
            }
        });

        socket.on('challenge:accept', async (data) => {
            try {
                const { challengeId } = data;
                const challenge = await db.socialOps.acceptChallenge(challengeId);

                // Create game
                const { v4: uuidv4 } = require('uuid');
                const gameId = uuidv4();

                if (challenge.time_control_seconds) {
                    await db.gameOps.createPrivateTimed(
                        gameId,
                        challenge.challenger_id,
                        null,
                        challenge.time_control_seconds
                    );
                } else {
                    await db.gameOps.createPrivate(gameId, challenge.challenger_id, null);
                }

                // Join as challenged player
                await db.gameOps.join(userId, gameId);

                // Link game to challenge
                await db.socialOps.linkGameToChallenge(challengeId, gameId);

                // Notify both players
                const game = await db.gameOps.findById(gameId);

                socket.emit('game:found', formatGameState(game, userId));

                const challengerSocket = userSockets.get(challenge.challenger_id);
                if (challengerSocket) {
                    challengerSocket.emit('game:found', formatGameState(game, challenge.challenger_id));
                }
            } catch (error) {
                console.error('Accept challenge error:', error);
                socket.emit('game:error', { message: error.message || 'Failed to accept challenge' });
            }
        });

        socket.on('challenge:decline', async (data) => {
            try {
                const { challengeId } = data;
                await db.socialOps.declineChallenge(challengeId);
                socket.emit('challenge:declined', { challengeId });
            } catch (error) {
                console.error('Decline challenge error:', error);
                socket.emit('game:error', { message: 'Failed to decline challenge' });
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

                // Check if time has expired
                if (game.time_control_seconds) {
                    const timeCheck = await db.gameOps.checkTimeExpired(gameId, userId);
                    if (timeCheck.expired) {
                        // Time expired - opponent wins
                        const opponentId = game.player1_id === userId ? game.player2_id : game.player1_id;
                        await db.gameOps.end(opponentId, gameId);
                        await db.userOps.updateStats(0, 1, userId);
                        await db.userOps.updateStats(1, 0, opponentId);

                        const finishedGame = await db.gameOps.findById(gameId);
                        const opponentSocket = userSockets.get(opponentId);

                        socket.emit('game:over', {
                            ...formatGameState(finishedGame, userId),
                            winnerId: opponentId,
                            reason: 'timeout',
                            message: 'Time expired! You lose.'
                        });

                        if (opponentSocket) {
                            opponentSocket.emit('game:over', {
                                ...formatGameState(finishedGame, opponentId),
                                winnerId: opponentId,
                                reason: 'timeout',
                                message: 'Opponent ran out of time! You win!'
                            });
                        }
                        return;
                    }

                    // Update time remaining
                    await db.gameOps.updatePlayerTime(gameId, userId, timeCheck.timeRemaining);
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
                    await db.userOps.updateStreak(userId, true);
                    await db.userOps.updateStreak(loserId, false);

                    // Check if this is a tournament match
                    const tournamentMatch = await db.tournamentOps.getMatchByGameId(gameId);
                    if (tournamentMatch) {
                        // Record tournament result
                        await db.tournamentOps.recordResult(tournamentMatch.id, userId);

                        // Check if round is complete
                        const isComplete = await db.tournamentOps.isRoundComplete(
                            tournamentMatch.tournament_id,
                            tournamentMatch.round_number
                        );

                        if (isComplete) {
                            const tournament = await db.tournamentOps.findById(tournamentMatch.tournament_id);

                            // Check if tournament is complete
                            if (tournamentMatch.round_number >= tournament.total_rounds) {
                                await db.tournamentOps.complete(tournamentMatch.tournament_id);

                                // Get final standings
                                const standings = await db.tournamentOps.getStandings(tournamentMatch.tournament_id);
                                const winnerId = standings[0].user_id;

                                // Award tournament winner dignifiable
                                const { awardTournamentWinner } = require('./lib/dignifiables');
                                const winnerDignifiable = await awardTournamentWinner(db, tournamentMatch.tournament_id, winnerId);

                                // Notify winner of dignifiable
                                const winnerSocket = userSockets.get(winnerId);
                                if (winnerSocket) {
                                    winnerSocket.emit('dignifiables:unlocked', {
                                        dignifiables: [winnerDignifiable]
                                    });
                                }

                                // Notify all players
                                const players = await db.tournamentOps.getPlayers(tournamentMatch.tournament_id);
                                for (const player of players) {
                                    const playerSocket = userSockets.get(player.user_id);
                                    if (playerSocket) {
                                        playerSocket.emit('tournament:complete', {
                                            tournament,
                                            standings,
                                            winner: standings[0]
                                        });
                                    }
                                }
                            } else {
                                // Advance to next round
                                const nextRoundMatches = await db.tournamentOps.advanceRound(tournamentMatch.tournament_id);
                                const updatedTournament = await db.tournamentOps.findById(tournamentMatch.tournament_id);

                                // Create games for next round
                                const { v4: uuidv4 } = require('uuid');
                                for (const pairing of nextRoundMatches) {
                                    const gameId = uuidv4();

                                    // Create game with time control if tournament has it
                                    if (tournament.time_control_seconds) {
                                        await db.gameOps.createPrivateTimed(
                                            gameId,
                                            pairing.player1_id,
                                            null,
                                            tournament.time_control_seconds
                                        );
                                    } else {
                                        await db.gameOps.createPrivate(gameId, pairing.player1_id, null);
                                    }

                                    // Join player 2
                                    await db.gameOps.join(pairing.player2_id, gameId);

                                    // Get match ID for this pairing
                                    const matchResult = await db.pool.query(
                                        `SELECT id FROM tournament_matches 
                                         WHERE tournament_id = $1 AND round_number = $2 
                                         AND player1_id = $3 AND player2_id = $4`,
                                        [tournamentMatch.tournament_id, updatedTournament.current_round, pairing.player1_id, pairing.player2_id]
                                    );

                                    if (matchResult.rows.length > 0) {
                                        await db.tournamentOps.linkGameToMatch(matchResult.rows[0].id, gameId);
                                    }

                                    // Notify both players
                                    const player1Socket = userSockets.get(pairing.player1_id);
                                    const player2Socket = userSockets.get(pairing.player2_id);

                                    const game = await db.gameOps.findById(gameId);

                                    if (player1Socket) {
                                        player1Socket.emit('game:found', formatGameState(game, pairing.player1_id));
                                    }
                                    if (player2Socket) {
                                        player2Socket.emit('game:found', formatGameState(game, pairing.player2_id));
                                    }
                                }

                                // Notify all players of new round
                                const players = await db.tournamentOps.getPlayers(tournamentMatch.tournament_id);
                                const standings = await db.tournamentOps.getStandings(tournamentMatch.tournament_id);

                                for (const player of players) {
                                    const playerSocket = userSockets.get(player.user_id);
                                    if (playerSocket) {
                                        playerSocket.emit('tournament:round_started', {
                                            tournament: updatedTournament,
                                            standings
                                        });
                                    }
                                }
                            }
                        }
                    }

                    // Award XP
                    const { calculateXP, getLevelFromXP, checkAchievements } = require('./lib/progression');
                    const winnerXP = calculateXP(game, userId, userId);
                    const loserXP = calculateXP(game, loserId, userId);

                    await db.userOps.addXP(userId, winnerXP);
                    await db.userOps.addXP(loserId, loserXP);

                    // Check for level ups
                    const winnerUser = await db.userOps.findById(userId);
                    const loserUser = await db.userOps.findById(loserId);

                    const winnerNewLevel = getLevelFromXP(winnerUser.xp);
                    const loserNewLevel = getLevelFromXP(loserUser.xp);

                    if (winnerNewLevel.level > winnerUser.level) {
                        await db.userOps.updateLevel(userId, winnerNewLevel.level);
                        socket.emit('level:up', {
                            newLevel: winnerNewLevel.level,
                            xpGained: winnerXP
                        });
                    }

                    if (loserNewLevel.level > loserUser.level) {
                        await db.userOps.updateLevel(loserId, loserNewLevel.level);
                        const loserSocket = userSockets.get(loserId);
                        if (loserSocket) {
                            loserSocket.emit('level:up', {
                                newLevel: loserNewLevel.level,
                                xpGained: loserXP
                            });
                        }
                    }

                    // Check for achievements
                    const winnerAchievements = await checkAchievements(db, userId, game, userId);
                    const loserAchievements = await checkAchievements(db, loserId, game, userId);

                    if (winnerAchievements.length > 0) {
                        socket.emit('achievements:unlocked', { achievements: winnerAchievements });
                    }

                    if (loserAchievements.length > 0) {
                        const loserSocket = userSockets.get(loserId);
                        if (loserSocket) {
                            loserSocket.emit('achievements:unlocked', { achievements: loserAchievements });
                        }
                    }

                    // Check for dignifiables
                    const { checkDignifiables } = require('./lib/dignifiables');
                    const guesses = await db.guessOps.getAll(gameId); // Changed from findByGame to getAll to match existing pattern
                    const dignifiables = await checkDignifiables(db, game, userId, guesses);

                    // Emit dignifiables to winner
                    if (dignifiables.length > 0) {
                        socket.emit('dignifiables:unlocked', { dignifiables });
                    }

                    // Update player stats for both players
                    const isTournament = !!tournamentMatch;
                    const gameDuration = Math.floor((Date.now() - new Date(game.created_at)) / 1000);

                    // Update winner stats
                    await db.analyticsOps.updatePlayerStats(userId, {
                        isAI: game.is_ai,
                        isTournament,
                        isWinner: true,
                        guessCount: guesses.filter(g => g.player_id === userId).length,
                        duration: gameDuration
                    });

                    // Update loser stats
                    await db.analyticsOps.updatePlayerStats(loserId, {
                        isAI: game.is_ai,
                        isTournament,
                        isWinner: false,
                        guessCount: guesses.filter(g => g.player_id === loserId).length,
                        duration: gameDuration
                    });

                    const finishedGame = await db.gameOps.findById(gameId);
                    // const guesses = await db.guessOps.getAll(gameId); // This line was moved up for dignifiables

                    // Calculate game duration
                    const duration = finishedGame.created_at && finishedGame.updated_at
                        ? Math.floor((new Date(finishedGame.updated_at) - new Date(finishedGame.created_at)) / 1000)
                        : 0;

                    const minutes = Math.floor(duration / 60);
                    const seconds = duration % 60;
                    const durationStr = `${minutes}m ${seconds}s`;

                    // Get opponent info
                    const opponentId = userId === finishedGame.player1_id ? finishedGame.player2_id : finishedGame.player1_id;
                    const opponent = await db.userOps.findById(opponentId);

                    const gameOverData = {
                        winnerId: userId,
                        guesses: guesses,
                        player1Secret: game.player1_secret,
                        player2Secret: game.player2_secret,
                        ...result, // include last guess result
                        xpEarned: winnerXP,
                        dignifiables: dignifiables,
                        duration: durationStr,
                        opponent: {
                            id: opponent.id,
                            username: opponent.username
                        }
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

                    // Get all guesses and mark them for each player
                    const allGuessesForGame = await db.guessOps.getAll(gameId);

                    const p1GuessesWithFlags = allGuessesForGame.map(g => ({
                        ...g,
                        isMine: g.player_id === game.player1_id
                    }));

                    const p2GuessesWithFlags = allGuessesForGame.map(g => ({
                        ...g,
                        isMine: g.player_id === game.player2_id
                    }));

                    if (p1Socket) p1Socket.emit('game:guess_result', {
                        ...formatGameState(updatedGame, game.player1_id),
                        lastGuess: guessData,
                        guesses: p1GuessesWithFlags
                    });
                    if (p2Socket) p2Socket.emit('game:guess_result', {
                        ...formatGameState(updatedGame, game.player2_id),
                        lastGuess: guessData,
                        guesses: p2GuessesWithFlags
                    });

                    // Handle AI turn if this is an AI game
                    console.log('Checking AI turn:', {
                        is_ai: game.is_ai,
                        is_practice: game.is_practice,
                        nextTurn: nextTurn,
                        userId: userId
                    });

                    if (game.is_ai && !game.is_practice) {
                        // First check if player just won
                        if (gameLogic.isWinningGuess(result.dead)) {
                            console.log('🎉 Player won against AI!');
                            // Player won - game already ended in PvP logic above
                            // Just need to trigger AI-specific completion
                            return;
                        }

                        console.log('🤖 Triggering AI turn...');
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
                                    // AI won the game
                                    await db.gameOps.end('ai', gameId);
                                    await db.userOps.updateStats(0, 1, userId);
                                    await db.userOps.updateStreak(userId, false);

                                    // Award XP for loss
                                    const { calculateXP, getLevelFromXP } = require('./lib/progression');
                                    const xpGained = calculateXP(false, game.ai_difficulty);
                                    await db.userOps.addXP(userId, xpGained);

                                    // Check for level up
                                    const user = await db.userOps.findById(userId);
                                    const levelData = getLevelFromXP(user.xp);

                                    if (levelData.level > user.level) {
                                        await db.userOps.updateLevel(userId, levelData.level);
                                        socket.emit('level:up', {
                                            newLevel: levelData.level,
                                            xpGained
                                        });
                                    }

                                    const finishedGame = await db.gameOps.findById(gameId);
                                    const allGuesses = await db.guessOps.getAll(gameId);

                                    // Calculate duration
                                    const gameDuration = Math.floor((Date.now() - new Date(game.created_at)) / 1000);
                                    const minutes = Math.floor(gameDuration / 60);
                                    const seconds = gameDuration % 60;
                                    const durationStr = `${minutes}m ${seconds}s`;

                                    // Update player stats
                                    await db.analyticsOps.updatePlayerStats(userId, {
                                        isAI: true,
                                        isTournament: false,
                                        isWinner: false,
                                        guessCount: allGuesses.filter(g => g.player_id === userId).length,
                                        duration: gameDuration
                                    });

                                    socket.emit('game:over', {
                                        ...formatGameState(finishedGame, userId),
                                        winnerId: 'ai',
                                        winnerUsername: `AI (${game.ai_difficulty})`,
                                        guesses: allGuesses,
                                        player1Secret: game.player1_secret,
                                        player2Secret: game.player2_secret,
                                        xpEarned,
                                        duration: durationStr,
                                        opponent: {
                                            id: 'ai',
                                            username: `AI (${game.ai_difficulty.charAt(0).toUpperCase() + game.ai_difficulty.slice(1)})`
                                        }
                                    });
                                } else {
                                    await db.gameOps.switchTurn(userId, gameId);
                                    const gameAfterAI = await db.gameOps.findById(gameId);
                                    const allGuessesAI = await db.guessOps.getAll(gameId);

                                    // Mark guesses as mine or opponent's
                                    const guessesWithFlags = allGuessesAI.map(g => ({
                                        ...g,
                                        isMine: g.player_id === userId
                                    }));

                                    socket.emit('game:ai_thinking', { thinking: false });
                                    socket.emit('game:guess_result', {
                                        ...formatGameState(gameAfterAI, userId),
                                        lastGuess: { playerId: null, playerUsername: `AI (${game.ai_difficulty})`, guess: aiGuess, ...aiResult },
                                        guesses: guessesWithFlags
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
