import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Fretboard, { HighlightedNote } from './Fretboard';
import { NOTES, STANDARD_TUNING, getNoteAtFret } from '../utils/musicUtils';
import { SCALE_FORMULAS, getScaleNotes } from '../utils/scaleUtils'; // Import scale utilities

// --- Types ---

// Settings specific to the Scale Trainer
interface ScaleTrainerSettings {
    rootNote: string;
    scaleKey: string; // Key from SCALE_FORMULAS (e.g., 'naturalMinor')
    // TODO: Add position/area constraints?
}

const ScaleTrainer: React.FC = () => {
    // --- State ---
    const [highlightedNotes, setHighlightedNotes] = useState<HighlightedNote[]>([]);
    const [settingsError, setSettingsError] = useState<string>('');

    // --- Settings State ---
    const [settings, setSettings] = useState<ScaleTrainerSettings>({
        rootNote: 'A', // Default root
        scaleKey: 'naturalMinor', // Default scale (matches user context A minor)
    });
    // Temporary state for settings panel changes before applying
    const [tempSettings, setTempSettings] = useState<ScaleTrainerSettings>(settings);

    // --- Constants ---
    const visualTuning = useMemo(() => STANDARD_TUNING.slice().reverse(), []); // EBGDAE visually
    const maxFrets = 12; // How many frets to display/calculate for

    // --- Calculation Logic ---

    /**
     * Calculates all positions of the notes in the selected scale across the fretboard.
     */
    const calculateScalePositions = useCallback((): HighlightedNote[] => {
        const formula = SCALE_FORMULAS[settings.scaleKey];
        if (!formula) {
            setSettingsError(`Invalid scale selected: ${settings.scaleKey}`);
            return [];
        }

        const scaleNotes = getScaleNotes(settings.rootNote, formula);
        if (!scaleNotes) {
            setSettingsError(`Could not calculate notes for ${settings.rootNote} ${formula.name}.`);
            return [];
        }

        const positions: HighlightedNote[] = [];
        const scaleNoteSet = new Set(scaleNotes); // Efficient lookup

        for (let s = 0; s < visualTuning.length; s++) {
            for (let f = 0; f <= maxFrets; f++) {
                const logicalStringIndex = (STANDARD_TUNING.length - 1) - s;
                const currentNote = getNoteAtFret(STANDARD_TUNING[logicalStringIndex], f);

                if (currentNote && scaleNoteSet.has(currentNote)) {
                    // Highlight root notes differently
                    const isRoot = currentNote === settings.rootNote;
                    positions.push({
                        string: s,
                        fret: f,
                        label: currentNote,
                        // Use 'color' property
                        color: isRoot ? 'bg-red-500' : 'bg-blue-400',
                    });
                }
            }
        }
        return positions;

    }, [settings, visualTuning]); // Depends on current settings

    // --- Settings Handlers ---
    const handleRootNoteChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setTempSettings(prev => ({ ...prev, rootNote: event.target.value }));
        setSettingsError('');
    };

    const handleScaleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setTempSettings(prev => ({ ...prev, scaleKey: event.target.value }));
        setSettingsError('');
    };

    const applySettings = () => {
        // Basic validation
        if (!NOTES.includes(tempSettings.rootNote)) {
            setSettingsError("Invalid root note selected."); return;
        }
        if (!SCALE_FORMULAS[tempSettings.scaleKey]) {
            setSettingsError("Invalid scale selected."); return;
        }

        setSettings(tempSettings);
        setSettingsError('');
        // No quiz state/score reset needed for visualization mode
    };

    // --- Effects ---
    // Recalculate highlights whenever applied settings change
    useEffect(() => {
        setHighlightedNotes(calculateScalePositions());
    }, [settings, calculateScalePositions]);


    // --- Render Logic ---
    return (
        <div className="p-4 md:p-6">
            <h1 className="text-2xl font-bold mb-4 text-gray-800">Scale Visualizer</h1>

            {/* Settings Panel */}
            {/* Using basic div instead of details for always-visible settings */}
            <div className="bg-gray-100 border border-gray-300 rounded-lg mb-6 shadow p-4 space-y-4 md:space-y-0 md:flex md:justify-between md:items-center">
                 <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
                    {/* Root Note Selection */}
                    <div>
                        <label htmlFor="scale-root-note" className="block text-sm font-medium text-gray-700 mb-1">Root Note:</label>
                        <select
                            id="scale-root-note"
                            value={tempSettings.rootNote}
                            onChange={handleRootNoteChange}
                            className="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm"
                        >
                            {NOTES.map(note => (
                                <option key={note} value={note}>{note}</option>
                            ))}
                        </select>
                    </div>

                    {/* Scale Type Selection */}
                     <div>
                        <label htmlFor="scale-type" className="block text-sm font-medium text-gray-700 mb-1">Scale:</label>
                        <select
                            id="scale-type"
                            value={tempSettings.scaleKey}
                            onChange={handleScaleChange}
                             className="p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 shadow-sm text-sm"
                        >
                            {Object.entries(SCALE_FORMULAS).map(([key, formula]) => (
                                <option key={key} value={key}>{formula.name}</option>
                            ))}
                        </select>
                    </div>
                 </div>


                {/* Apply Button & Error Message */}
                <div className="text-right space-y-1 md:space-y-0 md:flex md:items-center md:space-x-3">
                    {settingsError && <p className="text-red-600 text-sm text-left md:text-right">{settingsError}</p>}
                    <button
                        onClick={applySettings}
                        className="py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-150 ease-in-out shadow text-sm font-medium"
                    >
                        Show Scale
                    </button>
                </div>
            </div>

            {/* Fretboard Display Area */}
            <div className="bg-white p-4 rounded-lg shadow min-h-[200px]">
                 <p className="text-lg font-semibold mb-3 text-gray-700">
                    {`${settings.rootNote} ${SCALE_FORMULAS[settings.scaleKey]?.name || 'Scale'}`}
                 </p>
                <Fretboard
                    highlightedNotes={highlightedNotes}
                    fretCount={maxFrets}
                    tuning={visualTuning}
                    // No click handler needed for visualization mode
                />
            </div>

            {/* Placeholder for future practice modes */}
            {/* <div className="mt-6"> ... Practice Mode UI ... </div> */}

        </div>
    );
};

export default ScaleTrainer;
