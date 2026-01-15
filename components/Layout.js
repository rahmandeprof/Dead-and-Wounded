export default function Layout({ children, user, onLogout }) {
    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
            <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-3">
                    <span className="text-3xl filter drop-shadow-lg">💀</span>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                        Dead & Wounded
                    </h1>
                </div>

                {user && (
                    <div className="flex items-center gap-6">
                        <div className="text-sm text-slate-400">
                            <span className="font-medium text-slate-200">{user.username}</span>
                            <span className="mx-2">|</span>
                            <span>W: {user.wins}</span>
                        </div>
                        <button
                            onClick={onLogout}
                            className="px-3 py-1 text-sm border border-slate-600 rounded-md hover:bg-slate-700 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                )}
            </header>

            <main className="flex-1 container mx-auto p-4 md:p-8 flex flex-col items-center justify-center">
                {children}
            </main>

            <footer className="p-4 text-center text-slate-500 text-sm">
                &copy; {new Date().getFullYear()} Dead & Wounded
            </footer>
        </div>
    );
}
