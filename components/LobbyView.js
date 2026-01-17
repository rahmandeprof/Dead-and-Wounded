import { useState } from 'react';
import TimeControlSelector from './TimeControlSelector';

export default function LobbyView({ onCreatePrivate, onJoinPrivate, onViewHistory, onPlayAI, onPractice, onFindGame, onViewTournaments, isSearching, privateGameCode, onCancelSearch }) {
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [showTimeControlModal, setShowTimeControlModal] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [selectedTimeControl, setSelectedTimeControl] = useState(null);
    const [aiDifficulty, setAiDifficulty] = useState('medium');
    const [aiTimed, setAiTimed] = useState(false);
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
                            <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 shadow-xl">
                                <h2 className="text-3xl font-bold text-white mb-6">Quick Play</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        onClick={onFindGame}
                                        className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
                                    >
                                        🎮 Find Match
                                    </button>
                                    <button
                                        onClick={() => setShowTimeControlModal(true)}
                                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
                                    >
                                        🔐 Create Private
                                    </button>
                                </div>
                            </div>

                            {/* AI & Practice */}
                            <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 shadow-xl">
                                <h2 className="text-3xl font-bold text-white mb-6">Practice</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setShowAIModal(true)}
                                        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
                                    >
                                        🤖 VS AI
                                    </button>
                                    <button
                                        onClick={onPractice}
                                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
                                    >
                                        📝 Practice Mode
                                    </button>
                                </div>
                            </div>

                            {/* Tournaments */}
                            <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 shadow-xl">
                                <h2 className="text-3xl font-bold text-white mb-6">Compete</h2>
                                <div className="grid grid-cols-1 gap-4">
                                    <button
                                        onClick={onViewTournaments}
                                        className="bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
                                    >
                                        🏆 Tournaments
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={onViewHistory}
                                className="w-full px-6 py-2 text-slate-400 hover:text-white transition-colors text-sm underline"
                            >
                                View Game History
                            </button>
                        </div>
                    )}
                </div>
            </div >

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
            {
                showJoinModal && (
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
                )
            }

            {/* Time Control Modal */}
            {
                showTimeControlModal && (
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
                )
            }

            {/* AI Game Modal */}
            {
                showAIModal && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 max-w-md w-full shadow-2xl">
                            <h3 className="text-2xl font-bold mb-2">🤖 Play vs AI</h3>
                            <p className="text-slate-400 mb-6">Choose your challenge level</p>

                            {/* Difficulty Selection */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-300 mb-3">Difficulty</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        onClick={() => setAiDifficulty('easy')}
                                        className={`py-3 px-4 rounded-lg font-semibold transition-all ${aiDifficulty === 'easy'
                                                ? 'bg-green-600 text-white ring-2 ring-green-400'
                                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                    >
                                        😊 Easy
                                    </button>
                                    <button
                                        onClick={() => setAiDifficulty('medium')}
                                        className={`py-3 px-4 rounded-lg font-semibold transition-all ${aiDifficulty === 'medium'
                                                ? 'bg-yellow-600 text-white ring-2 ring-yellow-400'
                                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                    >
                                        🤔 Medium
                                    </button>
                                    <button
                                        onClick={() => setAiDifficulty('hard')}
                                        className={`py-3 px-4 rounded-lg font-semibold transition-all ${aiDifficulty === 'hard'
                                                ? 'bg-red-600 text-white ring-2 ring-red-400'
                                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                    >
                                        😈 Hard
                                    </button>
                                </div>
                            </div>

                            {/* Timed Mode Toggle */}
                            <div className="mb-6">
                                <label className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors">
                                    <div>
                                        <span className="font-medium text-white">⏱️ Timed Mode</span>
                                        <p className="text-sm text-slate-400 mt-1">
                                            {aiDifficulty === 'easy' && 'You get 5 minutes'}
                                            {aiDifficulty === 'medium' && 'You get 3 minutes'}
                                            {aiDifficulty === 'hard' && 'You get 2 minutes!'}
                                        </p>
                                    </div>
                                    <div
                                        onClick={() => setAiTimed(!aiTimed)}
                                        className={`w-14 h-8 rounded-full transition-colors relative ${aiTimed ? 'bg-purple-600' : 'bg-slate-600'
                                            }`}
                                    >
                                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${aiTimed ? 'translate-x-7' : 'translate-x-1'
                                            }`}></div>
                                    </div>
                                </label>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        onPlayAI(aiDifficulty, aiTimed);
                                        setShowAIModal(false);
                                    }}
                                    className="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-lg transition-colors"
                                >
                                    Start Game
                                </button>
                                <button
                                    onClick={() => {
                                        setShowAIModal(false);
                                        setAiDifficulty('medium');
                                        setAiTimed(false);
                                    }}
                                    className="px-6 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
