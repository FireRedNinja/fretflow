import { NOTES } from "./musicUtils";

interface Interval {
  name: string;
  shortName: string;
  semitones: number;
}

const INTERVALS: { [key: string]: Interval } = {
  P1: { name: "Perfect Unison", shortName: "P1", semitones: 0 },
  m2: { name: "Minor Second", shortName: "m2", semitones: 1 },
  M2: { name: "Major Second", shortName: "M2", semitones: 2 },
  m3: { name: "Minor Third", shortName: "m3", semitones: 3 },
  M3: { name: "Major Third", shortName: "M3", semitones: 4 },
  P4: { name: "Perfect Fourth", shortName: "P4", semitones: 5 },
  TT: { name: "Tritone", shortName: "TT", semitones: 6 },
  P5: { name: "Perfect Fifth", shortName: "P5", semitones: 7 },
  m6: { name: "Minor Sixth", shortName: "m6", semitones: 8 },
  M6: { name: "Major Sixth", shortName: "M6", semitones: 9 },
  m7: { name: "Minor Seventh", shortName: "m7", semitones: 10 },
  M7: { name: "Major Seventh", shortName: "M7", semitones: 11 },
  P8: { name: "Perfect Octave", shortName: "P8", semitones: 12 },
};


const INTERVAL_LIST = Object.values(INTERVALS);

const getNoteFromInterval = (rootNote: string, interval: Interval): string | null => {
  const upperCaseRoot = rootNote.toUpperCase();
  const rootIndex = NOTES.indexOf(upperCaseRoot);

  if (rootIndex === -1) {
    console.error(`Invalid root note: ${rootNote}`);
    return null; // Invalid root note
  }

  const targetIndex = (rootIndex + interval.semitones) % NOTES.length;
  return NOTES[targetIndex];
};

const getIntervalBetweenNotes = (note1: string, note2: string): Interval | null => {
  const upperCaseNote1 = note1.toUpperCase();
  const upperCaseNote2 = note2.toUpperCase();

  const index1 = NOTES.indexOf(upperCaseNote1);
  const index2 = NOTES.indexOf(upperCaseNote2);

  if (index1 === -1 || index2 === -1) {
    console.error(`Invalid notes: ${note1}, ${note2}`);
    return null; // Invalid notes
  }

  const semitones = (index2 - index1 + NOTES.length) % NOTES.length;

  const foundInterval = INTERVAL_LIST.find(interval => interval.semitones === semitones);

  return foundInterval || null; // Return the found interval or null if not found
}


export {
  INTERVALS,
  INTERVAL_LIST,
  getNoteFromInterval,
  getIntervalBetweenNotes
}
export type { Interval };
