export default function ProfileCard({ user, compact = false }) {
    const { level, xp, title, badge, profile_color, wins, losses, win_streak, best_streak } = user;

    // Calculate win rate
    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(0) : 0;

    if (compact) {
        return (
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex items-center gap-3">
                {/* Avatar with level */}
                <div className="relative">
                    <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg"
                        style={{ background: profile_color || '#6366f1' }}
                    >
                        {user.username[0].toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-xs font-bold text-white border-2 border-slate-800">
                        {level}
                    </div>
                </div>

                {/* User info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-white truncate">{user.username}</span>
                        {title && <span className="text-xs text-orange-400">• {title}</span>}
                    </div>
                    <div className="text-xs text-slate-400">
                        {wins}W - {losses}L • {winRate}% WR
                    </div>
                </div>

                {/* Badge */}
                {badge && (
                    <div className="text-2xl" title={badge}>
                        {badge}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border border-slate-700 shadow-xl">
            {/* Header */}
            <div className="flex items-start gap-4 mb-4">
                {/* Avatar */}
                <div className="relative">
                    <div
                        className="w-20 h-20 rounded-full flex items-center justify-center text-4xl font-bold shadow-2xl"
                        style={{ background: profile_color || '#6366f1' }}
                    >
                        {user.username[0].toUpperCase()}
                    </div>
                    <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-lg font-bold text-white border-4 border-slate-800 shadow-lg">
                        {level}
                    </div>
                </div>

                {/* User info */}
                <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-1">{user.username}</h3>
                    {title && (
                        <div className="text-sm text-orange-400 font-semibold mb-2">
                            👑 {title}
                        </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                        {badge && (
                            <div className="bg-slate-700/50 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                                <span>{badge}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-slate-700/30 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-400">{wins}</div>
                    <div className="text-xs text-slate-400">Wins</div>
                </div>
                <div className="bg-slate-700/30 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-400">{losses}</div>
                    <div className="text-xs text-slate-400">Losses</div>
                </div>
                <div className="bg-slate-700/30 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-400">{winRate}%</div>
                    <div className="text-xs text-slate-400">Win Rate</div>
                </div>
                <div className="bg-slate-700/30 p-3 rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-400">{best_streak}</div>
                    <div className="text-xs text-slate-400">Best Streak</div>
                </div>
            </div>

            {/* Current streak */}
            {win_streak > 0 && (
                <div className="bg-gradient-to-r from-orange-600/20 to-yellow-600/20 border border-orange-500/30 p-3 rounded-lg flex items-center justify-center gap-2">
                    <span className="text-2xl">🔥</span>
                    <span className="font-bold text-orange-400">{win_streak} Win Streak!</span>
                </div>
            )}
        </div>
    );
}
