// src/components/IntervalTrainer.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Fretboard, { NotePosition, HighlightedNote } from './Fretboard';
import { STANDARD_TUNING, getNoteAtFret } from '../utils/musicUtils';
import { INTERVALS, INTERVAL_LIST, Interval, getNoteFromInterval, getIntervalBetweenNotes } from '../utils/intervalUtils'; // Import interval utilities

// --- Types ---

type IntervalTrainerMode = 'find' | 'identify';
type IntervalQuizState = 'idle' | 'settings' | 'question' | 'answered';

// Define constraint types
type TargetConstraint = 'any' | 'sameString' | 'nextStringUp' | 'nextStringDown'; // Removed 'specificString' for simplicity for now

// Settings specific to the Interval Trainer
interface IntervalTrainerSettings {
    rootStrings: boolean[]; // Which strings can the root note be on (visual indices)
    rootFretRange: { min: number; max: number };
    intervals: string[]; // Array of interval short names
    targetConstraint: TargetConstraint; // Where the interval note should appear relative to root
}

// Structure for an interval quiz question
interface IntervalQuizQuestion {
    mode: IntervalTrainerMode;
    rootPosition: NotePosition; // Visual position of the root note
    rootNote: string;
    targetInterval: Interval;
    correctNoteName?: string | null; // For 'find' mode
    intervalNotePosition?: NotePosition; // For 'identify' mode
    answerOptions?: string[]; // For 'identify' mode
}


const IntervalTrainer: React.FC = () => {
    // --- State ---
    const [mode, setMode] = useState<IntervalTrainerMode>('find');
    const [quizState, setQuizState] = useState<IntervalQuizState>('settings');
    const [currentQuestion, setCurrentQuestion] = useState<IntervalQuizQuestion | null>(null);
    const [feedback, setFeedback] = useState<string>('');
    const [score, setScore] = useState<number>(0);
    const [questionsAsked, setQuestionsAsked] = useState<number>(0);
    const [highlightedNotes, setHighlightedNotes] = useState<HighlightedNote[]>([]);

    // --- Settings State ---
    const defaultIntervals = ['M3', 'P4', 'P5', 'm3', 'M7', 'm7'];
    const [settings, setSettings] = useState<IntervalTrainerSettings>({
        rootStrings: Array(STANDARD_TUNING.length).fill(true),
        rootFretRange: { min: 0, max: 7 },
        intervals: defaultIntervals,
        targetConstraint: 'any', // Default constraint
    });
    const [tempSettings, setTempSettings] = useState<IntervalTrainerSettings>(settings);
    const [settingsError, setSettingsError] = useState<string>('');

    // --- Constants ---
    const visualTuning = useMemo(() => STANDARD_TUNING.slice().reverse(), []);
    const maxFrets = 12;
    const numStrings = STANDARD_TUNING.length;

    // --- Helper Functions ---
    const getRandomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
    const getRandomElement = <T,>(arr: T[]): T | undefined => { if (arr.length === 0) return undefined; return arr[Math.floor(Math.random() * arr.length)]; };

    /** Selects a random valid ROOT note position based on the interval settings */
    const getRandomRootPosition = useCallback((): NotePosition | null => { /* ... same as before ... */
        const availableRootVisualStrings = settings.rootStrings.map((isSelected, index) => isSelected ? index : -1).filter(index => index !== -1);
        if (availableRootVisualStrings.length === 0) { setSettingsError("Please select at least one string for the root note."); return null; }
        let attempts = 0;
        while (attempts < 50) {
            attempts++;
            const randomVisualStringIndex = availableRootVisualStrings[getRandomInt(0, availableRootVisualStrings.length - 1)];
            const randomFret = getRandomInt(settings.rootFretRange.min, settings.rootFretRange.max);
            // Basic check for constraints: ensure a target string exists if needed
            if (settings.targetConstraint === 'nextStringUp' && randomVisualStringIndex === 0) continue; // Cannot go up from high E
            if (settings.targetConstraint === 'nextStringDown' && randomVisualStringIndex === numStrings - 1) continue; // Cannot go down from low E

            const rootLogicalStringIndex = (numStrings - 1) - randomVisualStringIndex;
            const rootNote = getNoteAtFret(STANDARD_TUNING[rootLogicalStringIndex], randomFret); if (!rootNote) { continue; }
            const maxSemitones = Math.max(0, ...settings.intervals.map(key => INTERVALS[key]?.semitones ?? 0));
            if (randomFret > maxFrets - 3 && maxSemitones > 3) { continue; } // Heuristic check
            return { string: randomVisualStringIndex, fret: randomFret };
        }
        setSettingsError("Could not find a suitable root note position. Try adjusting settings."); return null;
     }, [settings, numStrings]); // Added numStrings dependency

    /** Finds a position for the second note (interval note) respecting constraints */
    const findIntervalNotePosition = (rootPos: NotePosition, targetNoteName: string, constraint: TargetConstraint): NotePosition | null => {
        let possibleStrings: number[] = [];

        // Determine which strings to search based on constraint
        switch (constraint) {
            case 'sameString':
                possibleStrings = [rootPos.string];
                break;
            case 'nextStringUp': // Higher pitch string (lower visual index)
                if (rootPos.string > 0) possibleStrings = [rootPos.string - 1];
                break;
            case 'nextStringDown': // Lower pitch string (higher visual index)
                if (rootPos.string < numStrings - 1) possibleStrings = [rootPos.string + 1];
                break;
            case 'any':
            default:
                // Search all strings allowed for root notes (could be refined)
                possibleStrings = settings.rootStrings.map((isSelected, index) => isSelected ? index : -1).filter(index => index !== -1);
                break;
        }

        if (possibleStrings.length === 0) return null; // No valid string to search

        // Search for the target note on the possible strings
        for (const visualStringIndex of possibleStrings) {
            const logicalStringIndex = (numStrings - 1) - visualStringIndex;
            for (let fret = 0; fret <= maxFrets; fret++) {
                // Avoid selecting the exact same position as the root
                if (visualStringIndex === rootPos.string && fret === rootPos.fret) continue;

                const currentNote = getNoteAtFret(STANDARD_TUNING[logicalStringIndex], fret);
                if (currentNote === targetNoteName) {
                    return { string: visualStringIndex, fret: fret }; // Found the first occurrence
                }
            }
        }

        // console.warn(`Could not find position for interval note ${targetNoteName} with constraint ${constraint}`);
        return null; // Could not find the note within limits and constraints
    };


    /** Generates the next interval quiz question */
    const generateQuestion = useCallback(() => {
        setSettingsError('');
        if (settings.intervals.length === 0) { setSettingsError("Please select at least one interval."); setQuizState('settings'); return; }

        let questionGenerated = false;
        let generationAttempts = 0;

        while (!questionGenerated && generationAttempts < 50) { // Retry loop to find valid question under constraints
            generationAttempts++;
            const rootPosition = getRandomRootPosition();
            if (!rootPosition) { setQuizState('settings'); return; } // Error handled in getRandomRootPosition

            const rootLogicalStringIndex = (numStrings - 1) - rootPosition.string;
            const rootNote = getNoteAtFret(STANDARD_TUNING[rootLogicalStringIndex], rootPosition.fret);
            if (!rootNote) { console.error("Failed to calculate root note in generateQuestion."); continue; } // Should not happen

            const randomIntervalKey = getRandomElement(settings.intervals);
            const targetInterval = randomIntervalKey ? INTERVALS[randomIntervalKey] : undefined;
            if (!targetInterval || !randomIntervalKey) { console.error("Invalid interval key selected."); continue; }

            const correctNoteName = getNoteFromInterval(rootNote, targetInterval);
            if (!correctNoteName) { console.error("Failed to calculate target note."); continue; }

            let newQuestion: IntervalQuizQuestion | null = null;

            if (mode === 'find') {
                // For 'find' mode, we don't need to pre-calculate the position,
                // the constraint is checked when the user clicks.
                newQuestion = {
                    mode: 'find', rootPosition: rootPosition, rootNote: rootNote,
                    targetInterval: targetInterval, correctNoteName: correctNoteName,
                };
                setHighlightedNotes([{ ...rootPosition, color: 'bg-blue-500', label: rootNote }]);
                questionGenerated = true; // Assume a valid question can be asked

            } else { // mode === 'identify'
                // Find a position for the interval note *respecting the constraint*
                const intervalNotePosition = findIntervalNotePosition(rootPosition, correctNoteName, settings.targetConstraint);

                if (!intervalNotePosition) {
                    // If no position found with constraint, retry with different root/interval
                    continue;
                }

                // Generate answer options
                const correctAnswerShortName = targetInterval.shortName;
                const distractors = INTERVAL_LIST.filter(int => int.shortName !== correctAnswerShortName && settings.intervals.includes(int.shortName)).sort(() => 0.5 - Math.random()).slice(0, 3).map(int => int.shortName);
                const finalOptionsSet = new Set([correctAnswerShortName, ...distractors]);
                while (finalOptionsSet.size < 4 && finalOptionsSet.size < settings.intervals.length) { const rdk = getRandomElement(settings.intervals); if (rdk && rdk !== correctAnswerShortName) { finalOptionsSet.add(rdk); } else if (finalOptionsSet.size < INTERVAL_LIST.length) { const rd = getRandomElement(INTERVAL_LIST); if(rd && rd.shortName !== correctAnswerShortName) { finalOptionsSet.add(rd.shortName); } } else { break; } }
                const answerOptions = Array.from(finalOptionsSet).sort(() => 0.5 - Math.random());

                newQuestion = {
                    mode: 'identify', rootPosition: rootPosition, rootNote: rootNote,
                    targetInterval: targetInterval, intervalNotePosition: intervalNotePosition,
                    answerOptions: answerOptions,
                };
                setHighlightedNotes([
                    { ...rootPosition, color: 'bg-blue-500', label: rootNote },
                    { ...intervalNotePosition, color: 'bg-yellow-400', label: getNoteAtFret(STANDARD_TUNING[(numStrings - 1) - intervalNotePosition.string], intervalNotePosition.fret) }
                ]);
                questionGenerated = true;
            }

            if (questionGenerated && newQuestion) {
                setCurrentQuestion(newQuestion);
                setFeedback('');
                setQuizState('question');
            }
        } // End while loop

        if (!questionGenerated) {
             setSettingsError(`Could not generate a valid question with the current constraints after ${generationAttempts} attempts. Try 'any' constraint or broader settings.`);
             setQuizState('settings');
        }

    }, [settings, mode, getRandomRootPosition, numStrings]); // Added numStrings


    /** Handles the user clicking on the fretboard in 'find' mode */
    const handleFretClick = (clickedPosition: NotePosition) => {
        if (quizState !== 'question' || !currentQuestion || currentQuestion.mode !== 'find' || !currentQuestion.correctNoteName || !currentQuestion.rootNote) { return; }

        // --- Constraint Check ---
        let constraintSatisfied = true;
        let constraintMsg = '';
        const rootPos = currentQuestion.rootPosition;
        const constraint = settings.targetConstraint; // Use applied setting

        if (constraint === 'sameString' && clickedPosition.string !== rootPos.string) {
            constraintSatisfied = false; constraintMsg = "Interval must be on the same string.";
        } else if (constraint === 'nextStringUp' && clickedPosition.string !== rootPos.string - 1) {
            constraintSatisfied = false; constraintMsg = "Interval must be on the next higher string.";
        } else if (constraint === 'nextStringDown' && clickedPosition.string !== rootPos.string + 1) {
            constraintSatisfied = false; constraintMsg = "Interval must be on the next lower string.";
        }

        if (!constraintSatisfied) {
            setFeedback(constraintMsg);
            // Optional: Add temporary visual indicator for invalid click location
            setHighlightedNotes(prev => [...prev, { ...clickedPosition, color: 'bg-gray-400', label: 'X' }]);
            setTimeout(() => setHighlightedNotes(prev => prev.filter(n => !(n.string === clickedPosition.string && n.fret === clickedPosition.fret && n.color === 'bg-gray-400'))), 1000);
            return; // Ignore click that violates constraint
        }
        // --- End Constraint Check ---


        const logicalStringIndex = (numStrings - 1) - clickedPosition.string;
        const clickedNoteName = getNoteAtFret(STANDARD_TUNING[logicalStringIndex], clickedPosition.fret);
        if (!clickedNoteName) return;

        setQuestionsAsked(prev => prev + 1);
        const isCorrect = clickedNoteName === currentQuestion.correctNoteName;
        const clickedInterval = getIntervalBetweenNotes(currentQuestion.rootNote, clickedNoteName);
        const highlightsToShow: HighlightedNote[] = [];
        highlightsToShow.push({ ...currentQuestion.rootPosition, color: 'bg-blue-300', label: currentQuestion.rootNote });

        if (isCorrect) {
            setFeedback(`Correct! That's ${currentQuestion.targetInterval.name} (${currentQuestion.targetInterval.shortName}).`);
            setScore(prev => prev + 1);
            highlightsToShow.push({ ...clickedPosition, color: 'bg-green-500', label: clickedNoteName });
        } else {
            const feedbackIntervalName = clickedInterval ? `${clickedInterval.name} (${clickedInterval.shortName})` : 'an unknown interval';
            setFeedback(`Incorrect. That was ${clickedNoteName} (${feedbackIntervalName}). The correct note was ${currentQuestion.correctNoteName} (${currentQuestion.targetInterval.shortName}).`);
            highlightsToShow.push({ ...clickedPosition, color: 'bg-red-500', label: clickedNoteName });
            // Show correct answers respecting constraint (if possible)
            const correctPos = findIntervalNotePosition(rootPos, currentQuestion.correctNoteName, constraint);
            if (correctPos && !(correctPos.string === clickedPosition.string && correctPos.fret === clickedPosition.fret)) {
                 highlightsToShow.push({ ...correctPos, color: 'bg-green-200 border border-green-600', label: currentQuestion.correctNoteName });
            } else if (constraint !== 'any') {
                 // If constraint was active and we didn't find the note, maybe show *any* correct position?
                 const anyCorrectPos = findIntervalNotePosition(rootPos, currentQuestion.correctNoteName, 'any');
                 if (anyCorrectPos && !(anyCorrectPos.string === clickedPosition.string && anyCorrectPos.fret === clickedPosition.fret)) {
                      highlightsToShow.push({ ...anyCorrectPos, color: 'bg-yellow-300 border border-yellow-600', label: currentQuestion.correctNoteName }); // Yellow indicates correct note, but maybe not where expected by constraint
                 }
            }
            // Could add logic here to show *all* correct positions if constraint is 'any'
        }
        setHighlightedNotes(highlightsToShow);
        setQuizState('answered');
    };

    /** Handles the user's answer selection in 'identify' mode */
    const handleIdentifyAnswer = (selectedIntervalShortName: string) => { /* ... same as before ... */ if (quizState !== 'question' || !currentQuestion || currentQuestion.mode !== 'identify' || !currentQuestion.intervalNotePosition) return; setQuestionsAsked(prev => prev + 1); const correctAnswerShortName = currentQuestion.targetInterval.shortName; const isCorrect = selectedIntervalShortName === correctAnswerShortName; if (isCorrect) { setFeedback('Correct!'); setScore(prev => prev + 1); setHighlightedNotes([ { ...currentQuestion.rootPosition, color: 'bg-green-500', label: currentQuestion.rootNote }, { ...currentQuestion.intervalNotePosition, color: 'bg-green-500', label: getNoteAtFret(STANDARD_TUNING[(numStrings - 1) - currentQuestion.intervalNotePosition.string], currentQuestion.intervalNotePosition.fret) } ]); } else { const correctIntervalName = currentQuestion.targetInterval.name; setFeedback(`Incorrect. The interval was ${correctIntervalName} (${correctAnswerShortName}).`); setHighlightedNotes([ { ...currentQuestion.rootPosition, color: 'bg-blue-500', label: currentQuestion.rootNote }, { ...currentQuestion.intervalNotePosition, color: 'bg-red-500', label: getNoteAtFret(STANDARD_TUNING[(numStrings - 1) - currentQuestion.intervalNotePosition.string], currentQuestion.intervalNotePosition.fret) } ]); } setQuizState('answered'); };


    // --- Settings Handlers ---
    const handleRootStringToggle = (index: number) => { /* ... */ setTempSettings(prev => { const n = [...prev.rootStrings]; n[index] = !n[index]; return { ...prev, rootStrings: n }; }); setSettingsError(''); };
    const handleRootFretRangeChange = (event: React.ChangeEvent<HTMLInputElement>) => { /* ... */ const { name, value } = event.target; const n = parseInt(value, 10); if (isNaN(n) || n < 0 || n > maxFrets) return; setTempSettings(prev => { const r = { ...prev.rootFretRange, [name]: n }; if (name === 'min' && n > r.max) r.max = n; if (name === 'max' && n < r.min) r.min = n; return { ...prev, rootFretRange: r }; }); setSettingsError(''); };
    const handleIntervalToggle = (intervalKey: string) => { /* ... */ setTempSettings(prev => { const s = new Set(prev.intervals); if (s.has(intervalKey)) s.delete(intervalKey); else s.add(intervalKey); const sorted = Array.from(s).sort((a, b) => (INTERVALS[a]?.semitones ?? 0) - (INTERVALS[b]?.semitones ?? 0)); return { ...prev, intervals: sorted }; }); setSettingsError(''); };
    // New handler for target constraint
    const handleTargetConstraintChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTempSettings(prev => ({
            ...prev,
            targetConstraint: event.target.value as TargetConstraint
        }));
        setSettingsError('');
    };
    const applySettings = () => { /* ... */ const rsc = tempSettings.rootStrings.filter(Boolean).length; if (rsc === 0) { setSettingsError("Select root string(s)."); return; } if (tempSettings.intervals.length === 0) { setSettingsError("Select interval(s)."); return; } if (tempSettings.rootFretRange.min > tempSettings.rootFretRange.max) { setSettingsError("Min root fret > Max root fret."); return; } setSettings(tempSettings); setScore(0); setQuestionsAsked(0); setFeedback(''); setCurrentQuestion(null); setHighlightedNotes([]); setSettingsError(''); setQuizState('idle'); };

    // --- Effects ---
    useEffect(() => { if (quizState === 'idle') { generateQuestion(); } }, [quizState, generateQuestion]);

    // --- Render Logic ---
    return (
        <div className="p-4 md:p-6">
            <h1 className="text-2xl font-bold mb-1 text-gray-800">Interval Trainer</h1>

            {/* Mode Selection */}
             <div className="mb-4 border-b border-gray-300 pb-2"> {/* ... Mode UI ... */} <label>Mode:</label> <div className="flex space-x-4"> <label> <input type="radio" name="interval_mode" value="find" checked={mode === 'find'} onChange={() => setMode('find')} disabled={quizState !== 'settings'}/> Find Note </label> <label> <input type="radio" name="interval_mode" value="identify" checked={mode === 'identify'} onChange={() => setMode('identify')} disabled={quizState !== 'settings'}/> Identify Name </label> </div> </div>

            {/* Settings Panel */}
            <details className="bg-gray-100 border border-gray-300 rounded-lg mb-6 shadow" open={quizState === 'settings'}>
                <summary className="p-3 font-semibold cursor-pointer hover:bg-gray-200 rounded-t-lg">Practice Settings</summary>
                <div className="p-4 border-t border-gray-300 space-y-4">
                    {/* Root Note Settings */}
                    <fieldset className="border p-3 rounded"> {/* ... Root Settings UI ... */} <legend>Root Note</legend> <div className="space-y-3 mt-1"> <div> <label>Allowed Strings:</label> <div className="flex flex-wrap gap-x-4 gap-y-1"> {visualTuning.map((noteName, index) => ( <label key={`root-str-${index}`}> <input type="checkbox" checked={tempSettings.rootStrings[index]} onChange={() => handleRootStringToggle(index)} /> <span className="text-sm">{noteName}</span> </label> ))} </div> </div> <div> <label>Fret Range:</label> <div className="flex items-center space-x-2"> <input type="number" name="min" value={tempSettings.rootFretRange.min} onChange={handleRootFretRangeChange} min="0" max={maxFrets} className="w-14 p-1 border rounded text-sm"/> to <input type="number" name="max" value={tempSettings.rootFretRange.max} onChange={handleRootFretRangeChange} min="0" max={maxFrets} className="w-14 p-1 border rounded text-sm"/> </div> </div> </div> </fieldset>
                    {/* Interval Selection */}
                    <fieldset className="border p-3 rounded"> {/* ... Interval Settings UI ... */} <legend>Intervals</legend> <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-1 mt-1"> {INTERVAL_LIST.sort((a, b) => a.semitones - b.semitones).map((interval) => ( <label key={interval.shortName}> <input type="checkbox" value={interval.shortName} checked={tempSettings.intervals.includes(interval.shortName)} onChange={() => handleIntervalToggle(interval.shortName)} /> <span className="text-sm">{`${interval.name} (${interval.shortName})`}</span> </label> ))} </div> </fieldset>

                    {/* Target Constraint Selection - UPDATED */}
                    <fieldset className="border border-gray-300 p-3 rounded">
                        <legend className="text-md font-medium px-1 text-gray-700">Interval Location Constraint</legend>
                         <div className="flex flex-wrap gap-x-4 gap-y-2 mt-1">
                             {(['any', 'sameString', 'nextStringUp', 'nextStringDown'] as TargetConstraint[]).map(constraint => (
                                <label key={constraint} className="flex items-center space-x-1 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="targetConstraint"
                                        value={constraint}
                                        checked={tempSettings.targetConstraint === constraint}
                                        onChange={handleTargetConstraintChange}
                                        className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                                    />
                                    <span className="text-sm">
                                        {constraint === 'any' ? 'Any String' :
                                         constraint === 'sameString' ? 'Same String Only' :
                                         constraint === 'nextStringUp' ? 'Next Higher String Only' :
                                         constraint === 'nextStringDown' ? 'Next Lower String Only' : constraint}
                                    </span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">"Higher" means lower index (e.g., G to B). "Lower" means higher index (e.g., D to A).</p>
                    </fieldset>

                    {/* Apply Button */}
                    <div className="pt-3 text-right"> {settingsError && <p className="text-red-600 text-sm mb-2 text-left">{settingsError}</p>} <button onClick={applySettings} className="py-2 px-5 bg-green-600 text-white rounded hover:bg-green-700 shadow"> Apply Settings & Start </button> </div>
                </div>
            </details>

            {/* Quiz Area */}
            {quizState !== 'settings' && ( /* ... Quiz Display UI ... */
                <>
                    <div className="bg-white p-4 rounded-lg shadow mb-6 min-h-[200px]">
                        {quizState === 'idle' && <p>Loading...</p>}
                        {currentQuestion && (quizState === 'question' || quizState === 'answered') && (
                            <>
                                <p className="text-lg font-semibold mb-3">
                                    {mode === 'find'
                                        ? `Find: ${currentQuestion.targetInterval?.name || '...'} (${currentQuestion.targetInterval?.shortName || '...'}) above ${currentQuestion.rootNote}` + (settings.targetConstraint !== 'any' ? ` (${settings.targetConstraint.replace('String', ' string')})` : '')
                                        : `Identify the interval from ${currentQuestion.rootNote} to ${getNoteAtFret(STANDARD_TUNING[(numStrings - 1) - (currentQuestion.intervalNotePosition?.string ?? 0)], currentQuestion.intervalNotePosition?.fret ?? 0)}:`
                                    }
                                </p>
                                <Fretboard highlightedNotes={highlightedNotes} fretCount={maxFrets} tuning={visualTuning} onFretClick={ (quizState === 'question' && mode === 'find') ? handleFretClick : undefined } />
                            </>
                        )}
                    </div>
                    {quizState === 'question' && mode === 'identify' && currentQuestion?.answerOptions && (
                         <div className="mb-6"> <p>Select interval name:</p> <div className="grid grid-cols-2 sm:grid-cols-4 gap-3"> {currentQuestion.answerOptions.map(shortName => { const interval = INTERVALS[shortName]; return ( <button key={shortName} onClick={() => handleIdentifyAnswer(shortName)} className="w-full text-left py-2 px-3 bg-sky-500 text-white rounded hover:bg-sky-600 shadow text-sm"> {interval ? `${interval.name} (${interval.shortName})` : shortName} </button> ); })} </div> </div>
                     )}
                    {(quizState === 'answered') && ( <div className="bg-gray-50 p-4 rounded-lg shadow mb-6 text-center"> <p className={`text-xl font-bold mb-3 ${feedback.includes('Correct') ? 'text-green-600' : 'text-red-600'}`}>{feedback}</p> <button onClick={generateQuestion} className="py-2 px-5 bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow"> Next Question </button> </div> )}
                    <div className="text-right text-gray-600"> <p>Score: {score} / {questionsAsked}</p> </div>
                </>
            )}
        </div>
    );
};

export default IntervalTrainer;
