import React, { useState } from 'react';
import { UserSettings } from '../types';
import { DEFAULT_SPLIT } from '../constants';
import { ArrowRight, Wallet } from 'lucide-react';

interface OnboardingProps {
  onComplete: (settings: UserSettings) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [income, setIncome] = useState<number>(0);
  const [split, setSplit] = useState(DEFAULT_SPLIT);

  const handleFinish = () => {
    onComplete({
      monthlyIncome: income,
      split,
      isOnboarded: true,
      theme: 'light',
      isCloudSyncEnabled: true,
      currency: 'INR'
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-900 dark:text-white text-center transition-colors">
      {step === 1 && (
        <div className="w-full max-w-md animate-slide-up">
          <div className="bg-indigo-50 dark:bg-white/10 p-4 rounded-full w-20 h-20 mx-auto mb-8 flex items-center justify-center text-[#163074] dark:text-white">
            <Wallet size={40} />
          </div>
          <h1 className="text-3xl font-black mb-4">Just Know It</h1>
          <p className="text-slate-500 dark:text-indigo-100 mb-8 text-lg font-bold">Simple, rule-based tracking to master your money.</p>
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 text-slate-900 dark:text-white shadow-2xl border border-slate-100 dark:border-slate-700">
            <label className="block text-sm font-black text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wider text-left">Monthly Net Income</label>
            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 dark:text-slate-600">₹</span>
              <input
                type="number"
                value={income || ''}
                onChange={(e) => setIncome(Number(e.target.value))}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-4 text-3xl font-black border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-[#163074] dark:focus:border-indigo-500 outline-none transition-all dark:bg-slate-900 text-slate-900 dark:text-white"
              />
            </div>
            <button
              disabled={!income}
              onClick={() => setStep(2)}
              className="w-full bg-[#163074] dark:bg-indigo-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all uppercase tracking-widest text-xs"
            >
              Continue <ArrowRight size={20} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-md animate-slide-up">
          <h1 className="text-2xl font-black mb-6">Set Your Rule</h1>
          <p className="text-slate-500 dark:text-indigo-100 mb-8 font-bold">We recommend the 50/30/20 rule, but you can adjust it.</p>
          
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 text-slate-900 dark:text-white shadow-2xl border border-slate-100 dark:border-slate-700 space-y-6">
            <div className="space-y-4">
              {Object.entries(split).map(([category, value]) => (
                <div key={category}>
                  <div className="flex justify-between mb-2">
                    <span className="font-black text-xs uppercase tracking-widest text-slate-400">{category}</span>
                    <span className="font-black text-[#163074] dark:text-indigo-400">{value}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => {
                      const newVal = Number(e.target.value);
                      const others = Object.keys(split).filter(k => k !== category);
                      const remaining = 100 - newVal;
                      const splitRest = remaining / 2;
                      setSplit({
                        ...split,
                        [category]: newVal,
                        [others[0]]: Math.round(splitRest),
                        [others[1]]: Math.round(splitRest),
                      } as any);
                    }}
                    className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#163074] dark:accent-indigo-600"
                  />
                </div>
              ))}
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
              <div className="flex justify-between text-xs text-slate-400 font-black uppercase tracking-widest">
                <span>Total Budget</span>
                <span className={Object.values(split).reduce((a: number, b: number) => a + b, 0) === 100 ? 'text-green-600' : 'text-[#f14444] font-black'}>
                  {Object.values(split).reduce((a: number, b: number) => a + b, 0)}%
                </span>
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="w-full bg-[#163074] dark:bg-indigo-600 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all uppercase tracking-widest text-xs"
            >
              Start Budgeting <ArrowRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;