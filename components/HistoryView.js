export default function HistoryView({ history, onBack }) {
    if (!history || history.length === 0) {
        return (
            <div className="w-full max-w-4xl">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-3xl font-bold">Game History</h2>
                    <button
                        onClick={onBack}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                    >
                        ← Back to Lobby
                    </button>
                </div>

                <div className="bg-slate-800 p-12 rounded-2xl shadow-2xl border border-slate-700 text-center">
                    <div className="text-6xl mb-4">📜</div>
                    <p className="text-xl text-slate-400">No games played yet</p>
                    <p className="text-slate-500 mt-2">Your match history will appear here</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold">Game History</h2>
                <button
                    onClick={onBack}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                    ← Back to Lobby
                </button>
            </div>

            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-900 border-b border-slate-700">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Opponent</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Result</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Your Guesses</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Their Guesses</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {history.map((game, index) => {
                                const isWinner = game.winner_id === game.player1_id || game.winner_id === game.player2_id;
                                const opponentName = game.player1_username === game.player2_username
                                    ? game.player2_username
                                    : (game.player1_username || game.player2_username);
                                const didWin = game.winner_id === (game.player1_id || game.player2_id); // Simplified - needs user context
                                const gameDate = new Date(game.finished_at);

                                return (
                                    <tr key={game.id} className="hover:bg-slate-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-200 font-medium">{opponentName}</span>
                                                {game.is_private && (
                                                    <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-400">🔒 Private</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${didWin
                                                    ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                                                    : 'bg-red-900/30 text-red-400 border border-red-500/30'
                                                }`}>
                                                {didWin ? '🏆 Win' : '💀 Loss'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">{game.my_guesses || 0}</td>
                                        <td className="px-6 py-4 text-slate-300">{game.opponent_guesses || 0}</td>
                                        <td className="px-6 py-4 text-slate-400 text-sm">
                                            {gameDate.toLocaleDateString()} {gameDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="mt-6 text-center text-slate-500 text-sm">
                Showing {history.length} recent game{history.length !== 1 ? 's' : ''}
            </div>
        </div>
    );
}
