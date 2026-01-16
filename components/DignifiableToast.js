export default function DignifiableToast({ dignifiable, onClose }) {
    if (!dignifiable) return null;

    return (
        <div className="fixed top-20 right-4 z-50 animate-slide-in">
            <div className="bg-gradient-to-r from-orange-600 to-yellow-600 text-white rounded-xl shadow-2xl p-4 max-w-sm border-2 border-yellow-400">
                <div className="flex items-start gap-3">
                    <div className="text-4xl">{dignifiable.icon}</div>
                    <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">
                            Badge Unlocked!
                        </h3>
                        <p className="font-bold">{dignifiable.name}</p>
                        <p className="text-sm opacity-90">{dignifiable.description}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:text-yellow-200 transition-colors"
                    >
                        ✕
                    </button>
                </div>
            </div>
        </div>
    );
}
