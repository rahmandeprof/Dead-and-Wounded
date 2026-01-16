import { useState } from 'react';
import TimeControlSelector from './TimeControlSelector';

export default function LobbyView({ onCreatePrivate, onJoinPrivate, onViewHistory, onPlayAI, onPractice, onFindGame, isSearching, privateGameCode, onCancelSearch }) {
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [showTimeControlModal, setShowTimeControlModal] = useState(false);
    const [selectedTimeControl, setSelectedTimeControl] = useState(null);
    const [joinCode, setJoinCode] = useState('');
    const [joinError, setJoinError] = useState('');

    const handleJoinSubmit = () => {
        if (joinCode.length !== 6) {
            setJoinError('Code must be 6 characters');
            return;
        }
        setJoinError('');
        onJoinPrivate(joinCode);
        setShowJoinModal(false);
        setJoinCode('');
    };

    const copyGameCode = () => {
        navigator.clipboard.writeText(privateGameCode);
    };

    return (
        <div className="w-full max-w-2xl text-center space-y-8">
            <div className="bg-slate-800 p-8 md:p-12 rounded-2xl shadow-2xl border border-slate-700 relative overflow-hidden">
                {/* Decorational background elements */}
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>

                <h2 className="text-3xl font-bold mb-4 relative z-10">Ready for Battle?</h2>
                <p className="text-slate-400 mb-8 max-w-md mx-auto relative z-10">
                    Challenge opponents in a classic game of deduction. Guess their secret number before they guess yours.
                </p>

                <div className="relative z-10">
                    {isSearching || privateGameCode ? (
                        <div className="space-y-6">
                            <div className="flex flex-col items-center justify-center p-8 bg-slate-900/50 rounded-xl border border-orange-500/30">
                                {privateGameCode ? (
                                    <>
                                        <p className="text-lg font-medium text-slate-300 mb-4">Share this code with your friend:</p>
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="font-mono text-4xl font-bold tracking-widest text-orange-400 bg-slate-800 px-6 py-3 rounded-lg border-2 border-orange-500">
                                                {privateGameCode}
                                            </div>
                                            <button
                                                onClick={copyGameCode}
                                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                                title="Copy code"
                                            >
                                                📋 Copy
                                            </button>
                                        </div>
                                        <p className="text-slate-500 text-sm flex items-center gap-2">
                                            <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                                            Waiting for friend to join...
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                        <p className="text-lg font-medium text-orange-400">Searching for opponent...</p>
                                    </>
                                )}
                            </div>

                            <button
                                onClick={onCancelSearch}
                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors border border-slate-600"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <button
                                onClick={onFindGame}
                                className="w-full group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-orange-600 font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-600 shadow-lg hover:bg-orange-500 hover:scale-105 active:scale-95"
                            >
                                <span className="mr-3 text-2xl">🎯</span>
                                Quick Match
                            </button>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setShowTimeControlModal(true)}
                                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors border border-slate-600"
                                >
                                    🔒 Create Private
                                </button>
                                <button
                                    onClick={() => setShowJoinModal(true)}
                                    className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors border border-slate-600"
                                >
                                    🔑 Join Private
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={onPlayAI}
                                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-lg transition-all border border-purple-500"
                                >
                                    🤖 Play vs AI
                                </button>
                                <button
                                    onClick={onPractice}
                                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 text-white font-semibold rounded-lg transition-all border border-green-500"
                                >
                                    📝 Practice
                                </button>
                            </div>

                            <button
                                onClick={onViewHistory}
                                className="w-full px-6 py-2 text-slate-400 hover:text-white transition-colors text-sm underline"
                            >
                                📜 View Game History
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 text-left">
                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                    <h3 className="text-lg font-semibold mb-3 text-slate-300 flex items-center gap-2">
                        <span>📜</span> Rules
                    </h3>
                    <ul className="space-y-2 text-sm text-slate-400">
                        <li className="flex items-start gap-2">
                            <span className="text-orange-500">•</span> Choose 4 unique digits (0-9)
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-orange-500">•</span> Order matters exactly
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-orange-500">•</span> Deduce opponent's number
                        </li>
                    </ul>
                </div>

                <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50">
                    <h3 className="text-lg font-semibold mb-3 text-slate-300 flex items-center gap-2">
                        <span>💡</span> Meaning
                    </h3>
                    <ul className="space-y-2 text-sm text-slate-400">
                        <li className="flex items-start gap-2">
                            <span className="text-dead font-bold">Dead</span>: Correct digit, correct spot
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-wounded font-bold">Wounded</span>: Correct digit, wrong spot
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-green-400 font-bold">Win</span>: 4 Dead
                        </li>
                    </ul>
                </div>
            </div>

            {/* Join Private Game Modal */}
            {showJoinModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowJoinModal(false)}>
                    <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold mb-4">Join Private Game</h3>
                        <p className="text-slate-400 mb-6">Enter the 6-character code from your friend:</p>

                        <input
                            type="text"
                            maxLength={6}
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                            placeholder="ABC123"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-center font-mono text-2xl tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-orange-500 mb-4"
                        />

                        {joinError && (
                            <p className="text-red-400 text-sm mb-4">{joinError}</p>
                        )}

                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowJoinModal(false)}
                                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleJoinSubmit}
                                className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors"
                            >
                                Join Game
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Time Control Modal */}
            {showTimeControlModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-2xl font-bold mb-4">Create Private Game</h3>

                        <TimeControlSelector
                            onSelect={setSelectedTimeControl}
                            selectedTime={selectedTimeControl}
                        />

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    onCreatePrivate({ timeControlSeconds: selectedTimeControl });
                                    setShowTimeControlModal(false);
                                    setSelectedTimeControl(null);
                                }}
                                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg transition-colors"
                            >
                                Create Game
                            </button>
                            <button
                                onClick={() => {
                                    setShowTimeControlModal(false);
                                    setSelectedTimeControl(null);
                                }}
                                className="px-6 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
