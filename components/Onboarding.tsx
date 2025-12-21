
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
      isOnboarded: true
    });
  };

  return (
    <div className="min-h-screen bg-blue-600 flex flex-col items-center justify-center p-6 text-white text-center">
      {step === 1 && (
        <div className="w-full max-w-md animate-slide-up">
          <div className="bg-white/20 p-4 rounded-full w-20 h-20 mx-auto mb-8 flex items-center justify-center">
            <Wallet size={40} />
          </div>
          <h1 className="text-3xl font-bold mb-4">Just Know It</h1>
          <p className="text-blue-100 mb-8 text-lg">Simple, rule-based tracking to master your money.</p>
          <div className="bg-white rounded-2xl p-6 text-gray-900 shadow-2xl">
            <label className="block text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wider text-left">Monthly Net Income</label>
            <div className="relative mb-6">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-gray-400">$</span>
              <input
                type="number"
                value={income || ''}
                onChange={(e) => setIncome(Number(e.target.value))}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-4 text-3xl font-bold border-2 border-gray-100 rounded-xl focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <button
              disabled={!income}
              onClick={() => setStep(2)}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              Continue <ArrowRight size={20} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="w-full max-w-md animate-slide-up">
          <h1 className="text-2xl font-bold mb-6">Set Your Rule</h1>
          <p className="text-blue-100 mb-8">We recommend the 50/30/20 rule, but you can adjust it.</p>
          
          <div className="bg-white rounded-2xl p-6 text-gray-900 shadow-2xl space-y-6">
            <div className="space-y-4">
              {Object.entries(split).map(([category, value]) => (
                <div key={category}>
                  <div className="flex justify-between mb-2">
                    <span className="font-semibold">{category}</span>
                    <span className="font-bold text-blue-600">{value}%</span>
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
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              ))}
            </div>
            
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex justify-between text-sm text-gray-500 mb-1">
                <span>Total Budget</span>
                {/* Fixed operator '+' cannot be applied to types 'unknown' and 'unknown' by adding explicit type annotations to reduce params */}
                <span className={Object.values(split).reduce((a: number, b: number) => a + b, 0) === 100 ? 'text-green-600' : 'text-red-600 font-bold'}>
                  {Object.values(split).reduce((a: number, b: number) => a + b, 0)}%
                </span>
              </div>
            </div>

            <button
              onClick={handleFinish}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all"
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
