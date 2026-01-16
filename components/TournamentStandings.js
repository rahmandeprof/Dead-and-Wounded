export default function TournamentStandings({ players, currentUserId }) {
    return (
        <div className="bg-slate-700/30 rounded-xl border border-slate-600 overflow-hidden">
            <div className="bg-slate-700/50 px-4 py-3 border-b border-slate-600">
                <h3 className="font-bold text-white">Standings</h3>
            </div>

            <div className="divide-y divide-slate-600">
                {players && players.length > 0 ? (
                    players.map((player, index) => {
                        const isCurrentUser = player.user_id === currentUserId;
                        const rank = index + 1;
                        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;

                        return (
                            <div
                                key={player.id}
                                className={`flex items-center gap-3 p-3 ${isCurrentUser ? 'bg-orange-900/20' : 'hover:bg-slate-700/30'
                                    }`}
                            >
                                {/* Rank */}
                                <div className="w-8 text-center">
                                    {medal ? (
                                        <span className="text-xl">{medal}</span>
                                    ) : (
                                        <span className="text-slate-400 font-bold">#{rank}</span>
                                    )}
                                </div>

                                {/* Player Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold truncate ${isCurrentUser ? 'text-orange-400' : 'text-white'}`}>
                                            {player.username}
                                        </span>
                                        <span className="text-xs text-slate-400">Lv.{player.level}</span>
                                    </div>
                                    <div className="text-xs text-slate-400">
                                        {player.wins}W - {player.losses}L
                                    </div>
                                </div>

                                {/* Points */}
                                <div className="text-right">
                                    <div className="text-lg font-bold text-orange-400">
                                        {player.points}
                                    </div>
                                    <div className="text-xs text-slate-400">pts</div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="p-4 text-center text-slate-400">
                        No players yet
                    </div>
                )}
            </div>
        </div>
    );
}
