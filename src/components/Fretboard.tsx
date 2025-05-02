// src/components/Fretboard.tsx
import React, { JSX } from 'react';
import { STANDARD_TUNING, getNoteAtFret } from '../utils/musicUtils'; // Import getNoteAtFret as well

// --- Type Definitions ---

/** Interface for specifying a note's position */
export interface NotePosition {
  string: number; // Index of the string (e.g., 0 for high E visually, 5 for low E visually)
  fret: number;   // Fret number (0 for open string)
}

/** Interface for highlighting a note on the fretboard */
export interface HighlightedNote extends NotePosition {
  color?: string; // Optional color for the highlight (Tailwind color class or hex)
  label?: string; // Optional text label for the note
}

/** Props for the Fretboard component */
interface FretboardProps {
  tuning?: string[];
  fretCount?: number;
  highlightedNotes?: HighlightedNote[];
  onFretClick?: (position: NotePosition) => void; // Callback function type
  showStringLabels?: boolean; // New prop to control label visibility
}

/**
 * A visual representation of a guitar fretboard using SVG.
 * Handles note highlighting and click events on fret positions.
 */
const Fretboard: React.FC<FretboardProps> = ({
  // Default tuning reversed for visual layout (low E string at the bottom visually)
  tuning = STANDARD_TUNING.slice().reverse(),
  fretCount = 12,
  highlightedNotes = [],
  onFretClick = () => {}, // No-op function by default
  showStringLabels = true, // Default to showing labels
}) => {
  const numStrings: number = tuning.length;

  // --- SVG Dimensions and Layout ---
  const fretWidth: number = 80;
  const stringSpacing: number = 30;
  // Adjusted left margin to accommodate string labels
  const fretboardMargin = { top: 30, right: 30, bottom: 30, left: 60 };
  const nutWidth: number = 10;
  const fretMarkerRadius: number = 5;
  const noteRadius: number = 12; // Radius for highlighted notes
  const clickableAreaRadius: number = 14; // Slightly larger for easier clicking
  const baseStringWidth: number = 1.5; // Starting thickness for the highest string (visual top)
  const stringWidthIncrement: number = 0.25; // How much thicker each lower string gets

  // Calculate total SVG dimensions
  const svgWidth: number = fretboardMargin.left + (fretCount * fretWidth) + fretboardMargin.right;
  const svgHeight: number = fretboardMargin.top + ((numStrings - 1) * stringSpacing) + fretboardMargin.bottom;

  // Fret marker positions
  const markerFrets: number[] = [3, 5, 7, 9]; // Single dots
  const doubleMarkerFret: number = 12; // Double dot fret

  // --- Helper Functions for Coordinates ---
  /** Calculates the Y coordinate for a given string index */
  const getStringY = (stringIndex: number): number => fretboardMargin.top + (stringIndex * stringSpacing);

  /** Calculates the X coordinate for the center of a fret (including open string) */
  const getNoteX = (fretIndex: number): number => {
    if (fretIndex === 0) {
        // Position open string notes slightly to the left of the nut
        return fretboardMargin.left - nutWidth - 15; // Adjusted for labels
    }
    // Center notes horizontally within the fret space
    return fretboardMargin.left + nutWidth + (fretIndex * fretWidth) - (fretWidth / 2);
  };

  /** Calculates the X coordinate for the fret line itself */
  const getFretLineX = (fretIndex: number): number => fretboardMargin.left + nutWidth + (fretIndex * fretWidth);


  // --- Generate SVG Elements ---

  // Frets (vertical lines)
  const fretLines: JSX.Element[] = [];
  // Nut (0th fret line)
  fretLines.push(
    <rect
      key="nut"
      x={fretboardMargin.left}
      y={fretboardMargin.top - 2} // Slightly above top string
      width={nutWidth}
      height={((numStrings - 1) * stringSpacing) + 4} // Slightly below bottom string
      fill="black" // Use black or a dark color for the nut
      rx={2} // Slightly rounded corners for the nut
      ry={2}
    />
  );
  // Regular frets
  for (let i = 1; i <= fretCount; i++) {
    const x = getFretLineX(i - 1); // Calculate X position for the line separating fret i-1 and i
    fretLines.push(
      <line
        key={`fret-${i}`}
        x1={x}
        y1={fretboardMargin.top}
        x2={x}
        y2={svgHeight - fretboardMargin.bottom}
        stroke="#9ca3af" // Tailwind gray-400 for fret lines
        strokeWidth={2} // Slightly thicker fret lines
      />
    );
  }

  // Strings (horizontal lines)
  const stringLines: JSX.Element[] = [];
  for (let i = 0; i < numStrings; i++) {
    const y = getStringY(i);
    // Increase strokeWidth for lower strings (higher index 'i' visually)
    const currentStringWidth = baseStringWidth + i * stringWidthIncrement;
    stringLines.push(
      <line
        key={`string-${i}`}
        x1={fretboardMargin.left} // Start from the nut edge
        y1={y}
        x2={getFretLineX(fretCount - 1)} // End at the last fret line
        y2={y}
        stroke="#4b5563" // Tailwind gray-600 for strings
        strokeWidth={currentStringWidth} // Apply calculated thickness
      />
    );
  }

  // String Labels (Open string notes)
  const stringLabelElements: JSX.Element[] = [];
  if (showStringLabels) {
      for (let i = 0; i < numStrings; i++) {
          const y = getStringY(i);
          const x = fretboardMargin.left - nutWidth - 10; // Position left of the nut
          stringLabelElements.push(
              <text
                  key={`label-${i}`}
                  x={x}
                  y={y}
                  dy=".3em" // Vertical alignment
                  textAnchor="middle" // Center text
                  fontSize="12"
                  fontWeight="bold"
                  fill="#374151" // Tailwind gray-700
                  className="select-none"
              >
                  {tuning[i]} {/* Display the note from the tuning prop */}
              </text>
          );
      }
  }


  // Fret Markers (inlay dots)
  const fretMarkers: JSX.Element[] = [];
  const markerYCenter: number = getStringY((numStrings - 1) / 2); // Center vertically

  // Single dots
  markerFrets.forEach(fret => {
      if (fret <= fretCount) {
        const x = getNoteX(fret);
        fretMarkers.push(
          <circle key={`marker-${fret}`} cx={x} cy={markerYCenter} r={fretMarkerRadius} fill="#d1d5db" /> // Tailwind gray-300
        );
      }
  });

  // Double dot
  if (doubleMarkerFret <= fretCount) {
      const x = getNoteX(doubleMarkerFret);
      const stringIndexCenter = (numStrings - 1) / 2;
      // Position double dots between strings (adjust indices if needed for odd/even strings)
      const y1 = getStringY(stringIndexCenter - 1);
      const y2 = getStringY(stringIndexCenter + 1);

       fretMarkers.push(
         <circle key={`marker-${doubleMarkerFret}-1`} cx={x} cy={y1 + stringSpacing / 2} r={fretMarkerRadius} fill="#d1d5db" />
       );
       fretMarkers.push(
         <circle key={`marker-${doubleMarkerFret}-2`} cx={x} cy={y2 - stringSpacing / 2} r={fretMarkerRadius} fill="#d1d5db" />
       );
  }

  // Clickable Areas (Invisible circles for interaction)
  const clickableAreas: JSX.Element[] = [];
  for (let stringIndex = 0; stringIndex < numStrings; stringIndex++) {
    // Include fret 0 for open string clicks if needed, adjust loop start if not
    for (let fretIndex = 0; fretIndex <= fretCount; fretIndex++) {
      const x = getNoteX(fretIndex);
      const y = getStringY(stringIndex);
      clickableAreas.push(
        <circle
          key={`click-${stringIndex}-${fretIndex}`}
          cx={x}
          cy={y}
          r={clickableAreaRadius} // Use the larger radius for easier clicking
          fill="transparent" // Make them invisible
          className="cursor-pointer" // Indicate interactivity
          onClick={() => onFretClick({ string: stringIndex, fret: fretIndex })}
        />
      );
    }
  }

  // Highlighted Notes (Rendered on top)
  const notesToRender: JSX.Element[] = highlightedNotes.map((note, index) => {
    // Validate that the note position is within the bounds
    if (note.string < 0 || note.string >= numStrings || note.fret < 0 || note.fret > fretCount) {
        console.warn(`Highlighted note out of bounds: string ${note.string}, fret ${note.fret}`);
        return null; // Skip rendering if out of bounds
    }

    const x = getNoteX(note.fret);
    const y = getStringY(note.string);
    const colorClass = note.color || 'bg-blue-500'; // Default color if not provided
    const noteName = note.label ?? getNoteAtFret(tuning[note.string], note.fret); // Use label or calculate note name

    // Determine text color based on background for better contrast
    // Simple heuristic for Tailwind v4 CSS variables (assuming dark text on light, light text on dark)
    // This might need adjustment based on your actual color definitions
    const isDarkBg = colorClass.includes('600') || colorClass.includes('700') || colorClass.includes('800') || colorClass.includes('900') || colorClass.includes('black') || colorClass.includes('slate') || colorClass.includes('gray') || colorClass.includes('zinc') || colorClass.includes('neutral') || colorClass.includes('stone');
    const textColor = isDarkBg ? 'white' : 'black';

    // Use Tailwind v4 arbitrary properties for fill if a hex color is passed
    const fillStyle = colorClass.startsWith('#') ? { fill: colorClass } : {};
    const fillClass = colorClass.startsWith('#') ? '' : colorClass;


    return (
      <g key={`note-${note.string}-${note.fret}-${index}`}>
        <circle
          cx={x}
          cy={y}
          r={noteRadius}
          className={`${fillClass} opacity-90`} // Use Tailwind class for color, add slight opacity
          style={fillStyle} // Apply direct fill style if hex color
          stroke="#374151" // Dark border (gray-700)
          strokeWidth="1"
        />
        {noteName && (
          <text
            x={x}
            y={y}
            dy=".3em" // Vertical alignment adjustment
            textAnchor="middle" // Center text horizontally
            fontSize="12" // Smaller font size for notes
            fontWeight="bold"
            fill={textColor}
            className="pointer-events-none select-none" // Prevent text interfering with clicks/selection
          >
            {noteName}
          </text>
        )}
      </g>
    );
  }).filter(Boolean) as JSX.Element[]; // Filter out null values from invalid notes


  return (
    <div className="p-4 overflow-x-auto bg-gray-100 rounded-lg shadow-md"> {/* Adjusted background and shadow */}
      <svg
        width="100%" // Make SVG take full width of container
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`} // Use viewBox for scaling
        preserveAspectRatio="xMidYMid meet" // Maintain aspect ratio
        className="max-w-full" // Ensure it doesn't overflow container
        style={{ fontFamily: 'sans-serif' }} // Ensure consistent font
      >
        {/* Render elements - order matters for layering */}
        {stringLabelElements} {/* String labels next */}
        {fretMarkers}   {/* Markers behind everything */}
        {fretLines}     {/* Frets above markers */}
        {stringLines}   {/* Strings above frets */}
        {notesToRender} {/* Highlighted notes on top of strings */}
        {clickableAreas} {/* Clickable areas on the very top (but invisible) */}
      </svg>
    </div>
  );
};

export default Fretboard;
