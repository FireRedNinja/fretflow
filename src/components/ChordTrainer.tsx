// src/components/ChordTrainer.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import Fretboard, { NotePosition, HighlightedNote } from "./Fretboard";
import { NOTES, STANDARD_TUNING, getNoteAtFret } from "../utils/musicUtils";
import {
  CHORD_QUALITIES,
  CHORD_QUALITY_LIST,
  ChordQuality,
  Chord,
  getChord,
  getChordDisplayName,
  TriadInversion,
  DropVoicingType,
  VoicingType,
  findVoicingOnStrings,
  // Import functions to get conceptual note order
  getTriadInversionNotes,
  getDrop2VoicingNotes,
  getDrop3VoicingNotes,
} from "../utils/chordUtils";

// --- Types ---

type ChordTrainerMode = "identify" | "build";
type ChordQuizState = "idle" | "settings" | "question" | "answered";

type VoicingSetting = "root" | "inv1" | "inv2" | "drop2" | "drop3" | "any";

type StringSetting = number[];
const AVAILABLE_STRING_SETS: { [key: string]: StringSetting } = {
  "543": [2, 3, 4],
  "432": [1, 2, 3],
  "321": [0, 1, 2],
  "654": [3, 4, 5],
  "5432": [1, 2, 3, 4],
  "4321": [0, 1, 2, 3],
  any: [],
};

interface ChordTrainerSettings {
  enabledRootNotes: string[];
  enabledQualities: string[];
  enabledVoicings: VoicingSetting[];
  enabledStringSets: string[];
  applicableChordTypes: "triads" | "sevenths" | "all";
}

// Keep track of selected notes in build mode
interface SelectedNote extends NotePosition {
  noteName: string;
}

interface ChordQuizQuestion {
  mode: ChordTrainerMode;
  rootNote: string;
  quality: ChordQuality;
  voicingSetting: VoicingSetting;
  stringSetKey: string;
  correctChordName: string;
  // Target notes for build mode validation / Notes found for identify mode display
  targetNotes: HighlightedNote[]; // These are the correct positions
  // Conceptual order of notes for validation in build mode (less critical now with position check)
  targetNoteOrder?: string[];
  answerOptions?: string[]; // Only for identify mode
}

const ChordTrainer: React.FC = () => {
  // --- State ---
  const [mode, setMode] = useState<ChordTrainerMode>("identify");
  const [quizState, setQuizState] = useState<ChordQuizState>("settings");
  const [currentQuestion, setCurrentQuestion] =
    useState<ChordQuizQuestion | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [score, setScore] = useState<number>(0);
  const [questionsAsked, setQuestionsAsked] = useState<number>(0);
  const [highlightedNotes, setHighlightedNotes] = useState<HighlightedNote[]>(
    []
  );
  const [selectedBuildNotes, setSelectedBuildNotes] = useState<SelectedNote[]>(
    []
  );

  // --- Settings State ---
  const defaultQualities = [
    "major",
    "minor",
    "dominant7",
    "major7",
    "minor7",
    "minor7flat5",
  ];
  const defaultRoots = ["C", "F", "G", "A", "D", "E", "B"];
  const defaultVoicings: VoicingSetting[] = [
    "root",
    "inv1",
    "inv2",
    "drop2",
    "drop3",
  ];
  const defaultStringSets = ["any", "543", "432", "321", "4321"];
  const [settings, setSettings] = useState<ChordTrainerSettings>({
    enabledRootNotes: defaultRoots,
    enabledQualities: defaultQualities,
    enabledVoicings: defaultVoicings,
    enabledStringSets: defaultStringSets,
    applicableChordTypes: "all",
  });
  const [tempSettings, setTempSettings] =
    useState<ChordTrainerSettings>(settings);
  const [settingsError, setSettingsError] = useState<string>("");

  // --- Constants ---
  const visualTuning = useMemo(() => STANDARD_TUNING.slice().reverse(), []);
  const maxFrets = 12;

  // --- Helper Functions ---
  const getRandomElement = <T,>(arr: T[]): T | undefined => {
    /* ... */ if (arr.length === 0) return undefined;
    return arr[Math.floor(Math.random() * arr.length)];
  };
  const getVoicingTypeFromSetting = (
    setting: VoicingSetting
  ): VoicingType | null => {
    /* ... */ switch (setting) {
      case "root":
        return "Root Position";
      case "inv1":
        return TriadInversion.FIRST;
      case "inv2":
        return TriadInversion.SECOND;
      case "drop2":
        return DropVoicingType.DROP_2;
      case "drop3":
        return DropVoicingType.DROP_3;
      case "any":
        return "Root Position";
      default:
        return null;
    }
  };
  const findVoicingPositions = (
    chord: Chord,
    voicingType: VoicingType,
    stringSetKey: string
  ): NotePosition[] | null => {
    /* ... same as before ... */
    if (stringSetKey === "any") {
      console.warn(
        "String set 'any' selected, using simplified note finding for display."
      );
      const notes = chord.notes;
      const positions: NotePosition[] = [];
      const uniqueNotes = Array.from(new Set(notes));
      uniqueNotes.forEach((noteName) => {
        let found: NotePosition | null = null;
        for (let f = 0; f <= maxFrets; f++) {
          for (let s = 0; s < visualTuning.length; s++) {
            const lsi = STANDARD_TUNING.length - 1 - s;
            if (getNoteAtFret(STANDARD_TUNING[lsi], f) === noteName) {
              found = { string: s, fret: f };
              f = maxFrets + 1;
              break;
            }
          }
        }
        if (found) positions.push(found);
      });
      return positions.length === uniqueNotes.length
        ? positions.sort((a, b) => a.string - b.string)
        : null;
    } else {
      return findVoicingOnStrings(
        chord,
        voicingType,
        AVAILABLE_STRING_SETS[stringSetKey],
        maxFrets
      );
    }
  };

  /** Generates the next chord quiz question */
  const generateQuestion = useCallback(() => {
    /* ... same as before ... */
    setSettingsError("");
    if (
      settings.enabledRootNotes.length === 0 ||
      settings.enabledQualities.length === 0 ||
      settings.enabledVoicings.length === 0 ||
      settings.enabledStringSets.length === 0
    ) {
      setSettingsError(
        "Please select at least one option for each setting category."
      );
      setQuizState("settings");
      return;
    }
    let attempts = 0;
    while (attempts < 50) {
      attempts++;
      const randomRoot = getRandomElement(settings.enabledRootNotes);
      const randomQualityKey = getRandomElement(settings.enabledQualities);
      const randomQuality = randomQualityKey
        ? CHORD_QUALITIES[randomQualityKey]
        : undefined;
      let randomVoicingSetting = getRandomElement(settings.enabledVoicings);
      let randomStringSetKey = getRandomElement(settings.enabledStringSets);
      if (
        !randomRoot ||
        !randomQuality ||
        !randomVoicingSetting ||
        !randomStringSetKey
      )
        continue;
      const chord = getChord(randomRoot, randomQuality);
      if (!chord) continue;
      const isTriad = chord.notes.length === 3;
      const isSeventh = chord.notes.length === 4;
      if (
        (randomVoicingSetting === "inv1" || randomVoicingSetting === "inv2") &&
        !isTriad
      ) {
        if (settings.enabledVoicings.includes("root"))
          randomVoicingSetting = "root";
        else if (settings.enabledVoicings.includes("any"))
          randomVoicingSetting = "any";
        else continue;
      }
      if (
        (randomVoicingSetting === "drop2" ||
          randomVoicingSetting === "drop3") &&
        !isSeventh
      ) {
        if (settings.enabledVoicings.includes("root"))
          randomVoicingSetting = "root";
        else if (settings.enabledVoicings.includes("any"))
          randomVoicingSetting = "any";
        else continue;
      }
      const targetStringSetIndices = AVAILABLE_STRING_SETS[randomStringSetKey];
      const expectedNoteCount =
        randomVoicingSetting === "drop2" || randomVoicingSetting === "drop3"
          ? 4
          : randomVoicingSetting === "inv1" || randomVoicingSetting === "inv2"
          ? 3
          : chord.notes.length;
      if (randomStringSetKey !== "any") {
        if (targetStringSetIndices.length !== expectedNoteCount) {
          const compatibleSetKey = settings.enabledStringSets.find(
            (key) =>
              key !== "any" &&
              AVAILABLE_STRING_SETS[key]?.length === expectedNoteCount
          );
          if (compatibleSetKey) {
            randomStringSetKey = compatibleSetKey;
          } else if (settings.enabledStringSets.includes("any")) {
            randomStringSetKey = "any";
          } else {
            continue;
          }
        }
      }
      const voicingType = getVoicingTypeFromSetting(randomVoicingSetting);
      if (voicingType === null) continue;
      const foundPositions = findVoicingPositions(
        chord,
        voicingType,
        randomStringSetKey
      );
      if (!foundPositions || foundPositions.length === 0) {
        continue;
      }
      let targetNoteOrder: string[] | null = null;
      if (
        voicingType === TriadInversion.ROOT ||
        voicingType === TriadInversion.FIRST ||
        voicingType === TriadInversion.SECOND
      ) {
        targetNoteOrder = getTriadInversionNotes(chord, voicingType);
      } else if (voicingType === DropVoicingType.DROP_2) {
        targetNoteOrder = getDrop2VoicingNotes(chord);
      } else if (voicingType === DropVoicingType.DROP_3) {
        targetNoteOrder = getDrop3VoicingNotes(chord);
      } else if (voicingType === "Root Position") {
        targetNoteOrder = chord.notes;
      }
      if (!targetNoteOrder) {
        console.warn("Could not get target note order");
        continue;
      }
      let voicingName = "";
      if (randomVoicingSetting === "inv1") voicingName = " (1st Inversion)";
      else if (randomVoicingSetting === "inv2")
        voicingName = " (2nd Inversion)";
      else if (randomVoicingSetting === "drop2") voicingName = " (Drop 2)";
      else if (randomVoicingSetting === "drop3") voicingName = " (Drop 3)";
      const stringSetName =
        randomStringSetKey !== "any" ? ` on Str ${randomStringSetKey}` : "";
      const displayNameRoot = isTriad
        ? getChordDisplayName(
            randomRoot,
            randomQuality,
            voicingType as TriadInversion
          )
        : getChordDisplayName(randomRoot, randomQuality);
      const correctChordName = `${displayNameRoot}${
        isTriad ? "" : voicingName
      }${stringSetName}`;
      const targetNotes: HighlightedNote[] = foundPositions.map((pos) => {
        const logicalIdx = STANDARD_TUNING.length - 1 - pos.string;
        const noteName = getNoteAtFret(STANDARD_TUNING[logicalIdx], pos.fret);
        return {
          ...pos,
          label: noteName ?? "?",
          color: noteName === randomRoot ? "bg-red-500" : "bg-sky-500",
        };
      });
      let newQuestion: ChordQuizQuestion | null = null;
      if (mode === "identify") {
        const distractors = CHORD_QUALITY_LIST.filter(
          (q) => q.name !== randomQuality.name
        )
          .sort(() => 0.5 - Math.random())
          .slice(0, 3)
          .map((q) => {
            const distChord = getChord(randomRoot, q);
            if (!distChord) return "Invalid Distractor";
            const distIsTriad = distChord.notes.length === 3;
            const distVoicingName =
              distIsTriad &&
              (randomVoicingSetting === "inv1" ||
                randomVoicingSetting === "inv2")
                ? voicingName
                : !distIsTriad &&
                  (randomVoicingSetting === "drop2" ||
                    randomVoicingSetting === "drop3")
                ? voicingName
                : "";
            const distDisplayNameRoot = distIsTriad
              ? getChordDisplayName(
                  randomRoot,
                  q,
                  voicingType as TriadInversion
                )
              : getChordDisplayName(randomRoot, q);
            return `${distDisplayNameRoot}${
              distIsTriad ? "" : distVoicingName
            }${stringSetName}`;
          });
        const answerOptions = [correctChordName, ...distractors].sort(
          () => 0.5 - Math.random()
        );
        newQuestion = {
          mode: "identify",
          rootNote: randomRoot,
          quality: randomQuality,
          voicingSetting: randomVoicingSetting,
          stringSetKey: randomStringSetKey,
          correctChordName: correctChordName,
          targetNotes: targetNotes,
          targetNoteOrder: targetNoteOrder,
          answerOptions: answerOptions,
        };
        setHighlightedNotes(targetNotes);
      } else {
        newQuestion = {
          mode: "build",
          rootNote: randomRoot,
          quality: randomQuality,
          voicingSetting: randomVoicingSetting,
          stringSetKey: randomStringSetKey,
          correctChordName: correctChordName,
          targetNotes: targetNotes,
          targetNoteOrder: targetNoteOrder,
        };
        setHighlightedNotes([]);
        setSelectedBuildNotes([]);
        setFeedback("");
      }
      setCurrentQuestion(newQuestion);
      setFeedback("");
      setQuizState("question");
      return;
    }
    setSettingsError(
      "Failed to generate a valid/playable chord with current settings after 50 attempts. Please adjust settings."
    );
    setQuizState("settings");
  }, [settings, mode]);

  /** Handles the user's answer selection in 'identify' mode */
  const handleIdentifyAnswer = (selectedName: string) => {
    /* ... same as before ... */ if (
      quizState !== "question" ||
      !currentQuestion ||
      currentQuestion.mode !== "identify"
    )
      return;
    setQuestionsAsked((prev) => prev + 1);
    const isCorrect = selectedName === currentQuestion.correctChordName;
    if (isCorrect) {
      setFeedback("Correct!");
      setScore((prev) => prev + 1);
      setHighlightedNotes(
        currentQuestion.targetNotes.map((n) => ({
          ...n,
          color: "bg-green-500",
        }))
      );
    } else {
      setFeedback(
        `Incorrect. The chord was ${currentQuestion.correctChordName}.`
      );
      setHighlightedNotes(
        currentQuestion.targetNotes.map((n) => ({ ...n, color: "bg-red-500" }))
      );
    }
    setQuizState("answered");
  };

  /** Handles fret clicks in 'build' mode */
  const handleBuildFretClick = (clickedPosition: NotePosition) => {
    /* ... same as before ... */ if (
      quizState !== "question" ||
      !currentQuestion ||
      currentQuestion.mode !== "build"
    ) {
      return;
    }
    const logicalStringIndex =
      STANDARD_TUNING.length - 1 - clickedPosition.string;
    const clickedNoteName = getNoteAtFret(
      STANDARD_TUNING[logicalStringIndex],
      clickedPosition.fret
    );
    if (!clickedNoteName) return;
    const targetStringSet = AVAILABLE_STRING_SETS[currentQuestion.stringSetKey];
    if (
      currentQuestion.stringSetKey !== "any" &&
      !targetStringSet.includes(clickedPosition.string)
    ) {
      setFeedback(
        `Please select notes only on strings: ${currentQuestion.stringSetKey}`
      );
      setTimeout(() => setFeedback(""), 2000);
      return;
    }
    setSelectedBuildNotes((prev) => {
      const existingNoteIndex = prev.findIndex(
        (note) => note.string === clickedPosition.string
      );
      const newSelection = [...prev];
      if (existingNoteIndex > -1) {
        if (prev[existingNoteIndex].fret === clickedPosition.fret) {
          newSelection.splice(existingNoteIndex, 1);
        } else {
          newSelection[existingNoteIndex] = {
            ...clickedPosition,
            noteName: clickedNoteName,
          };
        }
      } else {
        newSelection.push({ ...clickedPosition, noteName: clickedNoteName });
      }
      return newSelection;
    });
  };

  // Update highlighted notes based on user selections in build mode
  useEffect(() => {
    /* ... same as before ... */ if (
      quizState === "question" &&
      mode === "build"
    ) {
      setHighlightedNotes(
        selectedBuildNotes.map((note) => ({
          string: note.string,
          fret: note.fret,
          label: note.noteName,
          color: "bg-teal-400",
        }))
      );
    }
  }, [selectedBuildNotes, quizState, mode]);

  /** Checks the user's answer in 'build' mode */
  const checkBuildAnswer = () => {
    if (
      quizState !== "question" ||
      !currentQuestion ||
      currentQuestion.mode !== "build" ||
      !currentQuestion.targetNotes
    )
      return;

    setQuestionsAsked((prev) => prev + 1);

    // --- REFINED Validation Logic ---
    const expectedNoteCount = currentQuestion.targetNotes.length;

    // 1. Check number of notes selected
    if (selectedBuildNotes.length !== expectedNoteCount) {
      setFeedback(
        `Incorrect. Expected ${expectedNoteCount} notes, but selected ${selectedBuildNotes.length}.`
      );
      setQuizState("answered");
      // Show correct answer highlights
      setHighlightedNotes(
        currentQuestion.targetNotes.map((n) => ({
          ...n,
          color: "bg-yellow-300 border border-yellow-600",
        }))
      );
      return;
    }

    // 2. Check if the selected positions exactly match the target positions
    // Helper to create a consistent string key for comparison (string-fret)
    const posToKey = (p: { string: number; fret: number }) =>
      `${p.string}-${p.fret}`;

    // Create sets of position keys for efficient lookup and comparison
    const selectedPositionKeys = new Set(selectedBuildNotes.map(posToKey));
    const targetPositionKeys = new Set(
      currentQuestion.targetNotes.map(posToKey)
    );

    // Check if sizes are the same and every selected key exists in the target set
    const positionsMatch =
      selectedPositionKeys.size === targetPositionKeys.size &&
      [...selectedPositionKeys].every((key) => targetPositionKeys.has(key));
    // --- END REFINED Validation Logic ---

    // --- Provide Feedback ---
    if (positionsMatch) {
      setFeedback("Correct!");
      setScore((prev) => prev + 1);
      // Recolor selected notes to green
      setHighlightedNotes(
        selectedBuildNotes.map((n) => ({ ...n, color: "bg-green-500" }))
      );
    } else {
      // Check if the notes themselves are correct, even if positions are wrong
      const selectedNoteNames = new Set(
        selectedBuildNotes.map((n) => n.noteName)
      );
      const targetNoteNames = new Set(
        currentQuestion.targetNotes.map((n) => n.label ?? "")
      ); // Use label which should hold the note name
      let setsMatch = selectedNoteNames.size === targetNoteNames.size;
      if (setsMatch) {
        for (const note of selectedNoteNames) {
          if (!targetNoteNames.has(note)) {
            setsMatch = false;
            break;
          }
        }
      }

      if (setsMatch) {
        // Notes were right, but positions wrong
        setFeedback(
          `Notes are correct, but the positions/voicing are wrong for ${currentQuestion.correctChordName}.`
        );
      } else {
        // Notes themselves were wrong
        setFeedback(
          `Incorrect notes/positions for ${currentQuestion.correctChordName}.`
        );
      }

      // Show the correct voicing notes in yellow/bordered
      const correctHighlights = currentQuestion.targetNotes.map((n) => ({
        ...n,
        color: "bg-yellow-300 border border-yellow-600",
      }));
      // Show user's incorrect notes in red
      const userHighlights = selectedBuildNotes.map((n) => ({
        ...n,
        color: "bg-red-500",
      }));
      // Combine, ensuring user's attempt overlays if same spot
      const combinedHighlights = [...correctHighlights];
      userHighlights.forEach((userNote) => {
        const existingIndex = combinedHighlights.findIndex(
          (ch) => ch.string === userNote.string && ch.fret === userNote.fret
        );
        if (existingIndex > -1 && !targetPositionKeys.has(posToKey(userNote))) {
          // Only overlay if the user's note wasn't part of the correct answer shown in yellow
          combinedHighlights[existingIndex] = userNote;
        } else if (existingIndex === -1) {
          // Add user's incorrect note if it wasn't a target position
          combinedHighlights.push(userNote);
        }
      });

      setHighlightedNotes(combinedHighlights);
    }
    setQuizState("answered");
  };

  // --- Settings Handlers ---
  const handleRootNoteToggle = (note: string) => {
    /* ... */ setTempSettings((prev) => {
      const s = new Set(prev.enabledRootNotes);
      if (s.has(note)) s.delete(note);
      else s.add(note);
      return { ...prev, enabledRootNotes: Array.from(s).sort() };
    });
    setSettingsError("");
  };
  const handleQualityToggle = (qualityKey: string) => {
    /* ... */ setTempSettings((prev) => {
      const s = new Set(prev.enabledQualities);
      if (s.has(qualityKey)) s.delete(qualityKey);
      else s.add(qualityKey);
      return { ...prev, enabledQualities: Array.from(s) };
    });
    setSettingsError("");
  };
  const handleVoicingToggle = (voicing: VoicingSetting) => {
    /* ... */ setTempSettings((prev) => {
      const s = new Set(prev.enabledVoicings);
      if (s.has(voicing)) s.delete(voicing);
      else s.add(voicing);
      return { ...prev, enabledVoicings: Array.from(s) };
    });
    setSettingsError("");
  };
  const handleStringSetToggle = (setKey: string) => {
    /* ... */ setTempSettings((prev) => {
      const s = new Set(prev.enabledStringSets);
      if (s.has(setKey)) s.delete(setKey);
      else s.add(setKey);
      return { ...prev, enabledStringSets: Array.from(s) };
    });
    setSettingsError("");
  };
  const handleApplicableTypeChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    /* ... */ setTempSettings((prev) => ({
      ...prev,
      applicableChordTypes: event.target.value as "triads" | "sevenths" | "all",
    }));
    setSettingsError("");
  };
  const applySettings = () => {
    /* ... */ if (tempSettings.enabledRootNotes.length === 0) {
      setSettingsError("Select root note(s).");
      return;
    }
    if (tempSettings.enabledQualities.length === 0) {
      setSettingsError("Select quality(ies).");
      return;
    }
    if (tempSettings.enabledVoicings.length === 0) {
      setSettingsError("Select voicing(s).");
      return;
    }
    if (tempSettings.enabledStringSets.length === 0) {
      setSettingsError("Select string set(s).");
      return;
    }
    setSettings(tempSettings);
    setScore(0);
    setQuestionsAsked(0);
    setFeedback("");
    setCurrentQuestion(null);
    setHighlightedNotes([]);
    setSettingsError("");
    setQuizState("idle");
  };

  // --- Effects ---
  useEffect(() => {
    if (quizState === "idle") {
      generateQuestion();
    }
  }, [quizState, generateQuestion]);
  const { applicableVoicings, applicableStringSets } = useMemo(() => {
    /* ... */ const v: { key: VoicingSetting; name: string }[] = [
      { key: "root", name: "Root Position" },
      { key: "any", name: "Any/Unspecified" },
      { key: "inv1", name: "1st Inversion" },
      { key: "inv2", name: "2nd Inversion" },
      { key: "drop2", name: "Drop 2" },
      { key: "drop3", name: "Drop 3" },
    ];
    const s = Object.entries(AVAILABLE_STRING_SETS);
    if (tempSettings.applicableChordTypes === "triads") {
      return {
        applicableVoicings: v.filter((i) =>
          ["root", "inv1", "inv2", "any"].includes(i.key)
        ),
        applicableStringSets: s.filter(
          ([k, v]) => v.length === 3 || k === "any"
        ),
      };
    } else if (tempSettings.applicableChordTypes === "sevenths") {
      return {
        applicableVoicings: v.filter((i) =>
          ["root", "drop2", "drop3", "any"].includes(i.key)
        ),
        applicableStringSets: s.filter(
          ([k, v]) => v.length === 4 || k === "any"
        ),
      };
    } else {
      return { applicableVoicings: v, applicableStringSets: s };
    }
  }, [tempSettings.applicableChordTypes]);

  // --- Render Logic ---
  // (No changes needed in JSX rendering part)
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-1 text-gray-800">Chord Trainer</h1>
      <div className="mb-4 border-b border-gray-300 pb-2">
        {" "}
        {/* Mode UI */}{" "}
        <label className="block font-medium mb-1 text-sm text-gray-600">
          Mode:
        </label>{" "}
        <div className="flex space-x-4">
          {" "}
          <label className="flex items-center space-x-2 cursor-pointer">
            {" "}
            <input
              type="radio"
              name="chord_mode"
              value="identify"
              checked={mode === "identify"}
              onChange={() => setMode("identify")}
              className="text-blue-600 focus:ring-blue-500"
              disabled={quizState !== "settings"}
            />{" "}
            <span>Identify Chord</span>{" "}
          </label>{" "}
          <label className="flex items-center space-x-2 cursor-pointer">
            {" "}
            <input
              type="radio"
              name="chord_mode"
              value="build"
              checked={mode === "build"}
              onChange={() => setMode("build")}
              className="text-blue-600 focus:ring-blue-500"
              disabled={quizState !== "settings"}
            />{" "}
            <span>Build Chord</span>{" "}
          </label>{" "}
        </div>{" "}
      </div>
      <details
        className="bg-gray-100 border border-gray-300 rounded-lg mb-6 shadow"
        open={quizState === "settings"}
      >
        {" "}
        {/* Settings UI */}{" "}
        <summary className="p-3 font-semibold cursor-pointer hover:bg-gray-200 rounded-t-lg">
          Practice Settings
        </summary>{" "}
        <div className="p-4 border-t border-gray-300 space-y-4">
          {" "}
          <fieldset className="border p-3 rounded">
            {" "}
            <legend>Root Notes</legend>{" "}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-x-3 gap-y-1 mt-1">
              {" "}
              {NOTES.map((note) => (
                <label
                  key={`root-${note}`}
                  className="flex items-center space-x-1 cursor-pointer"
                >
                  {" "}
                  <input
                    type="checkbox"
                    value={note}
                    checked={tempSettings.enabledRootNotes.includes(note)}
                    onChange={() => handleRootNoteToggle(note)}
                    className="rounded text-blue-600 h-4 w-4"
                  />{" "}
                  <span className="text-sm">{note}</span>{" "}
                </label>
              ))}{" "}
            </div>{" "}
          </fieldset>{" "}
          <fieldset className="border p-3 rounded">
            {" "}
            <legend>Chord Qualities</legend>{" "}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 mt-1">
              {" "}
              {Object.entries(CHORD_QUALITIES).map(([key, quality]) => (
                <label
                  key={key}
                  className="flex items-center space-x-1 cursor-pointer"
                >
                  {" "}
                  <input
                    type="checkbox"
                    value={key}
                    checked={tempSettings.enabledQualities.includes(key)}
                    onChange={() => handleQualityToggle(key)}
                    className="rounded text-blue-600 h-4 w-4"
                  />{" "}
                  <span className="text-sm">{`${quality.name} (${
                    quality.abbr[0] || "maj"
                  })`}</span>{" "}
                </label>
              ))}{" "}
            </div>{" "}
          </fieldset>{" "}
          <div className="pt-2">
            {" "}
            <label htmlFor="applicable-types">
              Show settings applicable for:
            </label>{" "}
            <select
              id="applicable-types"
              value={tempSettings.applicableChordTypes}
              onChange={handleApplicableTypeChange}
              className="p-1 border rounded text-sm"
            >
              {" "}
              <option value="all">All</option>{" "}
              <option value="triads">Triads</option>{" "}
              <option value="sevenths">Sevenths</option>{" "}
            </select>{" "}
          </div>{" "}
          <fieldset className="border p-3 rounded">
            {" "}
            <legend>Voicings</legend>{" "}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-1">
              {" "}
              {applicableVoicings.map(({ key, name }) => (
                <label
                  key={`voicing-${key}`}
                  className="flex items-center space-x-1 cursor-pointer"
                >
                  {" "}
                  <input
                    type="checkbox"
                    value={key}
                    checked={tempSettings.enabledVoicings.includes(key)}
                    onChange={() => handleVoicingToggle(key)}
                    className="rounded text-blue-600 h-4 w-4"
                  />{" "}
                  <span className="text-sm">{name}</span>{" "}
                </label>
              ))}{" "}
            </div>{" "}
          </fieldset>{" "}
          <fieldset className="border p-3 rounded">
            {" "}
            <legend>String Sets</legend>{" "}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-1">
              {" "}
              {applicableStringSets.map(([key]) => (
                <label
                  key={`set-${key}`}
                  className="flex items-center space-x-1 cursor-pointer"
                >
                  {" "}
                  <input
                    type="checkbox"
                    value={key}
                    checked={tempSettings.enabledStringSets.includes(key)}
                    onChange={() => handleStringSetToggle(key)}
                    className="rounded text-blue-600 h-4 w-4"
                  />{" "}
                  <span className="text-sm">
                    {key === "any" ? "Any" : `Str ${key}`}
                  </span>{" "}
                </label>
              ))}{" "}
            </div>{" "}
          </fieldset>{" "}
          <div className="pt-3 text-right">
            {" "}
            {settingsError && (
              <p className="text-red-600 text-sm mb-2 text-left">
                {settingsError}
              </p>
            )}{" "}
            <button
              onClick={applySettings}
              className="py-2 px-5 bg-green-600 text-white rounded hover:bg-green-700 shadow"
            >
              {" "}
              Apply & Start{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
      </details>
      {quizState !== "settings" && (
        /* Quiz Area */ <>
          {" "}
          <div className="bg-white p-4 rounded-lg shadow mb-6 min-h-[200px]">
            {" "}
            {quizState === "idle" && (
              <p className="text-gray-600">Loading question...</p>
            )}{" "}
            {currentQuestion &&
              (quizState === "question" || quizState === "answered") && (
                <>
                  {" "}
                  <p className="text-lg font-semibold mb-3 text-gray-700">
                    {" "}
                    {mode === "identify"
                      ? `Identify the displayed chord:`
                      : `Build the chord: ${currentQuestion.correctChordName}`}{" "}
                  </p>{" "}
                  <Fretboard
                    highlightedNotes={highlightedNotes}
                    fretCount={maxFrets}
                    tuning={visualTuning}
                    onFretClick={
                      quizState === "question" && mode === "build"
                        ? handleBuildFretClick
                        : undefined
                    }
                  />{" "}
                </>
              )}{" "}
          </div>{" "}
          {quizState === "question" &&
            mode === "identify" &&
            currentQuestion?.answerOptions && (
              <div className="mb-6">
                {" "}
                <p>Select the correct chord name:</p>{" "}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {" "}
                  {currentQuestion.answerOptions.map((name) => (
                    <button
                      key={name}
                      onClick={() => handleIdentifyAnswer(name)}
                      className="w-full text-left py-2 px-4 bg-sky-500 text-white rounded hover:bg-sky-600 shadow"
                    >
                      {" "}
                      {name}{" "}
                    </button>
                  ))}{" "}
                </div>{" "}
              </div>
            )}{" "}
          {quizState === "question" && mode === "build" && (
            <div className="mb-6 text-center">
              {" "}
              <button
                onClick={checkBuildAnswer}
                className="py-2 px-6 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 shadow disabled:opacity-50"
                disabled={selectedBuildNotes.length === 0}
              >
                {" "}
                Check Answer{" "}
              </button>{" "}
            </div>
          )}{" "}
          {quizState === "answered" && (
            <div className="bg-gray-50 p-4 rounded-lg shadow mb-6 text-center">
              {" "}
              <p
                className={`text-xl font-bold mb-3 ${
                  feedback.includes("Correct")
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {feedback}
              </p>{" "}
              <button
                onClick={generateQuestion}
                className="py-2 px-5 bg-indigo-600 text-white rounded hover:bg-indigo-700 shadow"
              >
                {" "}
                Next Question{" "}
              </button>{" "}
            </div>
          )}{" "}
          <div className="text-right text-gray-600">
            {" "}
            <p>
              Score: {score} / {questionsAsked}
            </p>{" "}
          </div>{" "}
        </>
      )}
    </div>
  );
};

export default ChordTrainer;
