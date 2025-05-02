import { BrowserRouter, Routes, Route } from "react-router";
import { lazy } from "react";

const MainLayout = lazy(() => import("./components/MainLayout"));
const Home = lazy(() => import("./components/Home"));
const FretboardTrainer = lazy(() => import("./components/FretboardTrainer"));
const IntervalTrainer = lazy(() => import("./components/IntervalTrainer"));
const ChordTrainer = lazy(() => import("./components/ChordTrainer"));
const ScaleTrainer = lazy(() => import("./components/ScaleTrainer"));
const TechniqueTrainer = lazy(() => import("./components/TechniqueTrainer"));
const TheoryRevision = lazy(() => import("./components/TheoryRevision"));

function App() {
  return (
    <BrowserRouter basename="/fretflow">
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="fretboard" element={<FretboardTrainer />} />
          <Route path="intervals" element={<IntervalTrainer />} />
          <Route path="chords" element={<ChordTrainer />} />
          <Route path="scales" element={<ScaleTrainer />} />
          <Route path="technique" element={<TechniqueTrainer />} />
          <Route path="theory" element={<TheoryRevision />} />
          {/* Add more routes as needed */}
          <Route path="*" element={<div className="p-4">404 Not Found</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
