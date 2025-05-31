// src/components/Fretboard.tsx
import React, { ReactElement } from "react";
import { STANDARD_TUNING, getNoteAtFret } from "../utils/musicUtils";

// --- Type Definitions ---

export interface NotePosition {
  string: number; // Visual index (0=HighE, 5=LowE)
  fret: number;
}

export interface HighlightedNote extends NotePosition {
  color?: string; // Tailwind class (e.g., 'bg-green-500') OR CSS color (e.g., '#ff0000', 'red')
  label?: string;
}

interface FretboardProps {
  tuning?: string[];
  fretCount?: number;
  highlightedNotes?: HighlightedNote[];
  onFretClick?: (position: NotePosition) => void;
  showStringLabels?: boolean;
  fretGroupStart?: number;
  fretGroupEnd?: number;
}

const Fretboard: React.FC<FretboardProps> = ({
  tuning = STANDARD_TUNING.slice().reverse(),
  fretCount = 12,
  highlightedNotes = [],
  onFretClick = () => {},
  showStringLabels = true,
  fretGroupStart,
  fretGroupEnd,
}) => {
  const numStrings: number = tuning.length;

  // --- SVG Dimensions and Layout ---
  const fretWidth: number = 80;
  const stringSpacing: number = 30;
  const fretboardMargin = { top: 30, right: 30, bottom: 30, left: 60 };
  const nutWidth: number = 10;
  const fretMarkerRadius: number = 5;
  const noteRadius: number = 12;
  const clickableAreaRadius: number = 14;
  const baseStringWidth: number = 1.5;
  const stringWidthIncrement: number = 0.25;

  const svgWidth: number =
    fretboardMargin.left + fretCount * fretWidth + fretboardMargin.right;
  const svgHeight: number =
    fretboardMargin.top +
    (numStrings - 1) * stringSpacing +
    fretboardMargin.bottom;

  const markerFrets: number[] = [3, 5, 7, 9];
  const doubleMarkerFret: number = 12;

  // --- Helper Functions ---
  const getStringY = (stringIndex: number): number =>
    fretboardMargin.top + stringIndex * stringSpacing;
  const getNoteX = (fretIndex: number): number => {
    if (fretIndex === 0) {
      return fretboardMargin.left - nutWidth - 15;
    }
    return (
      fretboardMargin.left + nutWidth + fretIndex * fretWidth - fretWidth / 2
    );
  };
  const getFretLineX = (fretIndex: number): number =>
    fretboardMargin.left + nutWidth + fretIndex * fretWidth;

  const [hovered, setHovered] = React.useState<{
    string: number;
    fret: number;
  } | null>(null);

  // --- Generate SVG Elements ---

  // Frets
  const fretLines: ReactElement[] = [];
  fretLines.push(
    <rect
      key="nut"
      x={fretboardMargin.left}
      y={fretboardMargin.top - 2}
      width={nutWidth}
      height={(numStrings - 1) * stringSpacing + 4}
      fill="black"
      rx={2}
      ry={2}
    />
  );
  for (let i = 1; i <= fretCount; i++) {
    const x = getFretLineX(i - 1);
    fretLines.push(
      <line
        key={`fret-${i}`}
        x1={x}
        y1={fretboardMargin.top}
        x2={x}
        y2={svgHeight - fretboardMargin.bottom}
        stroke="#9ca3af"
        strokeWidth={2}
      />
    );
  }

  // Strings
  const stringLines: ReactElement[] = [];
  for (let i = 0; i < numStrings; i++) {
    const y = getStringY(i);
    const currentStringWidth = baseStringWidth + i * stringWidthIncrement;
    stringLines.push(
      <line
        key={`string-${i}`}
        x1={fretboardMargin.left}
        y1={y}
        x2={getFretLineX(fretCount - 1)}
        y2={y}
        stroke="#4b5563"
        strokeWidth={currentStringWidth}
      />
    );
  }

  // String Labels
  const stringLabelElements: ReactElement[] = [];
  if (showStringLabels) {
    for (let i = 0; i < numStrings; i++) {
      const y = getStringY(i);
      const x = fretboardMargin.left - nutWidth - 10;
      stringLabelElements.push(
        <text
          key={`label-${i}`}
          x={x}
          y={y}
          dy=".3em"
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill="#374151"
          className="select-none"
        >
          {" "}
          {tuning[i]}{" "}
        </text>
      );
    }
  }

  // Fret Markers
  const fretMarkers: ReactElement[] = [];
  const markerYCenter: number = getStringY((numStrings - 1) / 2);
  markerFrets.forEach((fret) => {
    if (fret <= fretCount) {
      const x = getNoteX(fret);
      fretMarkers.push(
        <circle
          key={`marker-${fret}`}
          cx={x}
          cy={markerYCenter}
          r={fretMarkerRadius}
          fill="#d1d5db"
        />
      );
    }
  });
  if (doubleMarkerFret <= fretCount) {
    const x = getNoteX(doubleMarkerFret);
    const stringIndexCenter = (numStrings - 1) / 2;
    const y1 = getStringY(stringIndexCenter - 1);
    const y2 = getStringY(stringIndexCenter + 1);
    fretMarkers.push(
      <circle
        key={`marker-${doubleMarkerFret}-1`}
        cx={x}
        cy={y1 + stringSpacing / 2}
        r={fretMarkerRadius}
        fill="#d1d5db"
      />
    );
    fretMarkers.push(
      <circle
        key={`marker-${doubleMarkerFret}-2`}
        cx={x}
        cy={y2 - stringSpacing / 2}
        r={fretMarkerRadius}
        fill="#d1d5db"
      />
    );
  }

  // Fret Group Highlight (visual box)
  let fretGroupBox = null;
  if (
    typeof fretGroupStart === "number" &&
    typeof fretGroupEnd === "number" &&
    fretGroupStart <= fretGroupEnd &&
    fretGroupStart >= 0 &&
    fretGroupEnd <= fretCount
  ) {
    const groupPadding = 8; // px
    const leftX = getNoteX(fretGroupStart) - fretWidth / 2 + groupPadding;
    const rightX = getNoteX(fretGroupEnd) + fretWidth / 2 + groupPadding;
    const width = rightX - leftX;
    fretGroupBox = (
      <rect
        x={leftX}
        y={fretboardMargin.top - noteRadius - 8}
        width={width}
        height={(numStrings - 1) * stringSpacing + 2 * (noteRadius + 8)}
        fill="#3b82f6"
        fillOpacity={0.08}
        stroke="#3b82f6"
        strokeDasharray="8 4"
        strokeWidth={2}
        rx={10}
        pointerEvents="none"
      />
    );
  }

  // Clickable Areas
  const clickableAreas: ReactElement[] = [];
  for (let stringIndex = 0; stringIndex < numStrings; stringIndex++) {
    for (let fretIndex = 0; fretIndex <= fretCount; fretIndex++) {
      const x = getNoteX(fretIndex);
      const y = getStringY(stringIndex);
      clickableAreas.push(
        <circle
          key={`click-${stringIndex}-${fretIndex}`}
          cx={x}
          cy={y}
          r={clickableAreaRadius}
          fill="transparent"
          className="cursor-pointer"
          onClick={() => onFretClick({ string: stringIndex, fret: fretIndex })}
          onMouseEnter={() =>
            setHovered({ string: stringIndex, fret: fretIndex })
          }
          onMouseLeave={() => setHovered(null)}
        />
      );
    }
  }

  // Highlighted Notes (Rendered on top)
  const notesToRender: ReactElement[] = highlightedNotes
    .map((note, index) => {
      if (
        note.string < 0 ||
        note.string >= numStrings ||
        note.fret < 0 ||
        note.fret > fretCount
      ) {
        console.warn(`Note out of bounds: ${note.string}, ${note.fret}`);
        return null;
      }

      const x = getNoteX(note.fret);
      const y = getStringY(note.string);
      const noteName =
        note.label ?? getNoteAtFret(tuning[note.string], note.fret);

      // --- Color Handling Logic ---
      const rawColor = note.color || "bg-blue-500"; // Default if no color provided
      let fillColour = "currentColor"; // Default SVG fill
      let className = ""; // Base classes

      // Check if it looks like a Tailwind background class
      if (rawColor.startsWith("bg-")) {
        className = `${className} ${rawColor}`;
        // Extract color name and shade for potential fallback fill
        // e.g., 'bg-green-500' -> 'green', '500'
        const parts = rawColor.split("-");
        if (parts.length >= 2) {
          const colorName = parts[1];
          // Simple mapping for common feedback colors (can be expanded)
          if (colorName === "green")
            fillColour = "#22c55e"; // Tailwind green-500
          else if (colorName === "red")
            fillColour = "#ef4444"; // Tailwind red-500
          else if (colorName === "yellow")
            fillColour = "#eab308"; // Tailwind yellow-500
          else if (colorName === "blue")
            fillColour = "#3b82f6"; // Tailwind blue-500
          else if (colorName === "sky")
            fillColour = "#0ea5e9"; // Tailwind sky-500
          else if (colorName === "teal")
            fillColour = "#14b8a6"; // Tailwind teal-500
          else if (colorName === "gray") fillColour = "#6b7280"; // Tailwind gray-500
          // Add more mappings if needed
        }
      } else {
        // Assume it's a direct CSS color (hex, name, rgb, etc.)
        fillColour = rawColor;
      }
      // --- End Color Handling Logic ---

      // Determine text color based on background for better contrast
      // Simple check (adjust if needed for your specific colors)
      const isDarkBg =
        fillColour.includes("600") ||
        fillColour.includes("700") ||
        fillColour.includes("800") ||
        fillColour.includes("900") ||
        fillColour.includes("black") ||
        fillColour.includes("slate") ||
        fillColour.includes("gray") ||
        fillColour.includes("zinc") ||
        fillColour.includes("neutral") ||
        fillColour.includes("stone") ||
        ["#ef4444", "#dc2626", "#b91c1c"].includes(fillColour); // Add known dark hex/names
      const textColor = isDarkBg ? "white" : "black";

      return (
        <g key={`note-${note.string}-${note.fret}-${index}`}>
          <circle
            cx={x}
            cy={y}
            r={noteRadius}
            className={className} // Apply Tailwind class
            style={{ fill: fillColour }} // Apply explicit fill as fallback/primary
            stroke="#374151" // Dark border (gray-700)
            strokeWidth="1"
          />
          {noteName && (
            <text
              x={x}
              y={y}
              dy=".3em"
              textAnchor="middle"
              fontSize="12"
              fontWeight="bold"
              fill={textColor}
              className="pointer-events-none select-none"
            >
              {noteName}
            </text>
          )}
        </g>
      );
    })
    .filter(Boolean) as ReactElement[];

  // Add blank note on hover (rendered on top, but below highlighted notes)
  let hoverNote: ReactElement | null = null;
  if (
    hovered &&
    hovered.string >= 0 &&
    hovered.string < numStrings &&
    hovered.fret >= 0 &&
    hovered.fret <= fretCount &&
    !highlightedNotes.some(
      (n) => n.string === hovered.string && n.fret === hovered.fret
    )
  ) {
    const x = getNoteX(hovered.fret);
    const y = getStringY(hovered.string);
    hoverNote = (
      <g key={`hover-note-${hovered.string}-${hovered.fret}`}>
        <circle
          cx={x}
          cy={y}
          r={noteRadius}
          fill="#e5e7eb" // Tailwind gray-200
          stroke="#9ca3af" // Tailwind gray-400
          strokeWidth="1"
          // opacity={0.7}
        />
      </g>
    );
  }

  return (
    <div className="p-4 overflow-x-auto bg-gray-100 rounded-lg shadow-md">
      <svg
        width="100%"
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="xMidYMid meet"
        className="max-w-full"
        style={{ fontFamily: "sans-serif" }}
      >
        {fretGroupBox}
        {stringLabelElements} {fretMarkers} {fretLines} {stringLines}{" "}
        {hoverNote} {notesToRender} {clickableAreas}
      </svg>
    </div>
  );
};

export default Fretboard;
