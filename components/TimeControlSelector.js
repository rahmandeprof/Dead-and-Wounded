import { useState } from 'react';

export default function TimeControlSelector({ onSelect, selectedTime }) {
    const [customMinutes, setCustomMinutes] = useState('');
    const [showCustom, setShowCustom] = useState(false);

    const presets = [
        { label: '1 min', seconds: 60 },
        { label: '2 min', seconds: 120 },
        { label: '5 min', seconds: 300 },
        { label: '10 min', seconds: 600 },
        { label: '15 min', seconds: 900 },
        { label: 'No limit', seconds: null }
    ];

    const handleCustomSubmit = () => {
        const minutes = parseFloat(customMinutes);
        if (minutes >= 0.5) { // Minimum 30 seconds
            onSelect(Math.floor(minutes * 60));
            setShowCustom(false);
            setCustomMinutes('');
        }
    };

    return (
        <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-300">
                ⏱️ Time Control (per player)
            </label>

            {/* Preset buttons */}
            <div className="grid grid-cols-3 gap-2">
                {presets.map((preset) => (
                    <button
                        key={preset.label}
                        onClick={() => onSelect(preset.seconds)}
                        className={`py-2 px-3 rounded-lg font-semibold text-sm transition-all ${selectedTime === preset.seconds
                                ? 'bg-orange-600 text-white shadow-lg'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>

            {/* Custom time input */}
            <div>
                {!showCustom ? (
                    <button
                        onClick={() => setShowCustom(true)}
                        className="text-sm text-orange-400 hover:text-orange-300 underline"
                    >
                        + Custom time
                    </button>
                ) : (
                    <div className="flex gap-2 items-center">
                        <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={customMinutes}
                            onChange={(e) => setCustomMinutes(e.target.value)}
                            placeholder="Minutes"
                            className="flex-1 bg-slate-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button
                            onClick={handleCustomSubmit}
                            className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg font-semibold"
                        >
                            Set
                        </button>
                        <button
                            onClick={() => {
                                setShowCustom(false);
                                setCustomMinutes('');
                            }}
                            className="text-slate-400 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>
                )}
            </div>

            {/* Display selected time */}
            {selectedTime !== null && selectedTime !== undefined && (
                <div className="text-sm text-slate-400">
                    Selected: <span className="text-orange-400 font-bold">
                        {selectedTime === null ? 'No limit' : `${Math.floor(selectedTime / 60)}:${String(selectedTime % 60).padStart(2, '0')}`}
                    </span> per player
                </div>
            )}
        </div>
    );
}
