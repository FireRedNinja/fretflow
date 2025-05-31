// src/components/ScaleTrainer.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Fretboard, { HighlightedNote } from "./Fretboard";
import { NOTES, STANDARD_TUNING, getNoteAtFret } from "../utils/musicUtils";
import {
  SCALE_FORMULAS,
  SCALE_FORMULA_LIST,
  ScaleFormula,
  getScaleNotes,
} from "../utils/scaleUtils"; // Import scale utilities

// Settings specific to the Scale Trainer
interface ScaleTrainerSettings {
  rootNote: string;
  scaleKey: string; // Key from SCALE_FORMULAS (e.g., 'naturalMinor')
  // TODO: Add position/area constraints?
}

const ScaleTrainer: React.FC = () => {
  // --- State ---
  const [highlightedNotes, setHighlightedNotes] = useState<HighlightedNote[]>(
    []
  );
  const [settings, setSettings] = useState<ScaleTrainerSettings>({
    rootNote: "A",
    scaleKey: "naturalMinor",
  });
  const [tempSettings, setTempSettings] =
    useState<ScaleTrainerSettings>(settings);
  const visualTuning = useMemo(() => STANDARD_TUNING.slice().reverse(), []);
  const maxFrets = 12;
  const numStrings = STANDARD_TUNING.length;
  const [fretGroupStart, setFretGroupStart] = useState(0);
  const [fretGroupSize, setFretGroupSize] = useState(4);
  const fretGroupEnd = fretGroupStart + fretGroupSize - 1;
  const [showAllFrets, setShowAllFrets] = useState(false);

  // Fret group controls
  const moveFretGroup = (delta: number) => {
    setFretGroupStart((prev) => {
      let next = prev + delta;
      if (next < 0) next = 0;
      if (next + fretGroupSize - 1 > maxFrets)
        next = maxFrets - fretGroupSize + 1;
      return next;
    });
  };
  const resizeFretGroup = (delta: number) => {
    setFretGroupSize((prev) => {
      let next = prev + delta;
      if (next < 1) next = 1;
      if (fretGroupStart + next - 1 > maxFrets)
        next = maxFrets - fretGroupStart + 1;
      return next;
    });
  };

  // Only visualize mode logic
  const calculateScalePositions = useCallback(
    (rootNote: string, scaleKey: string): HighlightedNote[] => {
      const formula = SCALE_FORMULAS[scaleKey];
      if (!formula) return [];
      const scaleNotes = getScaleNotes(rootNote, formula);
      if (!scaleNotes) return [];
      const positions: HighlightedNote[] = [];
      const scaleNoteSet = new Set(scaleNotes);
      for (let s = 0; s < visualTuning.length; s++) {
        for (let f = 0; f <= maxFrets; f++) {
          if (!showAllFrets && (f < fretGroupStart || f > fretGroupEnd))
            continue;
          const logicalStringIndex = numStrings - 1 - s;
          const currentNote = getNoteAtFret(
            STANDARD_TUNING[logicalStringIndex],
            f
          );
          if (currentNote && scaleNoteSet.has(currentNote)) {
            const isRoot = currentNote === rootNote;
            positions.push({
              string: s,
              fret: f,
              label: currentNote,
              color: isRoot ? "bg-red-500" : "bg-blue-400",
            });
          }
        }
      }
      return positions;
    },
    [visualTuning, numStrings, fretGroupStart, fretGroupEnd, showAllFrets]
  );

  // Update visualization when settings change
  useEffect(() => {
    setHighlightedNotes(
      calculateScalePositions(settings.rootNote, settings.scaleKey)
    );
  }, [settings, calculateScalePositions]);

  // Handlers for dropdowns
  const handleRootNoteChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setTempSettings((prev) => ({ ...prev, rootNote: event.target.value }));
    setSettings((prev) => ({ ...prev, rootNote: event.target.value }));
  };
  const handleScaleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setTempSettings((prev) => ({ ...prev, scaleKey: event.target.value }));
    setSettings((prev) => ({ ...prev, scaleKey: event.target.value }));
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-1 text-gray-800">Scale Trainer</h1>
      <div className="bg-gray-100 border border-gray-300 rounded-lg mb-6 shadow p-4 space-y-4 md:space-y-0 md:flex md:justify-between md:items-center">
        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
          <div>
            <label
              htmlFor="scale-root-note"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Root Note:
            </label>
            <select
              id="scale-root-note"
              value={tempSettings.rootNote}
              onChange={handleRootNoteChange}
              className="p-2 border rounded text-sm"
            >
              {NOTES.map((note) => (
                <option key={note} value={note}>
                  {note}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="scale-type"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Scale:
            </label>
            <select
              id="scale-type"
              value={tempSettings.scaleKey}
              onChange={handleScaleChange}
              className="p-2 border rounded text-sm"
            >
              {Object.entries(SCALE_FORMULAS).map(([key, formula]) => (
                <option key={key} value={key}>
                  {formula.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center space-x-2 mt-2">
          <span className="font-medium text-gray-700">Fret Group:</span>
          <button
            onClick={() => moveFretGroup(-1)}
            className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
            disabled={showAllFrets}
          >
            ◀
          </button>
          <span className="px-2">
            {fretGroupStart} - {fretGroupEnd}
          </span>
          <button
            onClick={() => moveFretGroup(1)}
            className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
            disabled={showAllFrets}
          >
            ▶
          </button>
          <button
            onClick={() => resizeFretGroup(-1)}
            className="ml-4 px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
            disabled={showAllFrets}
          >
            -
          </button>
          <span className="px-1">Size: {fretGroupSize}</span>
          <button
            onClick={() => resizeFretGroup(1)}
            className="px-2 py-1 bg-gray-300 rounded hover:bg-gray-400"
            disabled={showAllFrets}
          >
            +
          </button>
          <label className="ml-4 flex items-center space-x-1">
            <input
              type="checkbox"
              checked={showAllFrets}
              onChange={(e) => setShowAllFrets(e.target.checked)}
              className="form-checkbox h-4 w-4 text-blue-600"
            />
            <span className="text-sm">Show all frets</span>
          </label>
        </div>
      </div>
      {/* Fretboard Display Area */}
      <div className="bg-white p-4 rounded-lg shadow min-h-[200px]">
        <p className="text-lg font-semibold mb-1 text-gray-700">
          {`${settings.rootNote} ${
            SCALE_FORMULAS[settings.scaleKey]?.name || "Scale"
          }`}
        </p>
        <Fretboard
          highlightedNotes={highlightedNotes}
          fretCount={maxFrets}
          tuning={visualTuning}
          fretGroupStart={showAllFrets ? undefined : fretGroupStart}
          fretGroupEnd={showAllFrets ? undefined : fretGroupEnd}
        />
      </div>
    </div>
  );
};

export default ScaleTrainer;
