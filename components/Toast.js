import { useEffect } from 'react';

export default function Toast({ message, type = 'info', onClose }) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const colors = {
        success: 'bg-green-600 border-green-500',
        error: 'bg-red-600 border-red-500',
        info: 'bg-blue-600 border-blue-500',
        warning: 'bg-yellow-600 border-yellow-500'
    };

    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };

    return (
        <div className={`fixed top-4 right-4 ${colors[type]} text-white px-6 py-4 rounded-lg shadow-2xl border-2 flex items-center gap-3 animate-slide-in z-50 max-w-md`}>
            <span className="text-2xl">{icons[type]}</span>
            <p className="flex-1">{message}</p>
            <button
                onClick={onClose}
                className="text-white/80 hover:text-white text-xl leading-none"
            >
                ×
            </button>
        </div>
    );
}
