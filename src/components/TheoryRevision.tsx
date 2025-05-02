// src/components/TheoryRevision.tsx
import React, { useState, useEffect, useCallback, } from 'react';
import { CHORD_QUALITIES, CHORD_QUALITY_LIST, } from '../utils/chordUtils'; // Import chord utilities

// --- Types ---

type TheoryQuizState = 'idle' | 'settings' | 'question' | 'answered';

// Settings specific to the Theory Revision Quiz
interface TheoryQuizSettings {
    enabledQualities: string[]; // Array of chord quality keys (e.g., ['major', 'minor7'])
}

// Structure for a theory quiz question
interface TheoryQuizQuestion {
    qualityKey: string;          // Key of the correct chord quality (e.g., 'minor7')
    symbolToShow: string;        // The abbreviation/symbol displayed (e.g., 'm7', '-', '°')
    correctAnswer: string;     // The full name of the correct quality (e.g., "Minor Seventh")
    answerOptions: string[];     // Array of multiple-choice full names
}

const TheoryRevision: React.FC = () => {
    // --- State ---
    const [quizState, setQuizState] = useState<TheoryQuizState>('settings');
    const [currentQuestion, setCurrentQuestion] = useState<TheoryQuizQuestion | null>(null);
    const [feedback, setFeedback] = useState<string>('');
    const [score, setScore] = useState<number>(0);
    const [questionsAsked, setQuestionsAsked] = useState<number>(0);

    // --- Settings State ---
    const defaultQualities = [
        'major', 'minor', 'diminished', 'augmented',
        'major7', 'minor7', 'dominant7', 'minor7flat5', 'diminished7'
    ];
    const [settings, setSettings] = useState<TheoryQuizSettings>({
        enabledQualities: defaultQualities,
    });
    const [tempSettings, setTempSettings] = useState<TheoryQuizSettings>(settings);
    const [settingsError, setSettingsError] = useState<string>('');

    // --- Helper Functions ---
    const getRandomElement = <T,>(arr: T[]): T | undefined => {
        if (arr.length === 0) return undefined;
        return arr[Math.floor(Math.random() * arr.length)];
    };

    /** Generates the next theory quiz question */
    const generateQuestion = useCallback(() => {
        setSettingsError('');
        if (settings.enabledQualities.length === 0) {
            setSettingsError("Please select at least one chord quality to practice.");
            setQuizState('settings');
            return;
        }

        const randomQualityKey = getRandomElement(settings.enabledQualities);
        const correctQuality = randomQualityKey ? CHORD_QUALITIES[randomQualityKey] : undefined;

        if (!correctQuality || !randomQualityKey) {
            setSettingsError("Failed to select a random chord quality.");
            setQuizState('settings');
            return;
        }

        // --- MODIFIED: Randomly select a non-empty abbreviation ---
        let symbolToShow: string | undefined;
        const availableAbbr = correctQuality.abbr.filter(abbr => abbr !== ""); // Filter out empty strings often used for major
        if (availableAbbr.length > 0) {
            symbolToShow = getRandomElement(availableAbbr);
        }
        // Fallback if only "" was present or something went wrong
        if (!symbolToShow) {
             symbolToShow = correctQuality.abbr[0] ?? '?'; // Use the first one (even if empty) or '?'
        }
        // --- END MODIFICATION ---

        const correctAnswer = correctQuality.name;

        // Generate distractor answers
        const distractors = CHORD_QUALITY_LIST
            .filter(q => q.name !== correctAnswer && settings.enabledQualities.includes(Object.keys(CHORD_QUALITIES).find(key => CHORD_QUALITIES[key] === q) ?? ''))
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(q => q.name);

        const finalOptionsSet = new Set([correctAnswer, ...distractors]);
        while (finalOptionsSet.size < 4 && finalOptionsSet.size < CHORD_QUALITY_LIST.length) {
             const randomDistractor = getRandomElement(CHORD_QUALITY_LIST);
             if (randomDistractor && randomDistractor.name !== correctAnswer) {
                 finalOptionsSet.add(randomDistractor.name);
             }
        }
        const answerOptions = Array.from(finalOptionsSet).sort(() => 0.5 - Math.random());

        setCurrentQuestion({
            qualityKey: randomQualityKey,
            symbolToShow: symbolToShow, // Use the potentially randomized symbol
            correctAnswer: correctAnswer,
            answerOptions: answerOptions,
        });
        setFeedback('');
        setQuizState('question');

    }, [settings]);

    /** Handles the user's answer selection */
    const handleAnswer = (selectedName: string) => {
        if (quizState !== 'question' || !currentQuestion) return;

        setQuestionsAsked(prev => prev + 1);
        const isCorrect = selectedName === currentQuestion.correctAnswer;

        if (isCorrect) {
            setFeedback('Correct!');
            setScore(prev => prev + 1);
        } else {
            // Use the symbol that was actually shown in the feedback
            setFeedback(`Incorrect. "${currentQuestion.symbolToShow || '(maj)'}" represents "${currentQuestion.correctAnswer}".`);
        }
        setQuizState('answered');
    };

    // --- Settings Handlers ---
     const handleQualityToggle = (qualityKey: string) => {
        setTempSettings(prev => {
            const currentQualities = new Set(prev.enabledQualities);
            if (currentQualities.has(qualityKey)) {
                currentQualities.delete(qualityKey);
            } else {
                currentQualities.add(qualityKey);
            }
            return { ...prev, enabledQualities: Array.from(currentQualities) };
        });
        setSettingsError('');
    };

    const applySettings = () => {
        if (tempSettings.enabledQualities.length === 0) {
            setSettingsError("Please select at least one chord quality."); return;
        }
        setSettings(tempSettings);
        setScore(0); setQuestionsAsked(0); setFeedback(''); setCurrentQuestion(null); setSettingsError('');
        setQuizState('idle');
    };

    // --- Effects ---
    useEffect(() => {
        if (quizState === 'idle') {
            generateQuestion();
        }
    }, [quizState, generateQuestion]);

    // --- Render Logic ---
    return (
        <div className="p-4 md:p-6">
            <h1 className="text-2xl font-bold mb-4 text-gray-800">Theory Revision: Chord Notation</h1>

            {/* Settings Panel */}
            <details className="bg-gray-100 border border-gray-300 rounded-lg mb-6 shadow" open={quizState === 'settings'}>
                <summary className="p-3 font-semibold cursor-pointer hover:bg-gray-200 rounded-t-lg">Quiz Settings</summary>
                <div className="p-4 border-t border-gray-300 space-y-4">
                    {/* Chord Quality Selection */}
                    <fieldset className="border border-gray-300 p-3 rounded">
                        <legend className="text-md font-medium px-1 text-gray-700">Include Chord Qualities:</legend>
                         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 mt-1">
                            {Object.entries(CHORD_QUALITIES).sort(([,a],[,b]) => a.name.localeCompare(b.name)).map(([key, quality]) => (
                                <label key={key} className="flex items-center space-x-1 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        value={key}
                                        checked={tempSettings.enabledQualities.includes(key)}
                                        onChange={() => handleQualityToggle(key)}
                                        className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                                    />
                                    {/* Show name and ALL abbreviations */}
                                    <span className="text-sm">{`${quality.name} (${quality.abbr.join('/') || 'maj'})`}</span>
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    {/* Apply Button & Error Message */}
                    <div className="pt-3 text-right">
                        {settingsError && <p className="text-red-600 text-sm mb-2 text-left">{settingsError}</p>}
                        <button onClick={applySettings} className="py-2 px-5 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 transition duration-150 ease-in-out shadow">
                            Apply Settings & Start Quiz
                        </button>
                    </div>
                </div>
            </details>

            {/* Quiz Area */}
            {quizState !== 'settings' && currentQuestion && (
                <div className="bg-white p-4 md:p-6 rounded-lg shadow mb-6">
                     {quizState === 'idle' && <p className="text-gray-600">Loading question...</p>}
                     {(quizState === 'question' || quizState === 'answered') && (
                         <>
                            <p className="text-lg font-semibold mb-3 text-gray-700">What does this chord symbol represent?</p>
                            {/* Display the Chord Symbol */}
                            <div className="my-4 p-4 bg-blue-100 border border-blue-300 rounded text-center">
                                <span className="text-3xl md:text-4xl font-mono font-bold text-blue-800">
                                    {/* Display root C as example, symbol only matters. Handle empty string for major. */}
                                    C{currentQuestion.symbolToShow || ''}
                                </span>
                            </div>
                         </>
                     )}

                    {/* Answer Buttons (Show only when question is active) */}
                    {quizState === 'question' && (
                        <div className="mt-4">
                            <p className="text-md mb-2 text-gray-600">Select the correct name:</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {currentQuestion.answerOptions.map(name => (
                                <button
                                    key={name}
                                    onClick={() => handleAnswer(name)}
                                    className="w-full text-left py-2 px-4 bg-sky-500 text-white rounded hover:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-300 transition duration-150 ease-in-out shadow"
                                >
                                    {name}
                                </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}


            {/* Feedback and Next Question Area */}
            {(quizState === 'answered') && (
                <div className="bg-gray-50 p-4 rounded-lg shadow mb-6 text-center">
                    <p className={`text-xl font-bold mb-3 ${feedback.includes('Correct') ? 'text-green-600' : 'text-red-600'}`}>
                        {feedback}
                    </p>
                    <button onClick={generateQuestion} className="py-2 px-5 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition duration-150 ease-in-out shadow">
                        Next Question
                    </button>
                </div>
            )}

            {/* Score Display */}
            {quizState !== 'settings' && (
                <div className="text-right text-gray-600">
                    <p>Score: {score} / {questionsAsked}</p>
                </div>
            )}
        </div>
    );
};

export default TheoryRevision;
