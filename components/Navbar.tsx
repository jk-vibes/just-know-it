
import React from 'react';
import { View } from '../types';
import { LayoutDashboard, Receipt, Settings2, User, PlusCircle } from 'lucide-react';

interface NavbarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, onViewChange }) => {
  const items = [
    { id: 'Dashboard', icon: LayoutDashboard, label: 'Home' },
    { id: 'Expenses', icon: Receipt, label: 'Log' },
    { id: 'Add', icon: PlusCircle, label: 'Add', primary: true },
    { id: 'Rules', icon: Settings2, label: 'Rules' },
    { id: 'Profile', icon: User, label: 'Settings' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-50">
      <div className="flex justify-around items-end h-16 px-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as View)}
            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
              currentView === item.id ? 'text-blue-600' : 'text-gray-400'
            } ${item.primary ? 'relative' : ''}`}
          >
            <div className={`${item.primary ? 'bg-blue-600 text-white p-3 rounded-full -top-6 absolute shadow-lg ring-4 ring-white' : ''}`}>
              <item.icon size={item.primary ? 24 : 20} strokeWidth={item.primary ? 3 : 2} />
            </div>
            {!item.primary && <span className="text-[10px] mt-1 font-medium">{item.label}</span>}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
