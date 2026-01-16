export default function StatsView({ user, onBack }) {
    const [stats, setStats] = React.useState(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        // Request stats from server
        if (window.socket) {
            window.socket.emit('stats:get');

            window.socket.on('stats:data', (data) => {
                setStats(data);
                setLoading(false);
            });

            return () => {
                window.socket.off('stats:data');
            };
        }
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-white text-xl">Loading stats...</div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-white text-xl">No stats available</div>
            </div>
        );
    }

    const winRate = user.wins + user.losses > 0
        ? ((user.wins / (user.wins + user.losses)) * 100).toFixed(1)
        : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-4xl font-bold text-white">📊 Statistics</h1>
                    <button
                        onClick={onBack}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                        ← Back
                    </button>
                </div>

                {/* Overview Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl p-6 shadow-lg">
                        <div className="text-orange-200 text-sm mb-1">Win Rate</div>
                        <div className="text-white text-3xl font-bold">{winRate}%</div>
                        <div className="text-orange-200 text-xs mt-1">{user.wins}W - {user.losses}L</div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 shadow-lg">
                        <div className="text-blue-200 text-sm mb-1">Total Games</div>
                        <div className="text-white text-3xl font-bold">{user.total_games}</div>
                        <div className="text-blue-200 text-xs mt-1">All time</div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 shadow-lg">
                        <div className="text-purple-200 text-sm mb-1">Win Streak</div>
                        <div className="text-white text-3xl font-bold">{user.win_streak}</div>
                        <div className="text-purple-200 text-xs mt-1">Best: {user.best_streak}</div>
                    </div>

                    <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 shadow-lg">
                        <div className="text-green-200 text-sm mb-1">Level</div>
                        <div className="text-white text-3xl font-bold">{user.level}</div>
                        <div className="text-green-200 text-xs mt-1">{user.xp} XP</div>
                    </div>
                </div>

                {/* Game Type Breakdown */}
                <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-slate-700">
                    <h2 className="text-2xl font-bold text-white mb-4">Game Types</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-700/50 rounded-lg p-4">
                            <div className="text-slate-400 text-sm">PvP Games</div>
                            <div className="text-white text-2xl font-bold">{stats.gameTypes?.pvp_games || 0}</div>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-4">
                            <div className="text-slate-400 text-sm">AI Games</div>
                            <div className="text-white text-2xl font-bold">{stats.gameTypes?.ai_games || 0}</div>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-4">
                            <div className="text-slate-400 text-sm">Tournament Games</div>
                            <div className="text-white text-2xl font-bold">{stats.gameTypes?.tournament_games || 0}</div>
                        </div>
                    </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Guess Efficiency */}
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                        <h3 className="text-xl font-bold text-white mb-4">⚡ Guess Efficiency</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Average Guesses to Win</span>
                                <span className="text-white font-bold">
                                    {stats.guessEfficiency?.avg_guesses ? parseFloat(stats.guessEfficiency.avg_guesses).toFixed(1) : 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Best Performance</span>
                                <span className="text-green-400 font-bold">
                                    {stats.guessEfficiency?.min_guesses || 'N/A'} guesses
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Fastest Win</span>
                                <span className="text-orange-400 font-bold">
                                    {stats.fastest_win ? `${Math.floor(stats.fastest_win / 60)}m ${stats.fastest_win % 60}s` : 'N/A'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Top Opponents */}
                    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                        <h3 className="text-xl font-bold text-white mb-4">🎯 Top Opponents</h3>
                        {stats.topOpponents && stats.topOpponents.length > 0 ? (
                            <div className="space-y-2">
                                {stats.topOpponents.map((opp, i) => (
                                    <div key={i} className="flex justify-between items-center bg-slate-700/50 rounded p-2">
                                        <span className="text-white">{opp.username}</span>
                                        <span className="text-slate-400 text-sm">
                                            {opp.games_played} games ({opp.wins}W)
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-slate-400 text-center py-4">No opponents yet</div>
                        )}
                    </div>
                </div>

                {/* Recent Performance */}
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                    <h3 className="text-xl font-bold text-white mb-4">📈 Recent Performance</h3>
                    {stats.recentPerformance && stats.recentPerformance.length > 0 ? (
                        <div className="flex gap-2">
                            {stats.recentPerformance.map((game, i) => (
                                <div
                                    key={i}
                                    className={`w-10 h-10 rounded flex items-center justify-center font-bold ${game.result === 'win'
                                            ? 'bg-green-600 text-white'
                                            : 'bg-red-600 text-white'
                                        }`}
                                    title={game.result === 'win' ? 'Win' : 'Loss'}
                                >
                                    {game.result === 'win' ? 'W' : 'L'}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-slate-400 text-center py-4">No recent games</div>
                    )}
                </div>
            </div>
        </div>
    );
}
