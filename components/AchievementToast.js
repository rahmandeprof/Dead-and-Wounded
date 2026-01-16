import { useEffect } from 'react';

export default function AchievementToast({ achievement, onClose }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed top-20 right-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-lg shadow-2xl border-2 border-purple-400 flex items-center gap-3 animate-slide-in z-50 max-w-sm">
            <span className="text-3xl">{achievement.icon}</span>
            <div className="flex-1">
                <div className="text-xs font-bold text-purple-200">Achievement Unlocked!</div>
                <div className="font-bold">{achievement.name}</div>
                <div className="text-xs text-purple-100">{achievement.description}</div>
            </div>
            <button
                onClick={onClose}
                className="text-white/80 hover:text-white text-xl leading-none"
            >
                ×
            </button>
        </div>
    );
}
