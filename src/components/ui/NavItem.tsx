
import React from 'react';

interface NavItemProps {
  id?: string;
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ id, icon, label, active, onClick }) => (
  <button 
    id={id} 
    onClick={onClick} 
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 relative group ${
      active 
        ? 'bg-indigo-600 text-white shadow-xl translate-x-1 border border-white/10' 
        : 'text-indigo-100 hover:bg-white/10 hover:text-white'
    }`}
  >
    <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
    </svg>
    <span className={`text-sm font-bold tracking-tight whitespace-nowrap ${active ? 'font-black' : ''}`}>
      {label}
    </span>
    {active && (
      <div className="absolute right-3 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_white]"></div>
    )}
  </button>
);

export default NavItem;
