import { useState } from 'react';

export default function AuthView({ onLogin }) {
    const [mode, setMode] = useState('login'); // login | register
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Authentication failed');
            } else {
                onLogin(data.user);
            }
        } catch (err) {
            setError('Connection error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-slate-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-700">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Welcome</h2>
                <p className="text-slate-400">Enter the battlefield of logic</p>
            </div>

            <div className="flex rounded-lg bg-slate-900 p-1 mb-6">
                <button
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'login' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                    onClick={() => setMode('login')}
                >
                    Login
                </button>
                <button
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${mode === 'register' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
                        }`}
                    onClick={() => setMode('register')}
                >
                    Register
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Username</label>
                    <input
                        type="text"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all placeholder-slate-600"
                        placeholder="Username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                        minLength={3}
                        maxLength={20}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
                    <input
                        type="password"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all placeholder-slate-600"
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        minLength={4}
                    />
                </div>

                {error && (
                    <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-3 rounded-lg shadow-lg transform transition hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Processing...' : (mode === 'login' ? 'Enter Game' : 'Create Account')}
                </button>
            </form>
        </div>
    );
}
