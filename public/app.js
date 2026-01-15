/**
 * Dead & Wounded - Frontend Application
 * Handles UI state, Socket.IO communication, and game flow
 */

// ============ State ============
const state = {
    user: null,
    socket: null,
    currentGame: null,
    currentView: 'auth' // auth, lobby, game
};

// ============ DOM Elements ============
const views = {
    auth: document.getElementById('auth-view'),
    lobby: document.getElementById('lobby-view'),
    game: document.getElementById('game-view')
};

const authElements = {
    tabs: document.querySelectorAll('.tab-btn'),
    loginForm: document.getElementById('login-form'),
    registerForm: document.getElementById('register-form'),
    loginUsername: document.getElementById('login-username'),
    loginPassword: document.getElementById('login-password'),
    loginError: document.getElementById('login-error'),
    registerUsername: document.getElementById('register-username'),
    registerPassword: document.getElementById('register-password'),
    registerError: document.getElementById('register-error')
};

const lobbyElements = {
    usernameDisplay: document.getElementById('username-display'),
    userStats: document.getElementById('user-stats'),
    logoutBtn: document.getElementById('logout-btn'),
    findGameBtn: document.getElementById('find-game-btn'),
    cancelSearchBtn: document.getElementById('cancel-search-btn'),
    lobbyStatus: document.getElementById('lobby-status')
};

const gameElements = {
    opponentName: document.getElementById('opponent-name'),
    leaveGameBtn: document.getElementById('leave-game-btn'),
    setupPhase: document.getElementById('setup-phase'),
    playingPhase: document.getElementById('playing-phase'),
    gameoverPhase: document.getElementById('gameover-phase'),
    secretInputs: [
        document.getElementById('secret-input-1'),
        document.getElementById('secret-input-2'),
        document.getElementById('secret-input-3'),
        document.getElementById('secret-input-4')
    ],
    showSecretToggle: document.getElementById('show-secret-toggle'),
    secretError: document.getElementById('secret-error'),
    submitSecretBtn: document.getElementById('submit-secret-btn'),
    waitingForOpponent: document.getElementById('waiting-for-opponent'),
    turnIndicator: document.getElementById('turn-indicator'),
    guessInputs: [
        document.getElementById('guess-input-1'),
        document.getElementById('guess-input-2'),
        document.getElementById('guess-input-3'),
        document.getElementById('guess-input-4')
    ],
    guessError: document.getElementById('guess-error'),
    submitGuessBtn: document.getElementById('submit-guess-btn'),
    guessHistory: document.getElementById('guess-history'),
    yourSecretNumber: document.getElementById('your-secret-number'),
    revealSecretBtn: document.getElementById('reveal-secret-btn'),
    gameoverResult: document.getElementById('gameover-result'),
    finalYourSecret: document.getElementById('final-your-secret'),
    finalOpponentSecret: document.getElementById('final-opponent-secret'),
    totalGuesses: document.getElementById('total-guesses'),
    playAgainBtn: document.getElementById('play-again-btn')
};

// ============ Initialization ============
async function init() {
    // Check if already logged in
    try {
        const res = await fetch('/api/me');
        if (res.ok) {
            const data = await res.json();
            state.user = data.user;
            initSocket();
            showView('lobby');
        }
    } catch (e) {
        console.log('Not logged in');
    }

    setupEventListeners();
}

function setupEventListeners() {
    // Auth tabs
    authElements.tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            authElements.tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const tabName = tab.dataset.tab;
            authElements.loginForm.classList.toggle('active', tabName === 'login');
            authElements.registerForm.classList.toggle('active', tabName === 'register');
        });
    });

    // Login form
    authElements.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authElements.loginError.textContent = '';

        const username = authElements.loginUsername.value.trim();
        const password = authElements.loginPassword.value;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok) {
                state.user = data.user;
                initSocket();
                showView('lobby');
            } else {
                authElements.loginError.textContent = data.error || 'Login failed';
            }
        } catch (error) {
            authElements.loginError.textContent = 'Connection error';
        }
    });

    // Register form
    authElements.registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        authElements.registerError.textContent = '';

        const username = authElements.registerUsername.value.trim();
        const password = authElements.registerPassword.value;

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok) {
                state.user = data.user;
                initSocket();
                showView('lobby');
            } else {
                authElements.registerError.textContent = data.error || 'Registration failed';
            }
        } catch (error) {
            authElements.registerError.textContent = 'Connection error';
        }
    });

    // Logout
    lobbyElements.logoutBtn.addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        state.user = null;
        state.socket?.disconnect();
        state.socket = null;
        showView('auth');
    });

    // Find game
    lobbyElements.findGameBtn.addEventListener('click', () => {
        state.socket.emit('game:find');
        lobbyElements.findGameBtn.classList.add('hidden');
        lobbyElements.cancelSearchBtn.classList.remove('hidden');
        lobbyElements.lobbyStatus.innerHTML = '<div class="spinner"></div><p>Searching for opponent...</p>';
        lobbyElements.lobbyStatus.classList.add('searching');
    });

    // Cancel search
    lobbyElements.cancelSearchBtn.addEventListener('click', () => {
        if (state.currentGame) {
            state.socket.emit('game:leave', { gameId: state.currentGame.gameId });
        }
        resetLobby();
    });

    // Secret number inputs - auto advance
    gameElements.secretInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const val = e.target.value;
            if (!/^\d$/.test(val)) {
                e.target.value = '';
                return;
            }
            if (index < 3) {
                gameElements.secretInputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                gameElements.secretInputs[index - 1].focus();
            }
        });
    });

    // Show/hide secret toggle
    gameElements.showSecretToggle.addEventListener('change', (e) => {
        const type = e.target.checked ? 'text' : 'password';
        gameElements.secretInputs.forEach(input => input.type = type);
    });

    // Submit secret
    gameElements.submitSecretBtn.addEventListener('click', () => {
        const secret = gameElements.secretInputs.map(i => i.value).join('');
        const validation = validateNumber(secret);

        if (!validation.valid) {
            gameElements.secretError.textContent = validation.error;
            return;
        }

        gameElements.secretError.textContent = '';
        state.socket.emit('game:secret', {
            gameId: state.currentGame.gameId,
            secret
        });
    });

    // Guess inputs - auto advance
    gameElements.guessInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const val = e.target.value;
            if (!/^\d$/.test(val)) {
                e.target.value = '';
                return;
            }
            if (index < 3) {
                gameElements.guessInputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                gameElements.guessInputs[index - 1].focus();
            }
            if (e.key === 'Enter' && gameElements.guessInputs.every(i => i.value)) {
                gameElements.submitGuessBtn.click();
            }
        });
    });

    // Submit guess
    gameElements.submitGuessBtn.addEventListener('click', () => {
        if (!state.currentGame?.isYourTurn) {
            gameElements.guessError.textContent = 'Wait for your turn!';
            return;
        }

        const guess = gameElements.guessInputs.map(i => i.value).join('');
        const validation = validateNumber(guess);

        if (!validation.valid) {
            gameElements.guessError.textContent = validation.error;
            return;
        }

        gameElements.guessError.textContent = '';
        state.socket.emit('game:guess', {
            gameId: state.currentGame.gameId,
            guess
        });

        // Clear inputs
        gameElements.guessInputs.forEach(i => i.value = '');
        gameElements.guessInputs[0].focus();
    });

    // Reveal secret button
    let secretRevealed = false;
    gameElements.revealSecretBtn.addEventListener('click', () => {
        secretRevealed = !secretRevealed;
        gameElements.yourSecretNumber.textContent = secretRevealed
            ? state.currentGame.yourSecret
            : '****';
        gameElements.revealSecretBtn.textContent = secretRevealed ? 'Hide' : 'Show';
    });

    // Leave game
    gameElements.leaveGameBtn.addEventListener('click', () => {
        if (confirm('Are you sure? Leaving will count as a loss.')) {
            state.socket.emit('game:leave', { gameId: state.currentGame.gameId });
            state.currentGame = null;
            showView('lobby');
            resetLobby();
        }
    });

    // Play again
    gameElements.playAgainBtn.addEventListener('click', () => {
        state.currentGame = null;
        showView('lobby');
        resetLobby();
    });
}

// ============ Socket.IO ============
function initSocket() {
    state.socket = io();

    state.socket.on('error', (data) => {
        console.error('Socket error:', data.message);
        alert(data.message);
    });

    state.socket.on('game:error', (data) => {
        console.error('Game error:', data.message);
        if (state.currentView === 'game') {
            if (document.querySelector('#setup-phase:not(.hidden)')) {
                gameElements.secretError.textContent = data.message;
            } else {
                gameElements.guessError.textContent = data.message;
            }
        }
    });

    state.socket.on('game:waiting', (data) => {
        state.currentGame = { gameId: data.gameId, status: 'waiting' };
        lobbyElements.lobbyStatus.innerHTML = '<div class="spinner"></div><p>Waiting for an opponent to join...</p>';
    });

    state.socket.on('game:found', (data) => {
        state.currentGame = data;
        showView('game');
        showGamePhase('setup');
        updateGameUI();
    });

    state.socket.on('game:opponent_joined', (data) => {
        state.currentGame = data;
        showView('game');
        showGamePhase('setup');
        updateGameUI();
    });

    state.socket.on('game:rejoin', (data) => {
        state.currentGame = data;
        if (data.status === 'waiting') {
            lobbyElements.findGameBtn.classList.add('hidden');
            lobbyElements.cancelSearchBtn.classList.remove('hidden');
            lobbyElements.lobbyStatus.innerHTML = '<div class="spinner"></div><p>Waiting for an opponent...</p>';
            lobbyElements.lobbyStatus.classList.add('searching');
        } else {
            showView('game');
            if (data.status === 'setup') {
                showGamePhase('setup');
            } else if (data.status === 'playing') {
                showGamePhase('playing');
            }
            updateGameUI();
        }
    });

    state.socket.on('game:secret_set', (data) => {
        state.currentGame.hasSetSecret = true;
        gameElements.submitSecretBtn.disabled = true;
        gameElements.secretInputs.forEach(i => i.disabled = true);
        gameElements.waitingForOpponent.classList.remove('hidden');
    });

    state.socket.on('game:started', (data) => {
        state.currentGame = { ...state.currentGame, ...data };
        showGamePhase('playing');
        updateGameUI();
        updateTurnIndicator();

        // Reset guess history
        gameElements.guessHistory.innerHTML = '<p class="no-guesses">No guesses yet. Make your first move!</p>';

        // Set secret display
        gameElements.yourSecretNumber.textContent = '****';
    });

    state.socket.on('game:guess_result', (data) => {
        state.currentGame = { ...state.currentGame, ...data };
        updateTurnIndicator();

        // Update history
        if (data.guesses && data.guesses.length > 0) {
            renderGuessHistory(data.guesses);
        }

        // Add latest guess to history if it was ours
        if (data.lastGuess && data.lastGuess.playerId === state.user.id) {
            addGuessToHistory(data.lastGuess);
        }
    });

    state.socket.on('game:over', (data) => {
        state.currentGame = { ...state.currentGame, ...data };
        showGamePhase('gameover');

        const isWinner = data.winnerId === state.user.id;
        gameElements.gameoverResult.className = 'gameover-result ' + (isWinner ? 'win' : 'lose');
        gameElements.gameoverResult.querySelector('.result-icon').textContent = isWinner ? '🏆' : '😢';
        gameElements.gameoverResult.querySelector('.result-text').textContent = isWinner ? 'You Win!' : 'You Lose';

        gameElements.finalYourSecret.textContent = data.player1Secret === state.currentGame.yourSecret
            ? data.player1Secret
            : data.player2Secret;
        gameElements.finalOpponentSecret.textContent = data.player1Secret === state.currentGame.yourSecret
            ? data.player2Secret
            : data.player1Secret;

        const myGuesses = data.guesses?.filter(g => g.player_id === state.user.id) || [];
        gameElements.totalGuesses.textContent = `Total Guesses: ${myGuesses.length}`;
    });

    state.socket.on('game:opponent_left', (data) => {
        alert(data.message);
        state.currentGame = null;
        showView('lobby');
        resetLobby();
    });

    state.socket.on('game:left', () => {
        state.currentGame = null;
        resetLobby();
    });
}

// ============ UI Helpers ============
function showView(viewName) {
    state.currentView = viewName;
    Object.keys(views).forEach(key => {
        views[key].classList.toggle('active', key === viewName);
    });

    if (viewName === 'lobby') {
        updateLobbyUI();
    }
}

function updateLobbyUI() {
    if (state.user) {
        lobbyElements.usernameDisplay.textContent = state.user.username;
        lobbyElements.userStats.textContent = `W: ${state.user.wins || 0} / L: ${state.user.losses || 0}`;
    }
}

function resetLobby() {
    lobbyElements.findGameBtn.classList.remove('hidden');
    lobbyElements.cancelSearchBtn.classList.add('hidden');
    lobbyElements.lobbyStatus.innerHTML = '<p>Click below to find an opponent</p>';
    lobbyElements.lobbyStatus.classList.remove('searching');
}

function showGamePhase(phase) {
    gameElements.setupPhase.classList.toggle('hidden', phase !== 'setup');
    gameElements.playingPhase.classList.toggle('hidden', phase !== 'playing');
    gameElements.gameoverPhase.classList.toggle('hidden', phase !== 'gameover');

    if (phase === 'setup') {
        // Reset setup UI
        gameElements.secretInputs.forEach(i => {
            i.value = '';
            i.disabled = false;
        });
        gameElements.showSecretToggle.checked = false;
        gameElements.secretInputs.forEach(input => input.type = 'password');
        gameElements.submitSecretBtn.disabled = false;
        gameElements.secretError.textContent = '';
        gameElements.waitingForOpponent.classList.add('hidden');
        gameElements.secretInputs[0].focus();
    } else if (phase === 'playing') {
        gameElements.guessInputs.forEach(i => i.value = '');
        gameElements.guessError.textContent = '';
        gameElements.guessInputs[0].focus();
    }
}

function updateGameUI() {
    if (state.currentGame?.opponent) {
        gameElements.opponentName.textContent = `vs ${state.currentGame.opponent.username}`;
    }

    if (state.currentGame?.hasSetSecret) {
        gameElements.submitSecretBtn.disabled = true;
        gameElements.secretInputs.forEach(i => i.disabled = true);
        if (!state.currentGame.opponentHasSetSecret) {
            gameElements.waitingForOpponent.classList.remove('hidden');
        }
    }
}

function updateTurnIndicator() {
    const isYourTurn = state.currentGame?.isYourTurn;
    gameElements.turnIndicator.className = 'turn-indicator ' + (isYourTurn ? 'your-turn' : 'opponent-turn');
    gameElements.turnIndicator.querySelector('.turn-text').textContent = isYourTurn ? 'Your Turn' : "Opponent's Turn";

    gameElements.submitGuessBtn.disabled = !isYourTurn;
    gameElements.guessInputs.forEach(i => i.disabled = !isYourTurn);

    if (isYourTurn) {
        gameElements.guessInputs[0].focus();
    }
}

function renderGuessHistory(guesses) {
    if (!guesses || guesses.length === 0) {
        gameElements.guessHistory.innerHTML = '<p class="no-guesses">No guesses yet. Make your first move!</p>';
        return;
    }

    gameElements.guessHistory.innerHTML = guesses.map(g => `
    <div class="guess-entry">
      <span class="guess-number">${g.guess}</span>
      <div class="guess-result">
        <span class="dead-count">💀 ${g.dead}</span>
        <span class="wounded-count">🩹 ${g.wounded}</span>
      </div>
    </div>
  `).join('');
}

function addGuessToHistory(guess) {
    const noGuesses = gameElements.guessHistory.querySelector('.no-guesses');
    if (noGuesses) {
        noGuesses.remove();
    }

    const entry = document.createElement('div');
    entry.className = 'guess-entry';
    entry.innerHTML = `
    <span class="guess-number">${guess.guess}</span>
    <div class="guess-result">
      <span class="dead-count">💀 ${guess.dead}</span>
      <span class="wounded-count">🩹 ${guess.wounded}</span>
    </div>
  `;
    gameElements.guessHistory.prepend(entry);
}

// ============ Validation ============
function validateNumber(number) {
    if (typeof number !== 'string' || number.length !== 4) {
        return { valid: false, error: 'Must be exactly 4 digits' };
    }

    if (!/^[0-9]{4}$/.test(number)) {
        return { valid: false, error: 'Must contain only digits 0-9' };
    }

    const digits = new Set(number.split(''));
    if (digits.size !== 4) {
        return { valid: false, error: 'Digits must be unique (no repetition)' };
    }

    return { valid: true };
}

// ============ Start ============
document.addEventListener('DOMContentLoaded', init);
