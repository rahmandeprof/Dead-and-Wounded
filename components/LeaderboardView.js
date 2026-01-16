export default function LeaderboardView({ leaderboard, currentUserId, onBack }) {
    return (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
            <div className="bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-700">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <span>🏆</span> Leaderboard
                    </h2>
                    <button
                        onClick={onBack}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        ← Back
                    </button>
                </div>

                {/* Leaderboard list */}
                <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {leaderboard && leaderboard.length > 0 ? (
                        leaderboard.map((player, index) => {
                            const isCurrentUser = player.id === currentUserId;
                            const rank = index + 1;

                            // Medal for top 3
                            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

                            return (
                                <div
                                    key={player.id}
                                    className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg transition-all ${isCurrentUser
                                            ? 'bg-gradient-to-r from-orange-600/20 to-yellow-600/20 border-2 border-orange-500'
                                            : 'bg-slate-700/30 hover:bg-slate-700/50'
                                        }`}
                                >
                                    {/* Rank */}
                                    <div className="w-8 sm:w-10 text-center">
                                        {medal ? (
                                            <span className="text-2xl sm:text-3xl">{medal}</span>
                                        ) : (
                                            <span className="text-lg sm:text-xl font-bold text-slate-400">#{rank}</span>
                                        )}
                                    </div>

                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0">
                                        <div
                                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-lg sm:text-xl font-bold shadow-lg"
                                            style={{ background: player.profile_color || '#6366f1' }}
                                        >
                                            {player.username[0].toUpperCase()}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-xs font-bold text-white border-2 border-slate-800">
                                            {player.level}
                                        </div>
                                    </div>

                                    {/* Player info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`font-bold truncate ${isCurrentUser ? 'text-orange-400' : 'text-white'}`}>
                                                {player.username}
                                            </span>
                                            {player.title && (
                                                <span className="text-xs text-slate-400 hidden sm:inline">
                                                    • {player.title}
                                                </span>
                                            )}
                                            {player.badge && (
                                                <span className="text-lg hidden sm:inline">{player.badge}</span>
                                            )}
                                        </div>
                                        <div className="text-xs sm:text-sm text-slate-400">
                                            {player.wins}W - {player.losses}L
                                            {player.best_streak > 0 && (
                                                <span className="ml-2">🔥 {player.best_streak}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Level & XP */}
                                    <div className="text-right">
                                        <div className="text-sm sm:text-base font-bold text-orange-400">
                                            Lv. {player.level}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {player.xp} XP
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center text-slate-400 py-8">
                            No players yet
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
