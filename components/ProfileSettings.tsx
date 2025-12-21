
import React from 'react';
import { UserSettings } from '../types';
import { User, LogOut, Shield, Bell, HelpCircle, ChevronRight, Calculator } from 'lucide-react';

interface ProfileSettingsProps {
  settings: UserSettings;
  onReset: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({ settings, onReset }) => {
  const sections = [
    { title: 'Personal Info', icon: User, label: 'Edit Profile' },
    { title: 'Privacy', icon: Shield, label: 'Data & Privacy' },
    { title: 'Notifications', icon: Bell, label: 'Daily Reminders' },
    { title: 'Help', icon: HelpCircle, label: 'Support Center' },
  ];

  return (
    <div className="pb-24 pt-4 px-4 space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
          <img src="https://picsum.photos/200" alt="Avatar" className="w-full h-full object-cover" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900">Alex Johnson</h2>
          <p className="text-gray-500 font-medium">Monthly: ${settings.monthlyIncome.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-6">
        <div className="flex items-center gap-3 mb-6">
          <Calculator className="text-blue-600" size={24} />
          <h3 className="font-bold">Your Budget Plan</h3>
        </div>
        <div className="flex items-center gap-4">
          {Object.entries(settings.split).map(([cat, val]) => (
            <div key={cat} className="flex-1 text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{cat}</p>
              <div className="bg-blue-50 text-blue-700 font-bold py-2 rounded-xl text-sm">
                {val}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {sections.map((sec, idx) => (
          <button 
            key={sec.title} 
            className={`w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors ${
              idx !== sections.length - 1 ? 'border-bottom border-gray-100 border-b' : ''
            }`}
          >
            <div className="flex items-center gap-4">
              <div className="bg-gray-50 p-3 rounded-2xl text-gray-500">
                <sec.icon size={20} />
              </div>
              <span className="font-bold text-gray-700">{sec.label}</span>
            </div>
            <ChevronRight className="text-gray-300" size={20} />
          </button>
        ))}
      </div>

      <button 
        onClick={onReset}
        className="w-full flex items-center justify-center gap-2 p-5 text-red-500 font-bold bg-red-50 rounded-3xl mt-8"
      >
        <LogOut size={20} />
        Log Out & Clear Data
      </button>

      <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-4">
        Just Know It v1.0.4
      </p>
    </div>
  );
};

export default ProfileSettings;
