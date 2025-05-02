import { useState } from "react";
import * as Tone from "tone";

const Metronome = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(100);
  const [metronomeInstance, setMetronomeInstance] = useState<Tone.Loop | null>(
    null
  );

  // Function to start the metronome
  const startMetronome = async () => {
    await Tone.start();

    const synth = new Tone.MembraneSynth().toDestination();

    // Create a loop if it doesn't exist
    if (!metronomeInstance) {
      const loop = new Tone.Loop((time) => {
        // Play a note on each beat
        synth.triggerAttackRelease("C1", "8n", time);
      }, "4n").start(0); // 4n = quarter note

      setMetronomeInstance(loop);
    } else {
      // If it exists, just start it
      metronomeInstance.start(0);
    }

    // Set the tempo
    Tone.Transport.bpm.value = bpm;
    Tone.Transport.start();
    setIsPlaying(true);
  };

  // Function to stop the metronome
  const stopMetronome = () => {
    Tone.Transport.stop();
    if (metronomeInstance) {
      metronomeInstance.stop(0).dispose();
      setMetronomeInstance(null);
    }
    setIsPlaying(false);
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (isPlaying) {
      stopMetronome();
    } else {
      startMetronome();
    }
  };

  // Handle BPM change
  const handleBpmChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newBpm = parseInt(event.target.value);
    setBpm(newBpm);
    if (isPlaying && metronomeInstance) {
      Tone.Transport.bpm.value = newBpm;
    }
  };

  return (
    <div className="flex items-center space-x-2 bg-gray-200 p-2 rounded-lg shadow">
      <span className="font-semibold text-sm text-black">Metronome</span>
      <input
        type="range"
        min="40"
        max="240"
        value={bpm}
        onChange={handleBpmChange}
        className="w-20 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer" />
      <span className="text-sm w-8 text-right text-black">{bpm}</span>
      <button
        onClick={togglePlay}
        className={`px-3 py-1 rounded text-white text-sm ${isPlaying
            ? "bg-red-500 hover:bg-red-600"
            : "bg-green-500 hover:bg-green-600"}`}
      >
        {isPlaying ? "Stop" : "Start"}
      </button>
    </div>
  );
};

export default Metronome;