// src/utils/chordUtils.ts
import { INTERVALS, getNoteFromInterval } from './intervalUtils';
import { NOTES, STANDARD_TUNING, getNoteAtFret } from './musicUtils'; // Import STANDARD_TUNING

/** Represents a chord type with its formula (intervals) */
export interface ChordQuality {
  name: string;
  abbr: string[];
  intervals: string[];
}

/** Represents a specific chord instance with root and quality */
export interface Chord {
    rootNote: string;
    quality: ChordQuality;
    notes: string[]; // Basic notes in root position order based on formula
}

/** Represents a specific voicing of a chord */
export interface ChordVoicing {
    chord: Chord;
    voicingName: string;
    notesInVoicing: string[];
    // TODO: Add string/fret positions? This gets complex quickly.
}

/** Enum for Triad Inversions */
export enum TriadInversion {
    ROOT = 0,
    FIRST = 1,
    SECOND = 2,
}

/** Enum for Drop Voicings (can be expanded) */
export enum DropVoicingType {
    DROP_2 = "Drop 2",
    DROP_3 = "Drop 3",
}

// Type combining different voicing specifications
export type VoicingType = TriadInversion | DropVoicingType | 'Root Position';

/** Represents a specific note position on the fretboard */
// Duplicating from Fretboard component for util independence, consider centralizing types later
export interface NotePosition {
  string: number; // Index of the string (visual index: 0=HighE, 5=LowE)
  fret: number;   // Fret number
}

/**
 * A dictionary of common chord qualities defined by their intervals relative to the root.
 */
export const CHORD_QUALITIES: { [key: string]: ChordQuality } = {
  // --- Triads ---
  major: { name: "Major Triad", abbr: ["", "maj", "M"], intervals: ["P1", "M3", "P5"] },
  minor: { name: "Minor Triad", abbr: ["m", "min", "-"], intervals: ["P1", "m3", "P5"] },
  diminished: { name: "Diminished Triad", abbr: ["dim", "°"], intervals: ["P1", "m3", "TT"] }, // TT used for dim5
  augmented: { name: "Augmented Triad", abbr: ["aug", "+"], intervals: ["P1", "M3", "m6"] }, // m6 used for aug5

  // --- Seventh Chords ---
  major7: { name: "Major Seventh", abbr: ["maj7", "M7", "Δ"], intervals: ["P1", "M3", "P5", "M7"] },
  minor7: { name: "Minor Seventh", abbr: ["m7", "min7", "-7"], intervals: ["P1", "m3", "P5", "m7"] },
  dominant7: { name: "Dominant Seventh", abbr: ["7", "dom7"], intervals: ["P1", "M3", "P5", "m7"] },
  minor7flat5: { name: "Minor Seventh Flat Five", abbr: ["m7b5", "ø", "ø7"], intervals: ["P1", "m3", "TT", "m7"] }, // Half-diminished
  diminished7: { name: "Diminished Seventh", abbr: ["dim7", "°7"], intervals: ["P1", "m3", "TT", "M6"] }, // M6 used for dim7 (6 semitones above m3)

  // --- Suspended Chords ---
  sus4: { name: "Suspended Fourth", abbr: ["sus4", "sus"], intervals: ["P1", "P4", "P5"] },
  sus2: { name: "Suspended Second", abbr: ["sus2"], intervals: ["P1", "M2", "P5"] },
};

// Convert CHORD_QUALITIES object to an array for easier iteration/selection
export const CHORD_QUALITY_LIST: ChordQuality[] = Object.values(CHORD_QUALITIES);

/**
 * Calculates the notes in a specific chord in root position order.
 */
export const getChord = (rootNote: string, quality: ChordQuality): Chord | null => {
  const upperCaseRoot = rootNote.toUpperCase();
  const rootIndex = NOTES.indexOf(upperCaseRoot);
  if (rootIndex === -1) { console.error(`Invalid root note: ${rootNote}`); return null; }

  const chordNotes: string[] = [];
  for (const intervalKey of quality.intervals) {
    const interval = INTERVALS[intervalKey];
    if (!interval) { console.error(`Invalid interval key '${intervalKey}'`); return null; }
    const note = getNoteFromInterval(upperCaseRoot, interval);
    if (note) { chordNotes.push(note); }
    else { console.error(`Failed calc for interval ${intervalKey}`); return null; }
  }
  return { rootNote: upperCaseRoot, quality: quality, notes: chordNotes };
};

/**
 * Calculates the conceptual order of notes for a specific triad inversion.
 */
export const getTriadInversionNotes = (chord: Chord, inversion: TriadInversion): string[] | null => {
    if (chord.notes.length !== 3) { return null; }
    const [root, third, fifth] = chord.notes;
    switch (inversion) {
        case TriadInversion.ROOT: return [root, third, fifth];
        case TriadInversion.FIRST: return [third, fifth, root];
        case TriadInversion.SECOND: return [fifth, root, third];
        default: return null;
    }
};

/**
 * Calculates the conceptual order of notes for a Drop 2 voicing of a 7th chord.
 */
export const getDrop2VoicingNotes = (chord: Chord): string[] | null => {
    if (chord.notes.length !== 4) { return null; }
    const [root, third, fifth, seventh] = chord.notes;
    return [fifth, root, third, seventh]; // 5(low), R, 3, 7
};

/**
 * Calculates the conceptual order of notes for a Drop 3 voicing of a 7th chord.
 */
export const getDrop3VoicingNotes = (chord: Chord): string[] | null => {
     if (chord.notes.length !== 4) { return null; }
    const [root, third, fifth, seventh] = chord.notes;
    return [third, root, fifth, seventh]; // 3(low), R, 5, 7
};

/**
 * Generates a display name for a chord, potentially including inversion.
 */
export const getChordDisplayName = (rootNote: string, quality: ChordQuality, inversion?: TriadInversion): string => {
    const baseAbbr = quality.abbr[0] ?? '';
    const baseName = `${rootNote}${baseAbbr}`;
    if (inversion === undefined || inversion === TriadInversion.ROOT) { return baseName; }
    const chord = getChord(rootNote, quality);
    if (!chord || chord.notes.length !== 3) return baseName;
    let bassNote: string | undefined;
    if (inversion === TriadInversion.FIRST) bassNote = chord.notes[1];
    else if (inversion === TriadInversion.SECOND) bassNote = chord.notes[2];
    return bassNote ? `${baseName}/${bassNote}` : baseName;
};

// --- Voicing Finding Logic ---

/**
 * Helper to get the absolute pitch value (MIDI note number) for a fretboard position.
 * Assumes standard tuning base E2 (MIDI 40).
 * @param stringIndexVisual Visual string index (0=High E, 5=Low E)
 * @param fret Fret number
 * @returns MIDI note number
 */
const getAbsolutePitch = (stringIndexVisual: number, fret: number): number => {
    // MIDI note numbers for standard tuning open strings (E2, A2, D3, G3, B3, E4)
    const openStringMidi: { [key: number]: number } = {
        5: 40, // Low E (Visual Index 5)
        4: 45, // A
        3: 50, // D
        2: 55, // G
        1: 59, // B
        0: 64  // High E (Visual Index 0)
    };
    const baseMidi = openStringMidi[stringIndexVisual];
    if (baseMidi === undefined) {
        console.error("Invalid visual string index for absolute pitch:", stringIndexVisual);
        return -1; // Error indicator
    }
    return baseMidi + fret;
};


/**
 * Finds the lowest possible fret positions for a given chord voicing on a specific set of strings.
 *
 * @param chord The base Chord object.
 * @param voicingType The desired voicing (TriadInversion, DropVoicingType, or 'Root Position').
 * @param stringSetVisualIndices Array of visual string indices (e.g., [0, 1, 2] for 321). Must match number of notes in voicing.
 * @param maxSearchFret The highest fret to search on any string. Defaults to 12.
 * @returns An array of NotePosition objects representing the found voicing, or null if no playable voicing is found.
 */
export const findVoicingOnStrings = (
    chord: Chord,
    voicingType: VoicingType,
    stringSetVisualIndices: number[],
    maxSearchFret: number = 12
): NotePosition[] | null => {

    let targetNotesInOrder: string[] | null = null;
    let numNotesExpected: number = 0;

    // 1. Determine the target notes in the correct conceptual order based on voicingType
    if (voicingType === TriadInversion.ROOT || voicingType === TriadInversion.FIRST || voicingType === TriadInversion.SECOND) {
        targetNotesInOrder = getTriadInversionNotes(chord, voicingType);
        numNotesExpected = 3;
    } else if (voicingType === DropVoicingType.DROP_2) {
        targetNotesInOrder = getDrop2VoicingNotes(chord);
        numNotesExpected = 4;
    } else if (voicingType === DropVoicingType.DROP_3) {
        targetNotesInOrder = getDrop3VoicingNotes(chord);
        numNotesExpected = 4;
    } else if (voicingType === 'Root Position') {
        targetNotesInOrder = chord.notes; // Use the base notes from getChord
        numNotesExpected = chord.notes.length;
    } else {
        console.error("Unsupported voicing type for findVoicingOnStrings:", voicingType);
        return null;
    }

    if (!targetNotesInOrder) {
        // console.warn(`Could not get notes for voicing ${voicingType} of ${getChordDisplayName(chord.rootNote, chord.quality)}`);
        return null; // Voicing type might not be applicable (e.g., inversion on 7th chord)
    }

    // 2. Validate input sizes
    if (targetNotesInOrder.length !== numNotesExpected) {
        console.error(`Expected ${numNotesExpected} notes for voicing ${voicingType}, but got ${targetNotesInOrder.length}`);
        return null;
    }
    if (stringSetVisualIndices.length !== numNotesExpected) {
         console.warn(`Number of strings (${stringSetVisualIndices.length}) does not match number of notes (${numNotesExpected}) for voicing ${voicingType}. Cannot map directly.`);
         return null; // Cannot map notes 1-to-1 on strings
    }

    // Sort string set indices from lowest pitch string (highest index) to highest pitch string (lowest index)
    // This matches the order we want to place notes (lowest conceptual note on lowest string)
    const sortedStringSet = [...stringSetVisualIndices].sort((a, b) => b - a);


    // 3. Iterate through possible starting frets for the lowest note
    for (let startFret = 0; startFret <= maxSearchFret; startFret++) {
        const lowestStringIndex = sortedStringSet[0]; // e.g., index 4 for GDA set [2,3,4] -> sorted [4,3,2]
        const lowestTargetNote = targetNotesInOrder[0];

        // Check if the note at the starting position matches the lowest target note
        const logicalLowestStringIndex = (STANDARD_TUNING.length - 1) - lowestStringIndex;
        const noteAtStartPos = getNoteAtFret(STANDARD_TUNING[logicalLowestStringIndex], startFret);

        if (noteAtStartPos !== lowestTargetNote) {
            continue; // This starting fret doesn't work for the lowest note
        }

        // If lowest note matches, try to find the rest
        const potentialPositions: NotePosition[] = [{ string: lowestStringIndex, fret: startFret }];
        let possible = true;
        let previousNoteAbsPitch = getAbsolutePitch(lowestStringIndex, startFret);

        // 4. Iterate through the remaining notes and strings
        for (let i = 1; i < numNotesExpected; i++) {
            const currentTargetNote = targetNotesInOrder[i];
            const currentStringIndex = sortedStringSet[i]; // Next higher string
            const logicalCurrentStringIndex = (STANDARD_TUNING.length - 1) - currentStringIndex;
            let foundCurrentNote = false;

            // Search for the currentTargetNote on the currentStringIndex
            // Start searching from a fret that ensures the pitch is higher than the previous note
            for (let currentFret = 0; currentFret <= maxSearchFret; currentFret++) {
                const noteAtCurrentPos = getNoteAtFret(STANDARD_TUNING[logicalCurrentStringIndex], currentFret);

                if (noteAtCurrentPos === currentTargetNote) {
                    // Check if pitch is strictly higher than the previous note found
                    const currentNoteAbsPitch = getAbsolutePitch(currentStringIndex, currentFret);
                    if (currentNoteAbsPitch > previousNoteAbsPitch) {
                        potentialPositions.push({ string: currentStringIndex, fret: currentFret });
                        previousNoteAbsPitch = currentNoteAbsPitch; // Update for next comparison
                        foundCurrentNote = true;
                        break; // Found the lowest possible fret for this note, move to the next note/string
                    }
                    // If note matches but pitch isn't higher, continue searching on higher frets of this string
                }
            }

            if (!foundCurrentNote) {
                possible = false; // Couldn't find a suitable position for this note
                break; // Stop trying for this startFret
            }
        }

        // 5. If all notes were placed successfully
        if (possible) {
            // Reverse the positions array to match visual order (high E string first) if needed by Fretboard component
             return potentialPositions.sort((a, b) => a.string - b.string);
            // return potentialPositions; // Or return in low-to-high string order
        }
    }

    // 6. If loop finishes, no voicing found
    // console.warn(`Could not find playable voicing for ${getChordDisplayName(chord.rootNote, chord.quality)} (${voicingType}) on strings ${stringSetVisualIndices}`);
    return null;
};
