import { useState, useEffect } from 'react';

export default function GameTimer({
    player1Time,
    player2Time,
    isPlayer1Turn,
    isMyTurn,
    gameStatus,
    player1Name,
    player2Name
}) {
    const [displayTime1, setDisplayTime1] = useState(player1Time);
    const [displayTime2, setDisplayTime2] = useState(player2Time);

    useEffect(() => {
        setDisplayTime1(player1Time);
        setDisplayTime2(player2Time);
    }, [player1Time, player2Time]);

    // Client-side countdown for active player
    useEffect(() => {
        if (gameStatus !== 'playing') return;

        const interval = setInterval(() => {
            if (isPlayer1Turn && displayTime1 > 0) {
                setDisplayTime1(prev => Math.max(0, prev - 1));
            } else if (!isPlayer1Turn && displayTime2 > 0) {
                setDisplayTime2(prev => Math.max(0, prev - 1));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isPlayer1Turn, gameStatus, displayTime1, displayTime2]);

    const formatTime = (seconds) => {
        if (seconds === null || seconds === undefined) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${String(secs).padStart(2, '0')}`;
    };

    const getTimeColor = (seconds, isActive) => {
        if (!isActive) return 'text-slate-400';
        if (seconds <= 10) return 'text-red-500 animate-pulse';
        if (seconds <= 30) return 'text-orange-500';
        return 'text-green-500';
    };

    // Don't show if no time control
    if (player1Time === null && player2Time === null) return null;

    return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
                {/* Player 1 Timer */}
                <div className={`text-center p-3 rounded-lg ${isPlayer1Turn ? 'bg-orange-900/20 border-2 border-orange-500' : 'bg-slate-700/30'
                    }`}>
                    <div className="text-xs text-slate-400 mb-1">
                        {player1Name || 'Player 1'}
                    </div>
                    <div className={`text-2xl font-mono font-bold ${getTimeColor(displayTime1, isPlayer1Turn)}`}>
                        {formatTime(displayTime1)}
                    </div>
                    {isPlayer1Turn && (
                        <div className="text-xs text-orange-400 mt-1">
                            ⏱️ Active
                        </div>
                    )}
                </div>

                {/* Player 2 Timer */}
                <div className={`text-center p-3 rounded-lg ${!isPlayer1Turn ? 'bg-orange-900/20 border-2 border-orange-500' : 'bg-slate-700/30'
                    }`}>
                    <div className="text-xs text-slate-400 mb-1">
                        {player2Name || 'Player 2'}
                    </div>
                    <div className={`text-2xl font-mono font-bold ${getTimeColor(displayTime2, !isPlayer1Turn)}`}>
                        {formatTime(displayTime2)}
                    </div>
                    {!isPlayer1Turn && (
                        <div className="text-xs text-orange-400 mt-1">
                            ⏱️ Active
                        </div>
                    )}
                </div>
            </div>

            {/* Low time warning */}
            {((isPlayer1Turn && displayTime1 <= 30) || (!isPlayer1Turn && displayTime2 <= 30)) && (
                <div className="mt-3 text-center text-sm text-orange-400 animate-pulse">
                    ⚠️ Low time!
                </div>
            )}
        </div>
    );
}
