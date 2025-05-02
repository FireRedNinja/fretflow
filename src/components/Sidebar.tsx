import { NavLink } from "react-router";

const Sidebar = () => {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block py-2 px-4 rounded transition duration-200 ${
      isActive
        ? "bg-blue-500 text-white shadow-inner"
        : "text-gray-700 hover:bg-blue-100 hover:text-blue-700"
    }`;

  return (
    <aside className="w-64 bg-gray-100 p-4 border-r border-gray-300 h-full shadow-sm">
      <nav className="space-y-2">
        <NavLink to="/" className={navLinkClass} end>
          Home
        </NavLink>
        <NavLink to="/fretboard" className={navLinkClass}>
          Fretboard Trainer
        </NavLink>
        <NavLink to="/intervals" className={navLinkClass}>
          Interval Trainer
        </NavLink>
        <NavLink to="/chords" className={navLinkClass}>
          Chord Trainer
        </NavLink>
        <NavLink to="/scales" className={navLinkClass}>
          Scale Trainer
        </NavLink>
        <NavLink to="/technique" className={navLinkClass}>
          Technique Trainer
        </NavLink>
        <NavLink to="/theory" className={navLinkClass}>
          Theory Revision
        </NavLink>
      </nav>
    </aside>
  );
};


export default Sidebar;