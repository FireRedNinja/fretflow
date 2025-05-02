import { INTERVALS, getNoteFromInterval } from './intervalUtils';
import { NOTES } from './musicUtils';

/** Represents a scale type with its formula (intervals from the root) */
export interface ScaleFormula {
  name: string;              // Full name (e.g., "Major Scale")
  intervals: string[];       // Array of interval short names (keys from INTERVALS) relative to the root (e.g., ["P1", "M2", "M3", "P4", "P5", "M6", "M7"])
}

/**
 * A dictionary of common scale formulas.
 * Keys are simple identifiers.
 * Includes Major, Natural Minor, and common Pentatonic scales.
 */
export const SCALE_FORMULAS: { [key: string]: ScaleFormula } = {
  major: {
    name: "Major Scale",
    intervals: ["P1", "M2", "M3", "P4", "P5", "M6", "M7"],
  },
  naturalMinor: {
    name: "Natural Minor Scale",
    intervals: ["P1", "M2", "m3", "P4", "P5", "m6", "m7"],
  },
  harmonicMinor: {
    name: "Harmonic Minor Scale",
    intervals: ["P1", "M2", "m3", "P4", "P5", "m6", "M7"], // Raised 7th
  },
  melodicMinorAsc: {
    name: "Melodic Minor (Ascending)", // Often different descending
    intervals: ["P1", "M2", "m3", "P4", "P5", "M6", "M7"], // Raised 6th and 7th
  },
  majorPentatonic: {
      name: "Major Pentatonic Scale",
      intervals: ["P1", "M2", "M3", "P5", "M6"],
  },
  minorPentatonic: {
      name: "Minor Pentatonic Scale",
      intervals: ["P1", "m3", "P4", "P5", "m7"],
  },
  blues: {
      name: "Blues Scale",
      intervals: ["P1", "m3", "P4", "TT", "P5", "m7"], // Minor pentatonic + flat 5th (Tritone)
  },
  // --- TODO: Add Modes (Dorian, Phrygian, etc.) ---
};

// Convert SCALE_FORMULAS object to an array for easier iteration/selection
export const SCALE_FORMULA_LIST: ScaleFormula[] = Object.values(SCALE_FORMULAS);

/**
 * Calculates the notes in a specific scale based on a root note and formula.
 *
 * @param rootNote - The root note name (e.g., 'A', 'C#').
 * @param formula - The ScaleFormula object defining the scale type.
 * @returns An array of note names in the scale, or null if the root note or formula is invalid.
 */
export const getScaleNotes = (rootNote: string, formula: ScaleFormula): string[] | null => {
  const upperCaseRoot = rootNote.toUpperCase();
  const rootIndex = NOTES.indexOf(upperCaseRoot);

  if (rootIndex === -1) {
    console.error(`Invalid root note for scale: ${rootNote}`);
    return null;
  }

  const scaleNotes: string[] = [];
  for (const intervalKey of formula.intervals) {
    const interval = INTERVALS[intervalKey];
    if (!interval) {
      console.error(`Invalid interval key '${intervalKey}' in scale formula '${formula.name}'`);
      return null; // Or handle more gracefully
    }
    const note = getNoteFromInterval(upperCaseRoot, interval);
    if (note) {
      scaleNotes.push(note);
    } else {
      console.error(`Failed to calculate note for interval ${intervalKey} from root ${rootNote}`);
      return null;
    }
  }

  return scaleNotes;
};
