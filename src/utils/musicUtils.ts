/**
 * Defines the standard musical notes using sharps.
 * Could be expanded later to include flats or handle enharmonic equivalents.
 */
const NOTES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B'
]

/**
 * Standard tuning for a 6-string guitar from low E to high E.
 * Each element represents the open string note.
 */
const STANDARD_TUNING = [
  'E', // 6th string (low E)
  'A', // 5th string
  'D', // 4th string
  'G', // 3rd string
  'B', // 2nd string
  'E'  // 1st string (high E)
]


/**
 * Calculates the note name for a specific fret on a given string.
 */
const getNoteAtFret = (openStringNote: string, fretNumber: number): string => {
  // Find the index of the open string note in the NOTES array
  const startIndex = NOTES.indexOf(openStringNote)
  if (startIndex === -1) {
    console.error(`Invalid open string note: ${openStringNote}`)
    return '';
  }

  // Calculate the index of the note at the given fret
  // Add the fret number to the start index and wrap around using modulo
  const noteIndex = (startIndex + fretNumber) % NOTES.length;

  return NOTES[noteIndex];
}

/**
 * Generates the notes for the entire fretboard based on tuning and fret count.
 * Useful for pre-calculating or displaying all notes.
 */
const generateFretboardNotes = (tuning: string[], fretCount: number): string[][] => {
  return tuning.map(openNote => {
    const stringNotes = [];
    for (let fret = 0; fret <= fretCount; fret++) {
      stringNotes.push(getNoteAtFret(openNote, fret));
    }
    return stringNotes;
  });
}

export {
  NOTES,
  STANDARD_TUNING,
  getNoteAtFret,
  generateFretboardNotes
}
