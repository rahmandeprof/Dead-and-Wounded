import { useState, useEffect } from 'react';

export default function TournamentLobby({ socket, user, onBack, onViewTournament }) {
    const [tournaments, setTournaments] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        if (socket) {
            // Request tournament list
            socket.emit('tournament:get_list');

            // Listen for updates
            socket.on('tournament:list', (data) => {
                setTournaments(data.tournaments || []);
            });

            socket.on('tournament:list_updated', () => {
                socket.emit('tournament:get_list');
            });

            socket.on('tournament:created', (data) => {
                setShowCreateModal(false);
                onViewTournament(data.tournament);
            });

            socket.on('tournament:joined', (data) => {
                onViewTournament(data.tournament);
            });

            return () => {
                socket.off('tournament:list');
                socket.off('tournament:list_updated');
                socket.off('tournament:created');
                socket.off('tournament:joined');
            };
        }
    }, [socket]);

    const handleJoin = (tournamentId) => {
        socket.emit('tournament:join', { tournamentId });
    };

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
                        <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                            <span>🏆</span> Tournaments
                        </h2>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        + Create
                    </button>
                </div>

                {/* Tournament List */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {tournaments.length > 0 ? (
                        tournaments.map((tournament) => (
                            <div
                                key={tournament.id}
                                className="bg-slate-700/30 hover:bg-slate-700/50 p-4 rounded-lg border border-slate-600 transition-all"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-white mb-1 truncate">
                                            {tournament.name}
                                        </h3>
                                        <div className="flex flex-wrap gap-2 text-sm text-slate-400">
                                            <span>👤 {tournament.player_count}/{tournament.max_players}</span>
                                            <span>•</span>
                                            <span>👑 {tournament.creator_username}</span>
                                            {tournament.time_control_seconds && (
                                                <>
                                                    <span>•</span>
                                                    <span>⏱️ {Math.floor(tournament.time_control_seconds / 60)}min</span>
                                                </>
                                            )}
                                            {tournament.min_level > 1 && (
                                                <>
                                                    <span>•</span>
                                                    <span>📊 Lv.{tournament.min_level}+</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleJoin(tournament.id)}
                                        disabled={tournament.player_count >= tournament.max_players || user.level < tournament.min_level}
                                        className="bg-orange-600 hover:bg-orange-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-colors whitespace-nowrap"
                                    >
                                        {tournament.player_count >= tournament.max_players ? 'Full' :
                                            user.level < tournament.min_level ? 'Locked' : 'Join'}
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-slate-400 py-12">
                            <p className="text-xl mb-2">🏆</p>
                            <p>No tournaments available</p>
                            <p className="text-sm mt-2">Create one to get started!</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Tournament Modal */}
            {showCreateModal && (
                <CreateTournamentModal
                    socket={socket}
                    user={user}
                    onClose={() => setShowCreateModal(false)}
                />
            )}
        </div>
    );
}

function CreateTournamentModal({ socket, user, onClose }) {
    const [name, setName] = useState('');
    const [maxPlayers, setMaxPlayers] = useState(8);
    const [timeControl, setTimeControl] = useState(null);
    const [minLevel, setMinLevel] = useState(1);

    const handleCreate = () => {
        if (!name.trim()) return;

        socket.emit('tournament:create', {
            name: name.trim(),
            maxPlayers,
            timeControlSeconds: timeControl,
            minLevel
        });
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 max-w-md w-full shadow-2xl">
                <h3 className="text-2xl font-bold mb-4">Create Tournament</h3>

                <div className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">
                            Tournament Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Epic Battle Royale"
                            className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                            maxLength={50}
                        />
                    </div>

                    {/* Max Players */}
                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">
                            Max Players
                        </label>
                        <select
                            value={maxPlayers}
                            onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                            className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value={4}>4 Players</option>
                            <option value={6}>6 Players</option>
                            <option value={8}>8 Players</option>
                            <option value={12}>12 Players</option>
                            <option value={16}>16 Players</option>
                        </select>
                    </div>

                    {/* Time Control */}
                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">
                            Time Control (per player)
                        </label>
                        <select
                            value={timeControl || ''}
                            onChange={(e) => setTimeControl(e.target.value ? parseInt(e.target.value) : null)}
                            className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        >
                            <option value="">No limit</option>
                            <option value={60}>1 minute</option>
                            <option value={120}>2 minutes</option>
                            <option value={300}>5 minutes</option>
                            <option value={600}>10 minutes</option>
                        </select>
                    </div>

                    {/* Min Level */}
                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-2">
                            Minimum Level
                        </label>
                        <input
                            type="number"
                            min={1}
                            max={100}
                            value={minLevel}
                            onChange={(e) => setMinLevel(parseInt(e.target.value) || 1)}
                            className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={handleCreate}
                        disabled={!name.trim()}
                        className="flex-1 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors"
                    >
                        Create Tournament
                    </button>
                    <button
                        onClick={onClose}
                        className="px-6 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
