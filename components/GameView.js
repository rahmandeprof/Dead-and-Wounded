import { useState, useRef, useEffect } from 'react';

export default function GameView({ game, socket, onLeave, onPlayAgain }) {
    const [inputs, setInputs] = useState(['', '', '', '']);
    const [error, setError] = useState('');
    const [showSecret, setShowSecret] = useState(false);
    const inputRefs = [useRef(), useRef(), useRef(), useRef()];

    // Reset inputs when phase changes
    useEffect(() => {
        if (game.status === 'setup' && !game.hasSetSecret) {
            setInputs(['', '', '', '']);
            inputRefs[0].current?.focus();
        } else if (game.status === 'playing' && game.isYourTurn) {
            setInputs(['', '', '', '']);
            inputRefs[0].current?.focus();
        }
    }, [game.status, game.isYourTurn, game.hasSetSecret]);

    const handleInputChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;

        const newInputs = [...inputs];
        newInputs[index] = value.slice(-1); // Only last char
        setInputs(newInputs);

        // Auto advance to next input if value entered
        if (value && index < 3) {
            setTimeout(() => {
                inputRefs[index + 1].current?.focus();
            }, 0);
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !inputs[index] && index > 0) {
            setTimeout(() => {
                inputRefs[index - 1].current?.focus();
            }, 0);
        }
        if (e.key === 'Enter' && inputs.every(val => val !== '')) {
            handleSubmit();
        }
    };

    const handleSubmit = () => {
        const value = inputs.join('');
        if (value.length !== 4) {
            setError('Must be 4 digits');
            return;
        }

        if (new Set(value).size !== 4) {
            setError('Digits must be unique');
            return;
        }

        setError('');

        if (game.status === 'setup') {
            socket.emit('game:secret', { gameId: game.gameId, secret: value });
        } else if (game.status === 'playing') {
            socket.emit('game:guess', { gameId: game.gameId, guess: value });
        }
    };

    const renderDigitInput = (disabled = false, type = 'text') => (
        <div className="flex justify-center gap-3 mb-4">
            {inputs.map((val, i) => (
                <input
                    key={i}
                    ref={inputRefs[i]}
                    type={type}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={val}
                    onChange={(e) => handleInputChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={disabled}
                    className="w-14 h-16 text-3xl font-bold text-center bg-slate-800 border-2 border-slate-700 rounded-lg focus:border-orange-500 focus:outline-none focus:ring-4 focus:ring-orange-500/20 disabled:opacity-50 transition-all text-white"
                />
            ))}
        </div>
    );

    // --- SUB-VIEWS ---

    const SetupPhase = () => (
        <div className="text-center max-w-md mx-auto">
            <h2 className="text-2xl font-bold mb-2">Set Your Secret</h2>
            <p className="text-slate-400 mb-8">Choose 4 unique digits. Opponent won't see this.</p>

            {game.hasSetSecret ? (
                <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 flex flex-col items-center">
                    <div className="text-4xl mb-4">🔒</div>
                    <p className="text-lg font-medium text-slate-300">Secret Locked!</p>
                    <p className="text-slate-500 mt-2 flex items-center gap-2">
                        <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                        Waiting for opponent...
                    </p>
                </div>
            ) : (
                <div className="bg-slate-800 p-8 rounded-xl border border-slate-700">
                    {renderDigitInput(false, showSecret ? 'text' : 'password')}

                    <div className="flex justify-center gap-6 mt-6">
                        <label className="flex items-center gap-2 text-slate-400 cursor-pointer hover:text-white transition-colors">
                            <input
                                type="checkbox"
                                checked={showSecret}
                                onChange={(e) => setShowSecret(e.target.checked)}
                                className="rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500"
                            />
                            <span>Show secret</span>
                        </label>
                    </div>

                    {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}

                    <button
                        onClick={handleSubmit}
                        className="w-full mt-6 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        Lock In Secret
                    </button>
                </div>
            )}
        </div>
    );

    const PlayingPhase = () => (
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT: Game Board */}
            <div className="lg:col-span-7 space-y-6">
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
                    <div className={`p-4 rounded-lg text-center mb-6 transition-colors ${game.isYourTurn
                        ? 'bg-gradient-to-r from-orange-900/40 to-amber-900/40 border border-orange-500/30'
                        : 'bg-slate-900 border border-slate-700'
                        }`}>
                        <h3 className={`text-xl font-bold ${game.isYourTurn ? 'text-orange-400' : 'text-slate-500'}`}>
                            {game.isYourTurn ? "Your Turn" : "Opponent's Turn"}
                        </h3>
                    </div>

                    <div className="mb-2">
                        {renderDigitInput(!game.isYourTurn)}
                    </div>

                    {error && <p className="text-center text-red-400 mb-4 text-sm">{error}</p>}

                    <button
                        onClick={handleSubmit}
                        disabled={!game.isYourTurn}
                        className="w-full bg-slate-700 text-white font-bold py-3 rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-600"
                    >
                        Submit Guess
                    </button>
                </div>

                {/* Your Secret (Helper) */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Your Secret:</span>
                    <div className="flex gap-2 font-mono text-xl font-bold text-slate-300">
                        {showSecret ? game.yourSecret : '••••'}
                    </div>
                    <button
                        onClick={() => setShowSecret(!showSecret)}
                        className="text-xs text-orange-400 hover:text-orange-300 underline"
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
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {(!game.guesses || game.guesses.length === 0) && (
                        <div className="text-center text-slate-500 py-8 italic">No guesses yet</div>
                    )}
                    {game.guesses?.map((g, i) => {
                        const isMe = g.player_username === game.opponent?.username ? false : true; // Assuming we know current user? Actually username is in g.player_username
                        // Better way: Check if g.id belongs to current user or just rely on turn flow?
                        // Actually, `guesses` in game object might need to distinguish players.
                        // Let's assume passed `game.guesses` contains all guesses or we filter.
                        return (
                            <div key={i} className={`flex justify-between items-center p-3 rounded-lg ${g.isMine ? 'bg-slate-700/50 border border-slate-600' : 'bg-slate-900/30'
                                }`}>
                                <span className="font-mono text-lg font-bold tracking-widest text-slate-200">{g.guess}</span>
                                <div className="flex gap-4 text-sm font-bold">
                                    <div className="flex items-center gap-1">
                                        <span className="text-dead">💀 {g.dead}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-wounded">🩹 {g.wounded}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    const GameOverPhase = () => {
        const isWinner = game.winnerId === game.myId; // We need current user ID in game object or passed prop

        return (
            <div className="text-center max-w-lg mx-auto">
                <div className={`p-8 rounded-2xl border-2 mb-8 ${isWinner ? 'bg-orange-900/20 border-orange-500/50' : 'bg-slate-800 border-slate-700'}`}>
                    <div className="text-6xl mb-4">{isWinner ? '🏆' : '💀'}</div>
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
                        className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg shadow-lg transition-colors"
                    >
                        Play Again
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-8">
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

            {game.status === 'setup' && <SetupPhase />}
            {game.status === 'playing' && <PlayingPhase />}
            {game.status === 'finished' && <GameOverPhase />}
        </div>
    );
}
