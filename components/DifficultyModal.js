import { useState } from 'react';

export default function DifficultyModal({ onSelect, onClose }) {
    const [selected, setSelected] = useState('medium');

    const difficulties = [
        { id: 'easy', name: 'Easy', icon: '😊', description: 'Random guesses, perfect for beginners' },
        { id: 'medium', name: 'Medium', icon: '🧠', description: 'Smart strategy, moderate challenge' },
        { id: 'hard', name: 'Hard', icon: '🔥', description: 'Optimal AI, very challenging' }
    ];

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-2xl font-bold mb-2">Choose Difficulty</h3>
                <p className="text-slate-400 mb-6">Select your AI opponent's skill level</p>

                <div className="space-y-3 mb-6">
                    {difficulties.map((diff) => (
                        <button
                            key={diff.id}
                            onClick={() => setSelected(diff.id)}
                            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${selected === diff.id
                                    ? 'border-orange-500 bg-orange-500/10'
                                    : 'border-slate-700 bg-slate-900 hover:border-slate-600'
                                }`}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <span className="text-3xl">{diff.icon}</span>
                                <span className="text-lg font-semibold">{diff.name}</span>
                            </div>
                            <p className="text-sm text-slate-400 ml-12">{diff.description}</p>
                        </button>
                    ))}
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSelect(selected)}
                        className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-lg transition-colors"
                    >
                        Start Game
                    </button>
                </div>
            </div>
        </div>
    );
}
