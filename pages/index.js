import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Layout from '../components/Layout';
import AuthView from '../components/AuthView';
import LobbyView from '../components/LobbyView';
import GameView from '../components/GameView';
import HistoryView from '../components/HistoryView';
import DifficultyModal from '../components/DifficultyModal';
import Toast from '../components/Toast';
import LevelUpModal from '../components/LevelUpModal';
import AchievementToast from '../components/AchievementToast';
import TournamentLobby from '../components/TournamentLobby';
import TournamentView from '../components/TournamentView';
import DignifiableToast from '../components/DignifiableToast';
import ShareResultCard from '../components/ShareResultCard';

let socket;
let socketInitializing = false;

export default function Home() {
    const [user, setUser] = useState(null);
    const [view, setView] = useState('loading'); // loading | auth | lobby | game | history | tournaments | tournament
    const [game, setGame] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [privateGameCode, setPrivateGameCode] = useState(null);
    const [gameHistory, setGameHistory] = useState([]);
    const [showDifficultyModal, setShowDifficultyModal] = useState(false);
    const [aiThinking, setAiThinking] = useState(false);
    const [toast, setToast] = useState(null);
    const [levelUpData, setLevelUpData] = useState(null);
    const [achievementData, setAchievementData] = useState(null);
    const [currentTournament, setCurrentTournament] = useState(null);
    const [dignifiableData, setDignifiableData] = useState(null);
    const [showShareCard, setShowShareCard] = useState(false);
    const [shareGameData, setShareGameData] = useState(null);

    // Initial Auth Check
    useEffect(() => {
        fetch('/api/me', { credentials: 'include' })
            .then(res => {
                if (!res.ok) {
                    // Only redirect to auth if it's a 401 (not authenticated)
                    if (res.status === 401) {
                        throw new Error('Not authenticated');
                    }
                    // For other errors, retry
                    return null;
                }
                return res.json();
            })
            .then(data => {
                if (data && data.user) {
                    setUser(data.user);
                    initSocket();
                    setView('lobby');
                } else if (data === null) {
                    // Network error, stay on loading
                    console.log('Network error, retrying...');
                    setTimeout(() => window.location.reload(), 2000);
                } else {
                    setView('auth');
                }
            })
            .catch(() => setView('auth'));

        return () => {
            if (socket) socket.disconnect();
        };
    }, []);

    const initSocket = () => {
        if ((socket && socket.connected) || socketInitializing) return;
        socketInitializing = false;

        socket = io({
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 10000
        });

        socket.on('connect', () => {
            socketInitializing = false;
            console.log('✅ Connected to socket');
        });

        socket.on('connect_error', (error) => {
            console.error('❌ Socket connection error:', error.message);
            socketInitializing = false;
        });

        socket.on('disconnect', (reason) => {
            console.log('Socket disconnected:', reason);
        });

        socket.on('game:waiting', (data) => {
            setGame({ gameId: data.gameId, status: 'waiting' });
            setIsSearching(true);
        });

        socket.on('game:found', (data) => {
            setGame(data);
            setIsSearching(false);
            setView('game');
        });

        socket.on('game:opponent_joined', (data) => {
            setGame(data);
            setIsSearching(false);
            setView('game');
        });

        socket.on('game:rejoin', (data) => {
            setGame(data);
            if (data.status === 'waiting') {
                setIsSearching(true);
                setView('lobby');
            } else {
                setView('game');
            }
        });

        socket.on('game:secret_set', () => {
            setGame(prev => ({ ...prev, hasSetSecret: true }));
        });

        socket.on('game:started', (data) => {
            setGame(prev => ({ ...prev, ...data, guesses: [] }));
        });

        socket.on('game:guess_result', (data) => {
            setGame(prev => ({
                ...prev,
                ...data,
                guesses: (data.guesses || []).map(g => ({
                    ...g,
                    isMine: g.player_id === user?.id
                }))
            }));
        });

        socket.on('game:over', (data) => {
            setGame(prev => ({ ...prev, ...data }));
        });

        socket.on('game:opponent_left', (data) => {
            setToast({ message: data.message, type: 'warning' });
            setGame(null);
            setIsSearching(false);
            setView('lobby');
        });

        socket.on('game:left', () => {
            setGame(null);
            setIsSearching(false);
            setPrivateGameCode(null);
            setView('lobby');
        });

        socket.on('game:private_created', (data) => {
            setGame({ gameId: data.gameId, status: 'waiting' });
            setPrivateGameCode(data.gameCode);
        });

        socket.on('game:history_result', (data) => {
            setGameHistory(data.history);
            setView('history');
        });

        socket.on('game:error', (data) => {
            setToast({ message: data.message, type: 'error' });
            setIsSearching(false);
            setPrivateGameCode(null);
        });

        socket.on('level:up', (data) => {
            setLevelUpData(data);
        });

        socket.on('achievements:unlocked', (data) => {
            setAchievementData(data.achievements);
            setTimeout(() => setAchievementData(null), 5000);
        });

        socket.on('dignifiables:unlocked', (data) => {
            if (data.dignifiables && data.dignifiables.length > 0) {
                setDignifiableData(data.dignifiables[0]);
                setTimeout(() => setDignifiableData(null), 5000);
            }
        });

        socket.on('game:over', (data) => {
            // Store game data for share card
            setShareGameData({
                ...game,
                winnerId: data.winner,
                dignifiables: data.dignifiables || [],
                duration: data.duration,
                opponent: data.opponent
            });
            setShowShareCard(true);
        });

        socket.on('game:ai_created', (data) => {
            setGame(data);
            setView('game');
        });

        socket.on('game:practice_created', (data) => {
            setGame(data);
            setView('game');
        });

        return () => {
            socket.off('game:found');
            socket.off('game:private_created');
            socket.off('game:history_result');
            socket.off('game:error');
            socket.off('level:up');
            socket.off('achievements:unlocked');
            socket.off('dignifiables:unlocked');
            socket.off('game:over');
            socket.off('game:ai_created');
            socket.off('game:practice_created');
        };

        socket.on('game:ai_thinking', (data) => {
            setAiThinking(data.thinking);
        });
    };

    const handleLogin = (userData) => {
        setUser(userData);
        initSocket();
        setView('lobby');
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        if (socket) socket.disconnect();
        setUser(null);
        setView('auth');
    };

    const handleFindGame = () => {
        console.log('🎯 Quick Match clicked');
        console.log('Socket connected:', socket?.connected);
        if (!socket || !socket.connected) {
            console.error('❌ Socket not connected!');
            alert('Connection error. Please refresh the page.');
            return;
        }
        socket.emit('game:find');
        setIsSearching(true);
    };
    const handleCancelSearch = () => {
        if (game?.gameId) {
            socket.emit('game:leave', { gameId: game.gameId });
        }
        setIsSearching(false);
        setPrivateGameCode(null);
    };

    const handleCreatePrivate = () => {
        console.log('🔒 Create Private clicked');
        console.log('Socket connected:', socket?.connected);
        if (!socket || !socket.connected) {
            console.error('❌ Socket not connected!');
            alert('Connection error. Please refresh the page.');
            return;
        }
        socket.emit('game:create_private');
    };

    const handleJoinPrivate = (gameCode) => {
        console.log('🔑 Join Private clicked with code:', gameCode);
        console.log('Socket connected:', socket?.connected);
        if (!socket || !socket.connected) {
            console.error('❌ Socket not connected!');
            alert('Connection error. Please refresh the page.');
            return;
        }
        socket.emit('game:join_private', { gameCode });
    };

    const handleViewHistory = () => {
        console.log('📜 View History clicked');
        console.log('Socket connected:', socket?.connected);
        if (!socket || !socket.connected) {
            console.error('❌ Socket not connected!');
            alert('Connection error. Please refresh the page.');
            return;
        }
        socket.emit('game:history', { limit: 20 });
    };

    const handleBackToLobby = () => {
        setView('lobby');
    };

    const handlePlayAI = () => {
        setShowDifficultyModal(true);
    };

    const handleDifficultySelect = (difficulty) => {
        console.log('🤖 Play vs AI clicked - Difficulty:', difficulty);
        console.log('Socket connected:', socket?.connected);
        if (!socket || !socket.connected) {
            console.error('❌ Socket not connected!');
            alert('Connection error. Please refresh the page.');
            return;
        }
        setShowDifficultyModal(false);
        socket.emit('game:play_ai', { difficulty });
    };

    const handlePractice = () => {
        console.log('📝 Practice Mode clicked');
        console.log('Socket connected:', socket?.connected);
        if (!socket || !socket.connected) {
            console.error('❌ Socket not connected!');
            alert('Connection error. Please refresh the page.');
            return;
        }
        socket.emit('game:practice');
    };

    const handleLeaveGame = () => {
        if (confirm('Are you sure you want to leave?')) {
            socket.emit('game:leave', { gameId: game.gameId });
        }
    };

    const handlePlayAgain = () => {
        setGame(null);
        setIsSearching(false);
        setView('lobby');
    };

    const handleViewTournaments = () => {
        setView('tournaments');
    };

    const handleViewTournament = (tournament) => {
        setCurrentTournament(tournament);
        setView('tournament');
    };

    const handleBackFromTournaments = () => {
        setView('lobby');
        setCurrentTournament(null);
    };

    // Enrich game object with myId for GameView
    const gameWithMyId = game ? { ...game, myId: user?.id } : null;
    // Also enrich guesses with isMine if needed, but easier to do in GameView using myId

    // Fix guesses isMine logic helper
    if (gameWithMyId && gameWithMyId.guesses) {
        gameWithMyId.guesses = gameWithMyId.guesses.map(g => ({
            ...g,
            isMine: g.player_id === user.id
        }));
    }

    return (
        <Layout user={user} onLogout={handleLogout}>
            {view === 'loading' && (
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-12 h-12 bg-slate-700 rounded-full mb-4"></div>
                    <div className="h-4 w-32 bg-slate-700 rounded"></div>
                </div>
            )}

            {view === 'auth' && <AuthView onLogin={handleLogin} />}

            {view === 'lobby' && (
                <>
                    <LobbyView
                        user={user}
                        onFindGame={handleFindGame}
                        onCreatePrivate={handleCreatePrivate}
                        onJoinPrivate={handleJoinPrivate}
                        onViewHistory={handleViewHistory}
                        onPlayAI={handlePlayAI}
                        onPractice={handlePractice}
                        onViewTournaments={handleViewTournaments}
                        isSearching={isSearching}
                        privateGameCode={privateGameCode}
                        onCancelSearch={handleCancelSearch}
                    />
                    {showDifficultyModal && (
                        <DifficultyModal
                            onSelect={handleDifficultySelect}
                            onClose={() => setShowDifficultyModal(false)}
                        />
                    )}
                </>
            )}

            {view === 'history' && (
                <HistoryView
                    history={gameHistory}
                    user={user}
                    onBack={handleBackToLobby}
                />
            )}

            {view === 'tournaments' && (
                <TournamentLobby
                    socket={socket}
                    user={user}
                    onBack={handleBackFromTournaments}
                    onViewTournament={handleViewTournament}
                />
            )}

            {view === 'tournament' && currentTournament && (
                <TournamentView
                    tournament={currentTournament}
                    socket={socket}
                    user={user}
                    onBack={handleBackFromTournaments}
                />
            )}

            {view === 'game' && gameWithMyId && (
                <GameView
                    game={gameWithMyId}
                    socket={socket}
                    onLeave={handleLeaveGame}
                    onPlayAgain={handlePlayAgain}
                />
            )}

            {/* Toast Notifications */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Level Up Modal */}
            {levelUpData && (
                <LevelUpModal
                    newLevel={levelUpData.newLevel}
                    rewards={[]} // Can add rewards based on level later
                    onClose={() => setLevelUpData(null)}
                />
            )}

            {/* Achievement Toast */}
            {achievementData && achievementData.length > 0 && (
                <AchievementToast
                    achievement={achievementData[0]}
                    onClose={() => setAchievementData(null)}
                />
            )}

            {dignifiableData && (
                <DignifiableToast
                    dignifiable={dignifiableData}
                    onClose={() => setDignifiableData(null)}
                />
            )}

            {showShareCard && shareGameData && (
                <ShareResultCard
                    game={shareGameData}
                    user={user}
                    onClose={() => {
                        setShowShareCard(false);
                        setShareGameData(null);
                    }}
                />
            )}
        </Layout>
    );
}
