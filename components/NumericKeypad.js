export default function NumericKeypad({ onNumber, onDelete, onEnter, disabled = false }) {
    return (
        <div className="grid grid-cols-3 gap-2 w-full max-w-sm mx-auto p-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                    key={num}
                    onClick={() => onNumber(num.toString())}
                    disabled={disabled}
                    className="h-14 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white text-2xl font-bold rounded-lg shadow transition-colors active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                    {num}
                </button>
            ))}
            <button
                onClick={onDelete}
                disabled={disabled}
                className="h-14 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-red-400 font-bold rounded-lg shadow transition-colors active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:active:scale-100"
            >
                ⌫
            </button>
            <button
                onClick={() => onNumber('0')}
                disabled={disabled}
                className="h-14 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 text-white text-2xl font-bold rounded-lg shadow transition-colors active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
                0
            </button>
            <button
                onClick={onEnter}
                disabled={disabled}
                className="h-14 bg-orange-600 hover:bg-orange-500 active:bg-orange-400 text-white font-bold rounded-lg shadow transition-colors active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
                ⏎
            </button>
        </div>
    );
}
