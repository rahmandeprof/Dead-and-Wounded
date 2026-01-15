import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Layout from '../components/Layout';
import AuthView from '../components/AuthView';
import LobbyView from '../components/LobbyView';
import GameView from '../components/GameView';
import HistoryView from '../components/HistoryView';

let socket;
let socketInitializing = false;

export default function Home() {
    const [user, setUser] = useState(null);
    const [view, setView] = useState('loading'); // loading | auth | lobby | game | history
    const [game, setGame] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [privateGameCode, setPrivateGameCode] = useState(null);
    const [gameHistory, setGameHistory] = useState([]);

    // Initial Auth Check
    useEffect(() => {
        fetch('/api/me')
            .then(res => {
                if (!res.ok) throw new Error('Not authenticated');
                return res.json();
            })
            .then(data => {
                if (data.user) {
                    setUser(data.user);
                    initSocket();
                    setView('lobby');
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
        socketInitializing = true;

        socket = io();

        socket.on('connect', () => {
            socketInitializing = false;
            console.log('Connected to socket');
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
            alert(data.message);
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
            alert(data.message);
            setIsSearching(false);
            setPrivateGameCode(null);
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
        socket.emit('game:find');
    };

    const handleCancelSearch = () => {
        if (game?.gameId) {
            socket.emit('game:leave', { gameId: game.gameId });
        }
        setIsSearching(false);
        setPrivateGameCode(null);
    };

    const handleCreatePrivate = () => {
        socket.emit('game:create_private');
    };

    const handleJoinPrivate = (gameCode) => {
        socket.emit('game:join_private', { gameCode });
    };

    const handleViewHistory = () => {
        socket.emit('game:history', { limit: 20 });
    };

    const handleBackToLobby = () => {
        setView('lobby');
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
                <LobbyView
                    user={user}
                    onFindGame={handleFindGame}
                    onCreatePrivate={handleCreatePrivate}
                    onJoinPrivate={handleJoinPrivate}
                    onViewHistory={handleViewHistory}
                    isSearching={isSearching}
                    privateGameCode={privateGameCode}
                    onCancelSearch={handleCancelSearch}
                />
            )}

            {view === 'history' && (
                <HistoryView
                    history={gameHistory}
                    onBack={handleBackToLobby}
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
        </Layout>
    );
}
