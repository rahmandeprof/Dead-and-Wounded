import { useEffect, useState } from 'react';

export default function LevelUpModal({ newLevel, rewards, onClose }) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Trigger animation after mount
        setTimeout(() => setShow(true), 100);
    }, []);

    const handleClose = () => {
        setShow(false);
        setTimeout(onClose, 300);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            {/* Confetti effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(30)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute animate-confetti"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `-10%`,
                            animationDelay: `${Math.random() * 0.5}s`,
                            animationDuration: `${2 + Math.random()}s`
                        }}
                    >
                        {['🎉', '⭐', '✨', '🎊', '💫'][Math.floor(Math.random() * 5)]}
                    </div>
                ))}
            </div>

            {/* Modal */}
            <div className={`bg-slate-800 rounded-2xl border-2 border-orange-500 p-6 sm:p-8 max-w-md w-full shadow-2xl transform transition-all duration-300 ${show ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}>
                <div className="text-center">
                    {/* Level badge */}
                    <div className="mb-4">
                        <div className="inline-block relative">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center font-bold text-4xl text-white shadow-2xl animate-pulse-slow">
                                {newLevel}
                            </div>
                            <div className="absolute -top-2 -right-2 text-4xl animate-bounce">
                                🎉
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">
                        Level Up!
                    </h2>
                    <p className="text-xl text-slate-300 mb-6">
                        You've reached <span className="font-bold text-orange-400">Level {newLevel}</span>!
                    </p>

                    {/* Rewards */}
                    {rewards && rewards.length > 0 && (
                        <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
                            <h3 className="text-sm font-bold text-slate-400 mb-3">🎁 Rewards Unlocked</h3>
                            <div className="space-y-2">
                                {rewards.map((reward, i) => (
                                    <div key={i} className="flex items-center justify-center gap-2 text-sm">
                                        <span className="text-2xl">{reward.icon}</span>
                                        <span className="text-slate-200">{reward.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Continue button */}
                    <button
                        onClick={handleClose}
                        className="w-full bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-500 hover:to-yellow-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all transform hover:scale-105 active:scale-95"
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}
