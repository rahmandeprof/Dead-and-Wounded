export default function ProgressBar({ currentXP, nextLevelXP, level, compact = false }) {
    const percentage = (currentXP / nextLevelXP) * 100;

    if (compact) {
        return (
            <div className="w-full">
                <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400">Level {level}</span>
                    <span className="text-xs text-slate-400">{currentXP}/{nextLevelXP} XP</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                        className="bg-gradient-to-r from-orange-500 to-yellow-500 h-full rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center font-bold text-white shadow-lg">
                        {level}
                    </div>
                    <div>
                        <div className="text-sm font-bold text-white">Level {level}</div>
                        <div className="text-xs text-slate-400">{currentXP}/{nextLevelXP} XP</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-slate-400">Next level</div>
                    <div className="text-sm font-bold text-orange-400">{nextLevelXP - currentXP} XP</div>
                </div>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                    className="bg-gradient-to-r from-orange-500 via-yellow-500 to-orange-500 h-full rounded-full transition-all duration-300 ease-out shadow-lg"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}
