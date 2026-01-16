export default function ShareResultCard({ game, user, onClose }) {
    const isWinner = game.winnerId === user.id;
    const opponentName = game.opponent?.username || 'Opponent';

    const copyShareText = () => {
        const text = isWinner
            ? `🎯 Just won a game of Dead and Wounded!\nMoves: ${game.guesses?.length || 0}\nThink you can beat me?`
            : `Just played Dead and Wounded! GG to ${opponentName}!`;

        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    const shareToTwitter = () => {
        const text = isWinner
            ? `🎯 Just won a game of Dead and Wounded! Think you can beat me?`
            : `Just played Dead and Wounded! GG!`;
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-orange-500 p-8 max-w-md w-full shadow-2xl">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="text-6xl mb-4">
                        {isWinner ? '🏆' : '🎯'}
                    </div>
                    <h2 className="text-3xl font-bold mb-2">
                        {isWinner ? 'Victory!' : 'Game Over'}
                    </h2>
                    <p className="text-slate-400">
                        {isWinner ? `You defeated ${opponentName}!` : `${opponentName} won this round`}
                    </p>
                </div>

                {/* Stats */}
                <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
                    <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                            <div className="text-2xl font-bold text-orange-400">
                                {game.guesses?.length || 0}
                            </div>
                            <div className="text-xs text-slate-400">Total Moves</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-blue-400">
                                {game.duration || 'N/A'}
                            </div>
                            <div className="text-xs text-slate-400">Duration</div>
                        </div>
                    </div>
                </div>

                {/* Dignifiables */}
                {game.dignifiables && game.dignifiables.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-slate-400 mb-2">Badges Earned</h3>
                        <div className="flex flex-wrap gap-2">
                            {game.dignifiables.map((dig, i) => (
                                <div
                                    key={i}
                                    className="bg-gradient-to-r from-orange-600 to-yellow-600 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1"
                                >
                                    <span>{dig.icon}</span>
                                    <span>{dig.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Share Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={shareToTwitter}
                        className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <span>🐦</span>
                        Share on Twitter
                    </button>

                    <button
                        onClick={copyShareText}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <span>📋</span>
                        Copy Share Text
                    </button>

                    <button
                        onClick={onClose}
                        className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
