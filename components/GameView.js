import { useState, useRef, useEffect } from 'react';
import GameTimer from './GameTimer';
import NumericKeypad from './NumericKeypad';

export default function GameView({ game, socket, onLeave, onPlayAgain }) {
    // Single buffer state for current guess/secret (max 4 chars)
    const [currentGuess, setCurrentGuess] = useState('');
    const [error, setError] = useState('');
    const [showSecret, setShowSecret] = useState(false);

    // Reset inputs when phase changes
    useEffect(() => {
        if (game.status === 'setup' && !game.hasSetSecret) {
            setCurrentGuess('');
            setError('');
        } else if (game.status === 'playing' && game.isYourTurn) {
            setCurrentGuess('');
            setError('');
        }
    }, [game.status, game.isYourTurn, game.hasSetSecret]);

    // Handle Virtual Keypad Input
    const handleNumberInput = (num) => {
        if (currentGuess.length < 4) {
            setCurrentGuess(prev => prev + num);
            setError('');
        }
    };

    const handleDelete = () => {
        setCurrentGuess(prev => prev.slice(0, -1));
        setError('');
    };

    // Handle Physical Keyboard Input
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if input is focused (e.g. chat if added later)
            if (e.target.tagName === 'INPUT') return;

            if (/^[0-9]$/.test(e.key)) {
                handleNumberInput(e.key);
            } else if (e.key === 'Backspace') {
                handleDelete();
            } else if (e.key === 'Enter') {
                handleSubmit();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentGuess, game.status, game.isYourTurn]);

    const handleSubmit = () => {
        if (currentGuess.length !== 4) {
            setError('Must be 4 digits');
            return;
        }

        if (new Set(currentGuess).size !== 4) {
            setError('Digits must be unique');
            return;
        }

        setError('');

        if (game.status === 'setup') {
            socket.emit('game:secret', { gameId: game.gameId, secret: currentGuess });
        } else if (game.status === 'playing') {
            socket.emit('game:guess', { gameId: game.gameId, guess: currentGuess });
        }
    };

    const renderDigitDisplay = (value, masked = false) => (
        <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map((i) => (
                <div
                    key={i}
                    className={`w-14 h-16 flex items-center justify-center text-3xl font-bold bg-slate-800 border-2 rounded-lg transition-all
                        ${i === value.length ? 'border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]' : 'border-slate-700'}
                        ${value[i] ? 'text-white' : 'text-slate-600'}
                    `}
                >
                    {value[i] ? (masked ? '•' : value[i]) : ''}
                </div>
            ))}
        </div>
    );

    // --- SUB-VIEWS ---

    const SetupPhase = () => (
        <div className="text-center max-w-md mx-auto flex flex-col h-full">
            <h2 className="text-2xl font-bold mb-2">Set Your Secret</h2>
            <p className="text-slate-400 mb-4">Choose 4 unique digits.</p>

            {game.hasSetSecret ? (
                <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 flex flex-col items-center animate-fade-in">
                    <div className="text-6xl mb-4">🔒</div>
                    <p className="text-lg font-medium text-slate-300">Secret Locked!</p>
                    <p className="text-slate-500 mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                        Waiting for opponent...
                    </p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col justify-between">
                    <div>
                        {renderDigitDisplay(currentGuess, !showSecret)}

                        <div className="flex justify-center mb-4">
                            <button
                                onClick={() => setShowSecret(!showSecret)}
                                className="text-sm text-slate-400 hover:text-white flex items-center gap-2 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                            >
                                {showSecret ? '🙈 Hide' : '👁️ Show'} Secret
                            </button>
                        </div>

                        {error && <p className="text-red-400 mb-2 h-6 animate-pulse">{error}</p>}
                    </div>

                    <div className="mt-auto">
                        <NumericKeypad
                            onNumber={handleNumberInput}
                            onDelete={handleDelete}
                            onEnter={handleSubmit}
                        />
                    </div>
                </div>
            )}
        </div>
    );

    const PlayingPhase = () => (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
            {/* LEFT: Game Controls (Mobile: Top/Center) */}
            <div className="lg:col-span-7 flex flex-col h-full">
                {/* Game Timer */}
                {game.timeControl && (
                    <div className="mb-4">
                        <GameTimer
                            player1Time={game.player1Time}
                            player2Time={game.player2Time}
                            isPlayer1Turn={game.isPlayer1 ? game.isYourTurn : !game.isYourTurn}
                            isMyTurn={game.isYourTurn}
                            gameStatus={game.status}
                            player1Name={game.isPlayer1 ? 'You' : game.opponent?.username}
                            player2Name={game.isPlayer1 ? game.opponent?.username : 'You'}
                        />
                    </div>
                )}

                {/* Main Interaction Area */}
                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700 shadow-xl flex-1 flex flex-col min-h-[400px]">
                    <div className={`p-3 rounded-lg text-center mb-6 transition-colors ${game.isYourTurn
                        ? 'bg-gradient-to-r from-orange-900/40 to-amber-900/40 border border-orange-500/30'
                        : 'bg-slate-800 border border-slate-700'
                        }`}>
                        <h3 className={`text-xl font-bold ${game.isYourTurn ? 'text-orange-400' : 'text-slate-500'}`}>
                            {game.isYourTurn ? "Your Turn" : "Opponent's Turn"}
                        </h3>
                    </div>

                    {/* Digit Display */}
                    <div className="flex-1 flex flex-col justify-center">
                        {renderDigitDisplay(currentGuess)}
                        {error && <p className="text-center text-red-400 h-6 mb-2">{error}</p>}
                    </div>

                    {/* Keypad (Only visible/active on your turn, but can serve as display/disabled placeholder) */}
                    <div className={!game.isYourTurn ? 'opacity-50 pointer-events-none grayscale' : ''}>
                        <NumericKeypad
                            onNumber={handleNumberInput}
                            onDelete={handleDelete}
                            onEnter={handleSubmit}
                            disabled={!game.isYourTurn}
                        />
                    </div>
                </div>

                {/* Your Secret (Compact Footer) */}
                <div className="mt-4 bg-slate-800/80 p-3 rounded-lg border border-slate-700 flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Your Secret:</span>
                    <div className="flex gap-2 font-mono text-xl font-bold text-slate-300">
                        {showSecret ? game.yourSecret : '••••'}
                    </div>
                    <button
                        onClick={() => setShowSecret(!showSecret)}
                        className="text-xs text-orange-400 hover:text-orange-300 px-2 py-1 rounded hover:bg-slate-700"
                    >
                        {showSecret ? 'Hide' : 'Show'}
                    </button>
                </div>
            </div>

            {/* RIGHT: History */}
            <div className="lg:col-span-5 bg-slate-800 rounded-xl border border-slate-700 flex flex-col h-[500px] shadow-xl">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50 rounded-t-xl">
                    <h3 className="font-bold text-slate-300">Guess History</h3>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {(!game.guesses || game.guesses.length === 0) && (
                        <div className="text-center text-slate-500 py-8 italic">No guesses yet</div>
                    )}
                    {game.guesses && game.guesses.length > 0 && (
                        <div className="space-y-3">
                            {/* Combined chronological history generally better for mobile reading flow 
                                OR Keep split but cleanup styles. Keeping split for data density.
                            */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* My Guesses */}
                                <div>
                                    <h4 className="text-xs font-bold text-green-400 mb-2 uppercase tracking-wider opacity-80">You</h4>
                                    <div className="space-y-2">
                                        {game.guesses.filter(g => g.isMine).map((g, i) => (
                                            <div key={i} className="bg-green-900/10 border border-green-700/30 p-2 rounded text-center">
                                                <div className="font-mono font-bold text-green-300">{g.guess}</div>
                                                <div className="flex justify-center gap-3 text-xs mt-1">
                                                    <span className="text-red-400 font-bold">{g.dead}D</span>
                                                    <span className="text-yellow-400 font-bold">{g.wounded}W</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* Opponent Guesses */}
                                <div>
                                    <h4 className="text-xs font-bold text-orange-400 mb-2 uppercase tracking-wider opacity-80">Opponent</h4>
                                    <div className="space-y-2">
                                        {game.guesses.filter(g => !g.isMine).map((g, i) => (
                                            <div key={i} className="bg-orange-900/10 border border-orange-700/30 p-2 rounded text-center">
                                                <div className="font-mono font-bold text-orange-300">{g.guess}</div>
                                                <div className="flex justify-center gap-3 text-xs mt-1">
                                                    <span className="text-red-400 font-bold">{g.dead}D</span>
                                                    <span className="text-yellow-400 font-bold">{g.wounded}W</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const GameOverPhase = () => {
        const isWinner = game.winnerId === game.myId;

        return (
            <div className="text-center max-w-lg mx-auto">
                <div className={`p-8 rounded-2xl border-2 mb-8 ${isWinner ? 'bg-orange-900/20 border-orange-500/50' : 'bg-slate-800 border-slate-700'}`}>
                    <div className="text-6xl mb-4 animate-bounce">{isWinner ? '🏆' : '💀'}</div>
                    <h2 className={`text-4xl font-bold mb-2 ${isWinner ? 'text-orange-400' : 'text-slate-400'}`}>
                        {isWinner ? 'Victory!' : 'Defeat'}
                    </h2>
                    <p className="text-slate-400">{isWinner ? 'You cracked the code.' : 'Better luck next time.'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Your Secret</div>
                        <div className="font-mono text-2xl font-bold tracking-widest text-slate-200">
                            {game.yourSecret}
                        </div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Their Secret</div>
                        <div className="font-mono text-2xl font-bold tracking-widest text-orange-400">
                            {game.player1Secret === game.yourSecret ? game.player2Secret : game.player1Secret}
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 justify-center">
                    <button
                        onClick={onLeave}
                        className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
                    >
                        Leave
                    </button>
                    <button
                        onClick={onPlayAgain}
                        className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg shadow-lg transition-colors hover:scale-105 active:scale-95"
                    >
                        Play Again
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full max-w-5xl mx-auto h-[calc(100vh-100px)] flex flex-col">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-2xl">⚔️</span>
                    <span className="font-bold text-white">vs {game.opponent?.username || 'Opponent'}</span>
                </div>
                {game.status !== 'finished' && (
                    <button
                        onClick={onLeave}
                        className="text-sm text-red-400 hover:text-red-300 underline"
                    >
                        Forfeit Game
                    </button>
                )}
            </div>

            <div className="flex-1 min-h-0">
                {game.status === 'setup' && <SetupPhase />}
                {game.status === 'playing' && <PlayingPhase />}
                {game.status === 'finished' && <GameOverPhase />}
            </div>
        </div>
    );
}
