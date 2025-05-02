import React, { useMemo, useState } from 'react';

// --- Data Structure for Techniques ---
interface TechniqueInfo {
    id: string;
    title: string;
    type: 'Warmup' | 'Bending' | 'Vibrato' | 'General'; // Add more types as needed
    description: React.ReactNode; // Allow JSX for richer descriptions (lists, links etc.)
}

// --- Placeholder Technique Data ---
// This data can be expanded significantly or moved to a separate file later.
const techniqueData: TechniqueInfo[] = [
    {
        id: 'finger-stretch',
        title: 'Finger Stretches',
        type: 'Warmup',
        description: (
            <>
                <p className="mb-2">Gentle stretches to prepare your fingers and wrists.</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    <li>Extend fingers wide, then make a fist. Repeat 5-10 times.</li>
                    <li>Gently bend wrist up and down, then side to side. Hold each stretch briefly.</li>
                    <li>Massage the base of your thumb and palm.</li>
                    <li><strong>Important:</strong> Stretches should be gentle, never painful. Stop if you feel any sharp pain.</li>
                </ul>
            </>
        )
    },
    {
        id: 'chromatic-exercise',
        title: 'Chromatic Exercise (1-2-3-4)',
        type: 'Warmup',
        description: (
            <>
                <p className="mb-2">A common exercise to improve finger dexterity and synchronization across strings. Use a metronome at a slow, comfortable tempo initially.</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                    <li>Start on the low E string, 1st fret with your index finger.</li>
                    <li>Play frets 1-2-3-4 using index, middle, ring, and pinky fingers respectively (one finger per fret).</li>
                    <li>Move to the A string and repeat frets 1-2-3-4.</li>
                    <li>Continue across all strings up to the high E string.</li>
                    <li>Shift up one fret (start on 2nd fret) and repeat the pattern across all strings.</li>
                    <li>Continue shifting up the neck (e.g., up to the 5th or 7th fret).</li>
                    <li>Reverse the pattern: Play 4-3-2-1 on each string, descending the neck.</li>
                    <li>Focus on clean notes, even timing, and minimal finger movement.</li>
                </ol>
            </>
        )
    },
    {
        id: 'string-bending',
        title: 'String Bending Basics',
        type: 'Bending',
        description: (
            <>
                <p className="mb-2">Bending allows you to raise the pitch of a note by pushing the string sideways across the fretboard.</p>
                <h4 className="font-semibold mt-3 mb-1 text-sm">Key Points:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    <li>Typically use your ring finger to fret the note, supported by your index and middle fingers behind it for strength.</li>
                    <li>Pivot from your wrist and use the combined strength of your fingers to push the string upwards (towards the ceiling for lower strings, downwards for higher strings often feels more natural).</li>
                    <li>Aim for a target pitch (e.g., a half step / 1 fret, or a whole step / 2 frets higher).</li>
                    <li>Practice hitting the target pitch accurately. Use a tuner or reference pitch initially.</li>
                    <li>Start with bends on the G, B, and high E strings where they are generally easier.</li>
                    <li>Example: Bend the 7th fret on the G string (D note) up a whole step to match the pitch of the 9th fret (E note).</li>
                </ul>
            </>
        )
    },
    {
        id: 'vibrato-basics',
        title: 'Vibrato Basics',
        type: 'Vibrato',
        description: (
            <>
                <p className="mb-2">Vibrato adds expression by creating a slight, rapid fluctuation in the pitch of a held note.</p>
                 <h4 className="font-semibold mt-3 mb-1 text-sm">Common Techniques:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                    <li><strong>Wrist Vibrato (Classical Style):</strong> Keep fingertip relatively stable on the fret, oscillate the pitch by moving your wrist back and forth parallel to the string. Subtle effect.</li>
                    <li><strong>Finger/Bending Vibrato (Rock/Blues Style):</strong> Fret the note and perform very small, rapid bends and releases by rotating your wrist/forearm slightly. More pronounced effect.</li>
                    <li>Start slowly and focus on controlling the width (how far the pitch changes) and speed (how fast it oscillates).</li>
                    <li>Listen to players you admire to understand different vibrato styles.</li>
                    <li>Practice on different strings and frets. Ensure the note sustains clearly while applying vibrato.</li>
                </ul>
            </>
        )
    },
];


const TechniqueTrainer: React.FC = () => {
    // --- State ---
    const [selectedTechniqueId, setSelectedTechniqueId] = useState<string | null>(techniqueData[0]?.id ?? null); // Select the first technique by default

    // --- Derived State ---
    const selectedTechnique = useMemo(() => {
        return techniqueData.find(tech => tech.id === selectedTechniqueId);
    }, [selectedTechniqueId]);

    // --- Render Logic ---
    return (
        <div className="p-4 md:p-6 flex flex-col md:flex-row gap-6">
            {/* Sidebar/List of Techniques */}
            <aside className="w-full md:w-1/4 lg:w-1/5 flex-shrink-0">
                <h2 className="text-lg font-semibold mb-3 text-gray-700 border-b pb-2">Techniques</h2>
                <nav className="space-y-1">
                    {techniqueData.map(tech => (
                        <button
                            key={tech.id}
                            onClick={() => setSelectedTechniqueId(tech.id)}
                            className={`block w-full text-left px-3 py-2 rounded transition duration-150 ease-in-out text-sm ${
                                selectedTechniqueId === tech.id
                                ? 'bg-blue-500 text-white font-medium shadow-sm'
                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                        >
                            {tech.title} <span className="text-xs opacity-70">({tech.type})</span>
                        </button>
                    ))}
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 bg-white p-4 rounded-lg shadow">
                {selectedTechnique ? (
                    <article>
                        <h1 className="text-2xl font-bold mb-2 text-gray-800">{selectedTechnique.title}</h1>
                        <p className="text-sm font-medium text-blue-600 mb-4">Type: {selectedTechnique.type}</p>
                        <div className="prose prose-sm max-w-none"> {/* Use Tailwind typography plugin styles */}
                           {selectedTechnique.description}
                        </div>
                         <p className="text-xs text-gray-500 mt-6 italic">
                            Remember to use the Metronome in the header for timed practice!
                        </p>
                    </article>
                ) : (
                    <p className="text-gray-500">Select a technique from the list to view details.</p>
                )}
            </main>
        </div>
    );
};

export default TechniqueTrainer;
