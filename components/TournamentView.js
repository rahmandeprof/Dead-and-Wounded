import { useState, useEffect } from 'react';
import TournamentStandings from './TournamentStandings';

export default function TournamentView({ tournament, socket, user, onBack }) {
    const [players, setPlayers] = useState([]);
    const [matches, setMatches] = useState([]);
    const [currentRound, setCurrentRound] = useState(tournament.current_round || 0);

    useEffect(() => {
        if (socket) {
            // Listen for tournament updates
            socket.on('tournament:updated', (data) => {
                if (data.tournamentId === tournament.id) {
                    setPlayers(data.players || []);
                }
            });

            socket.on('tournament:started', (data) => {
                if (data.tournament.id === tournament.id) {
                    setPlayers(data.players || []);
                    setMatches(data.matches || []);
                    setCurrentRound(data.tournament.current_round);
                }
            });

            // Request initial data
            socket.emit('tournament:get_list');

            return () => {
                socket.off('tournament:updated');
                socket.off('tournament:started');
            };
        }
    }, [socket, tournament.id]);

    const handleLeave = () => {
        socket.emit('tournament:leave', { tournamentId: tournament.id });
        onBack();
    };

    const handleStart = () => {
        socket.emit('tournament:start', { tournamentId: tournament.id });
    };

    const isCreator = tournament.creator_id === user.id;
    const canStart = isCreator && tournament.status === 'registration' && tournament.current_players >= 3;

    if (tournament.status === 'registration') {
        return (
            <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
                <div className="bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-700">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={onBack}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                ← Back
                            </button>
                            <h2 className="text-2xl sm:text-3xl font-bold">
                                {tournament.name}
                            </h2>
                        </div>
                        <div className="flex gap-2">
                            {canStart && (
                                <button
                                    onClick={handleStart}
                                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                                >
                                    Start Tournament
                                </button>
                            )}
                            <button
                                onClick={handleLeave}
                                className="bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                            >
                                Leave
                            </button>
                        </div>
                    </div>

                    {/* Tournament Info */}
                    <div className="bg-slate-700/30 rounded-xl p-4 mb-6">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                            <div>
                                <div className="text-2xl font-bold text-orange-400">
                                    {tournament.current_players}/{tournament.max_players}
                                </div>
                                <div className="text-xs text-slate-400">Players</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-blue-400">
                                    {tournament.time_control_seconds ? `${Math.floor(tournament.time_control_seconds / 60)}m` : '∞'}
                                </div>
                                <div className="text-xs text-slate-400">Time Control</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-green-400">
                                    Lv.{tournament.min_level}+
                                </div>
                                <div className="text-xs text-slate-400">Min Level</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-purple-400">
                                    Registration
                                </div>
                                <div className="text-xs text-slate-400">Status</div>
                            </div>
                        </div>
                    </div>

                    {/* Players List */}
                    <div className="bg-slate-700/30 rounded-xl border border-slate-600 overflow-hidden">
                        <div className="bg-slate-700/50 px-4 py-3 border-b border-slate-600">
                            <h3 className="font-bold text-white">Registered Players</h3>
                        </div>
                        <div className="divide-y divide-slate-600 max-h-96 overflow-y-auto">
                            {players.map((player) => (
                                <div key={player.id} className="flex items-center justify-between p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-yellow-500 flex items-center justify-center text-white font-bold">
                                            {player.username[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white">{player.username}</div>
                                            <div className="text-xs text-slate-400">Level {player.level}</div>
                                        </div>
                                    </div>
                                    {player.user_id === tournament.creator_id && (
                                        <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded">
                                            Creator
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {!canStart && isCreator && (
                        <div className="mt-4 text-center text-sm text-slate-400">
                            Need at least 3 players to start
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // In Progress / Completed View
    return (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
            <div className="bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-700">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            ← Back
                        </button>
                        <h2 className="text-2xl sm:text-3xl font-bold">
                            {tournament.name}
                        </h2>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-slate-400">Round</div>
                        <div className="text-2xl font-bold text-orange-400">
                            {currentRound}/{tournament.total_rounds}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Standings */}
                    <div className="lg:col-span-1">
                        <TournamentStandings players={players} currentUserId={user.id} />
                    </div>

                    {/* Matches */}
                    <div className="lg:col-span-2">
                        <div className="bg-slate-700/30 rounded-xl border border-slate-600 overflow-hidden">
                            <div className="bg-slate-700/50 px-4 py-3 border-b border-slate-600">
                                <h3 className="font-bold text-white">Round {currentRound} Matches</h3>
                            </div>
                            <div className="divide-y divide-slate-600">
                                {matches.length > 0 ? (
                                    matches.map((match) => (
                                        <div key={match.id} className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="font-bold text-white">{match.player1_username}</div>
                                                    <div className="text-xs text-slate-400">Player 1</div>
                                                </div>
                                                <div className="px-4 text-slate-400 font-bold">VS</div>
                                                <div className="flex-1 text-right">
                                                    <div className="font-bold text-white">{match.player2_username}</div>
                                                    <div className="text-xs text-slate-400">Player 2</div>
                                                </div>
                                            </div>
                                            <div className="mt-2 text-center">
                                                <span className={`text-xs px-3 py-1 rounded-full ${match.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                                                        match.status === 'in_progress' ? 'bg-blue-600/20 text-blue-400' :
                                                            'bg-slate-600/20 text-slate-400'
                                                    }`}>
                                                    {match.status === 'completed' ? '✓ Completed' :
                                                        match.status === 'in_progress' ? '⏳ In Progress' :
                                                            '⏸️ Pending'}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-slate-400">
                                        No matches yet
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
