// src/components/FretboardTrainer.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Fretboard, { NotePosition, HighlightedNote } from './Fretboard'; // Import the Fretboard component and types
import { NOTES, STANDARD_TUNING, getNoteAtFret } from '../utils/musicUtils'; // Import music utilities

// --- Types ---

// Define the structure for a quiz question (adapts based on mode)
interface QuizQuestion {
  mode: TrainerMode;
  // For 'identify' mode
  position?: NotePosition; // The position highlighted
  correctNote?: string | null; // The note name at the position
  // For 'find' mode
  targetNote?: string; // The note name the user needs to find
}

// Define possible states for the quiz component
type QuizState = 'idle' | 'settings' | 'question' | 'answered';

// Define the practice modes
type TrainerMode = 'identify' | 'find';

// Define types for settings
type NoteTypeSetting = 'all' | 'natural';
interface TrainerSettings {
    strings: boolean[]; // Array representing selected status for each string (index 0 = high E visual)
    fretRange: { min: number; max: number };
    noteType: NoteTypeSetting;
}

const FretboardTrainer: React.FC = () => {
  // --- State Variables ---
  const [mode, setMode] = useState<TrainerMode>('identify'); // Default mode
  const [quizState, setQuizState] = useState<QuizState>('settings'); // Start in settings mode
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
  const [feedback, setFeedback] = useState<string>('');
  const [score, setScore] = useState<number>(0);
  const [questionsAsked, setQuestionsAsked] = useState<number>(0);
  const [highlightedNotes, setHighlightedNotes] = useState<HighlightedNote[]>([]);

  // --- Settings State ---
  const [settings, setSettings] = useState<TrainerSettings>({
    strings: Array(STANDARD_TUNING.length).fill(true),
    fretRange: { min: 0, max: 12 },
    noteType: 'all',
  });
  const [tempSettings, setTempSettings] = useState<TrainerSettings>(settings);
  const [settingsError, setSettingsError] = useState<string>('');


  // --- Constants ---
  const visualTuning = useMemo(() => STANDARD_TUNING.slice().reverse(), []); // EBGDAE visually (high to low)
  const maxFrets = 12; // Maximum fret number allowed in settings


  // --- Helper Functions ---

  /** Generates a random integer between min (inclusive) and max (inclusive) */
  const getRandomInt = (min: number, max: number): number => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  /** Selects a random valid note position based on the CURRENT settings */
  const getRandomNotePosition = useCallback((): NotePosition | null => {
    // Filter available visual string indices based on settings
    const availableVisualStrings = settings.strings
        .map((isSelected, index) => isSelected ? index : -1)
        .filter(index => index !== -1);

    if (availableVisualStrings.length === 0) {
        console.error("No strings selected in settings.");
        setSettingsError("Please select at least one string.");
        return null;
    }

    let attempts = 0;
    while (attempts < 100) { // Limit attempts
        const randomVisualStringIndex = availableVisualStrings[getRandomInt(0, availableVisualStrings.length - 1)];
        const randomFret = getRandomInt(settings.fretRange.min, settings.fretRange.max);

        const logicalStringIndex = (STANDARD_TUNING.length - 1) - randomVisualStringIndex;
        const noteName = getNoteAtFret(STANDARD_TUNING[logicalStringIndex], randomFret);

        if (!noteName) {
            attempts++;
            continue;
        }

        if (settings.noteType === 'natural' && noteName.includes('#')) {
            attempts++;
            continue;
        }

        return { string: randomVisualStringIndex, fret: randomFret };
    }

    console.error("Could not find a valid note position within the current settings after 100 attempts.");
    setSettingsError("Could not generate a question with the current settings. Try broadening the range or note types.");
    return null;
  }, [settings]); // Depends on the current applied settings

  /** Generates the next quiz question based on the current mode */
  const generateQuestion = useCallback(() => {
    setSettingsError(''); // Clear previous settings errors
    const position = getRandomNotePosition(); // Find a valid position first
    if (!position) {
        setQuizState('settings'); // Go back to settings if position gen fails
        return;
    }

    // Get the note name at this valid position
    const logicalStringIndex = (STANDARD_TUNING.length - 1) - position.string;
    const noteName = getNoteAtFret(STANDARD_TUNING[logicalStringIndex], position.fret);

    if (!noteName) {
        setFeedback("Error calculating note name. Please check configuration.");
        setQuizState('settings');
        return;
    }

    let newQuestion: QuizQuestion;
    if (mode === 'identify') {
        newQuestion = {
            mode: 'identify',
            position: position,
            correctNote: noteName,
        };
        // Highlight the note to be identified
        setHighlightedNotes([{ string: position.string, fret: position.fret, color: 'bg-yellow-400' }]);
    } else { // mode === 'find'
        newQuestion = {
            mode: 'find',
            targetNote: noteName, // Ask the user to find this note
        };
        // Clear previous highlights for 'find' mode
        setHighlightedNotes([]);
    }

    setCurrentQuestion(newQuestion);
    setFeedback('');
    setQuizState('question'); // Move to question state
  }, [getRandomNotePosition, mode]); // Dependencies include mode now


  /** Handles the user's answer selection in 'identify' mode */
  const handleIdentifyAnswer = (selectedNote: string) => {
    if (!currentQuestion || currentQuestion.mode !== 'identify' || !currentQuestion.position || !currentQuestion.correctNote) return;

    setQuestionsAsked(prev => prev + 1);
    const isCorrect = selectedNote === currentQuestion.correctNote;

    if (isCorrect) {
      setFeedback('Correct!');
      setScore(prev => prev + 1);
      setHighlightedNotes([{ ...currentQuestion.position, color: 'bg-green-500', label: currentQuestion.correctNote }]);
    } else {
      setFeedback(`Incorrect. The note was ${currentQuestion.correctNote}.`);
      setHighlightedNotes([
           { ...currentQuestion.position, color: 'bg-red-500', label: currentQuestion.correctNote },
       ]);
    }
    setQuizState('answered');
  };

  /** Handles the user clicking on the fretboard in 'find' mode */
  const handleFretClick = (clickedPosition: NotePosition) => {
      if (quizState !== 'question' || !currentQuestion || currentQuestion.mode !== 'find' || !currentQuestion.targetNote) {
          return; // Only process clicks during the 'find' question state
      }

      // Check if the clicked position is within the allowed settings range
      if (
          !settings.strings[clickedPosition.string] ||
          clickedPosition.fret < settings.fretRange.min ||
          clickedPosition.fret > settings.fretRange.max
      ) {
          setFeedback("Clicked outside the current practice area.");
          // Optionally add a temporary visual indicator for the invalid click
          setHighlightedNotes(prev => [...prev, { ...clickedPosition, colour: 'bg-gray-400', label: 'X' }]);
          // Remove the indicator after a short delay
          setTimeout(() => setHighlightedNotes(prev => prev.filter(n => !(n.string === clickedPosition.string && n.fret === clickedPosition.fret && n.color === 'bg-gray-400'))), 1000);
          return; // Ignore click outside the set range/strings
      }


      // Get the note name at the clicked position
      const logicalStringIndex = (STANDARD_TUNING.length - 1) - clickedPosition.string;
      const clickedNoteName = getNoteAtFret(STANDARD_TUNING[logicalStringIndex], clickedPosition.fret);

      if (!clickedNoteName) return; // Should not happen with valid input

       setQuestionsAsked(prev => prev + 1);
      const isCorrect = clickedNoteName === currentQuestion.targetNote;

      if (isCorrect) {
          setFeedback('Correct!');
          setScore(prev => prev + 1);
          // Highlight the correctly clicked note
          setHighlightedNotes([{ ...clickedPosition, color: 'bg-green-500', label: clickedNoteName }]);
      } else {
          setFeedback(`Incorrect. That was ${clickedNoteName}. Try finding ${currentQuestion.targetNote}.`);
          // Highlight the incorrectly clicked note
          setHighlightedNotes([{ ...clickedPosition, color: 'bg-red-500', label: clickedNoteName }]);
          // Optional: Highlight all correct locations after a wrong answer? Could be complex.
      }
      setQuizState('answered');
  };


  // --- Settings Handlers (No changes needed from previous version) ---

  const handleStringToggle = (index: number) => {
      setTempSettings(prev => {
          const newStrings = [...prev.strings];
          newStrings[index] = !newStrings[index];
          return { ...prev, strings: newStrings };
      });
      setSettingsError('');
  };

  const handleFretRangeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target;
      const numValue = parseInt(value, 10);
      if (isNaN(numValue) || numValue < 0 || numValue > maxFrets) return;
      setTempSettings(prev => {
          const newRange = { ...prev.fretRange, [name]: numValue };
          if (name === 'min' && numValue > newRange.max) newRange.max = numValue;
          if (name === 'max' && numValue < newRange.min) newRange.min = numValue;
          return { ...prev, fretRange: newRange };
      });
      setSettingsError('');
  };

  const handleNoteTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setTempSettings(prev => ({
          ...prev,
          noteType: event.target.value as NoteTypeSetting
      }));
      setSettingsError('');
  };

  const applySettings = () => {
      const selectedStringsCount = tempSettings.strings.filter(Boolean).length;
      if (selectedStringsCount === 0) {
          setSettingsError("Please select at least one string.");
          return;
      }
      if (tempSettings.fretRange.min > tempSettings.fretRange.max) {
          setSettingsError("Minimum fret cannot be greater than maximum fret.");
          return;
      }
      setSettings(tempSettings);
      setScore(0);
      setQuestionsAsked(0);
      setFeedback('');
      setCurrentQuestion(null);
      setHighlightedNotes([]);
      setSettingsError('');
      setQuizState('idle'); // Trigger question generation
  };

  // --- Effects ---
  // Generate question when moving from idle/settings
  useEffect(() => {
    if (quizState === 'idle') {
       generateQuestion();
    }
  }, [quizState, generateQuestion]);

  // --- Render Logic ---

  const answerOptions = NOTES; // Used only for 'identify' mode

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-1 text-gray-800">Fretboard Trainer</h1>

      {/* Mode Selection */}
      <div className="mb-4 border-b border-gray-300 pb-2">
          <label className="block font-medium mb-1 text-sm text-gray-600">Mode:</label>
          <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                      type="radio"
                      name="mode"
                      value="identify"
                      checked={mode === 'identify'}
                      onChange={() => setMode('identify')}
                      className="text-blue-600 focus:ring-blue-500"
                      disabled={quizState !== 'settings'} // Disable mode change during quiz
                  />
                  <span>Identify Note</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                      type="radio"
                      name="mode"
                      value="find"
                      checked={mode === 'find'}
                      onChange={() => setMode('find')}
                      className="text-blue-600 focus:ring-blue-500"
                      disabled={quizState !== 'settings'} // Disable mode change during quiz
                  />
                  <span>Find Note</span>
              </label>
          </div>
      </div>


      {/* Settings Panel */}
      <details className="bg-gray-100 border border-gray-300 rounded-lg mb-6 shadow" open={quizState === 'settings'}>
          <summary className="p-3 font-semibold cursor-pointer hover:bg-gray-200 rounded-t-lg">Practice Settings</summary>
          <div className="p-4 border-t border-gray-300 space-y-4">
              {/* String Selection */}
              <div>
                  <label className="block font-medium mb-2 text-gray-700">Strings:</label>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {visualTuning.map((noteName, index) => (
                          <label key={index} className="flex items-center space-x-2 cursor-pointer">
                              <input
                                  type="checkbox"
                                  checked={tempSettings.strings[index]}
                                  onChange={() => handleStringToggle(index)}
                                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                              />
                              <span>{noteName}</span>
                          </label>
                      ))}
                  </div>
              </div>
              {/* Fret Range */}
              <div>
                  <label className="block font-medium mb-2 text-gray-700">Fret Range:</label>
                  <div className="flex items-center space-x-3">
                      <input type="number" name="min" value={tempSettings.fretRange.min} onChange={handleFretRangeChange} min="0" max={maxFrets} className="w-16 p-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" aria-label="Minimum Fret"/>
                      <span>to</span>
                      <input type="number" name="max" value={tempSettings.fretRange.max} onChange={handleFretRangeChange} min="0" max={maxFrets} className="w-16 p-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500" aria-label="Maximum Fret"/>
                  </div>
              </div>
              {/* Note Types */}
              <div>
                  <label className="block font-medium mb-2 text-gray-700">Note Types:</label>
                  <div className="flex items-center space-x-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                          <input type="radio" name="noteType" value="all" checked={tempSettings.noteType === 'all'} onChange={handleNoteTypeChange} className="text-blue-600 focus:ring-blue-500"/>
                          <span>All (Naturals & Sharps)</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                          <input type="radio" name="noteType" value="natural" checked={tempSettings.noteType === 'natural'} onChange={handleNoteTypeChange} className="text-blue-600 focus:ring-blue-500"/>
                          <span>Naturals Only</span>
                      </label>
                  </div>
              </div>
              {/* Apply Button & Error Message */}
              <div className="pt-3 text-right">
                   {settingsError && <p className="text-red-600 text-sm mb-2 text-left">{settingsError}</p>}
                  <button onClick={applySettings} className="py-2 px-5 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 transition duration-150 ease-in-out shadow">
                      Apply Settings & Start
                  </button>
              </div>
          </div>
      </details>


      {/* Quiz Area (Show only when not in settings mode) */}
      {quizState !== 'settings' && (
          <>
            <div className="bg-white p-4 rounded-lg shadow mb-6 min-h-[200px]"> {/* Added min-height */}
                {quizState === 'idle' && <p className="text-gray-600">Loading question...</p>}

                {currentQuestion && (quizState === 'question' || quizState === 'answered') && (
                <>
                    {/* Prompt varies based on mode */}
                    <p className="text-lg font-semibold mb-3 text-gray-700">
                        {currentQuestion.mode === 'identify'
                            ? 'Identify the highlighted note:'
                            : `Find the note: ${currentQuestion.targetNote || '...'}`
                        }
                    </p>
                    {/* Fretboard Display - Pass click handler */}
                    <Fretboard
                        highlightedNotes={highlightedNotes}
                        fretCount={settings.fretRange.max > 12 ? settings.fretRange.max : 12}
                        tuning={visualTuning}
                        // Only attach click handler if in 'find' mode and question is active
                        onFretClick={
                            (quizState === 'question' && currentQuestion?.mode === 'find')
                            ? handleFretClick
                            : undefined // Pass undefined if not applicable
                        }
                    />
                </>
                )}
            </div>

            {/* Answer Buttons (Only for 'identify' mode) */}
            {quizState === 'question' && currentQuestion?.mode === 'identify' && (
                <div className="mb-6">
                    <p className="text-md mb-2 text-gray-600">Select the correct note:</p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {answerOptions.map(note => (
                        <button
                            key={note}
                            onClick={() => handleIdentifyAnswer(note)}
                            className="py-2 px-3 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 transition duration-150 ease-in-out shadow"
                        >
                            {note}
                        </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Feedback and Next Question Area */}
            {(quizState === 'answered') && (
                <div className="bg-gray-50 p-4 rounded-lg shadow mb-6 text-center">
                    <p className={`text-xl font-bold mb-3 ${feedback.includes('Correct') ? 'text-green-600' : 'text-red-600'}`}>
                        {feedback}
                    </p>
                    <button
                        onClick={generateQuestion} // Always generates based on current mode
                        className="py-2 px-5 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition duration-150 ease-in-out shadow"
                    >
                        Next Question
                    </button>
                </div>
            )}

            {/* Score Display */}
            <div className="text-right text-gray-600">
                <p>Score: {score} / {questionsAsked}</p>
            </div>
          </>
      )}

    </div>
  );
};

export default FretboardTrainer;
