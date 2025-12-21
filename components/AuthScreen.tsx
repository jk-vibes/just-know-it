import React, { useState } from 'react';
import { UserProfile } from '../types';
import { LogIn, Sparkles, ShieldCheck } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (user: UserProfile) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = () => {
    setLoading(true);
    setTimeout(() => {
      onLogin({
        id: 'google-123',
        name: 'Jay',
        email: 'jay@example.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jay'
      });
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col p-8 relative overflow-hidden transition-colors">
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-[#163074]/5 dark:bg-white/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-5%] left-[-5%] w-48 h-48 bg-[#f14444]/5 dark:bg-emerald-400/5 rounded-full blur-2xl"></div>
      
      <div className="flex-1 flex flex-col justify-center items-center text-center">
        <div className="bg-slate-50 dark:bg-white/10 p-5 rounded-[32px] backdrop-blur-xl border border-slate-100 dark:border-white/20 mb-8 shadow-xl animate-kick transition-colors">
          <Sparkles className="text-[#163074] dark:text-white" size={48} fill="currentColor" />
        </div>
        
        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Just Know It</h1>
        <p className="text-slate-500 dark:text-emerald-50 text-lg mb-12 max-w-xs font-bold leading-tight">
          The high-impact way to track your finance with Red & Green clarity and AI.
        </p>

        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-black py-5 rounded-[24px] flex items-center justify-center gap-3 shadow-2xl border border-slate-100 dark:border-slate-700 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 uppercase tracking-widest text-xs"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-[#163074] dark:border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" className="w-6 h-6" alt="G" />
                Continue with Google
              </>
            )}
          </button>
          
          <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-emerald-200 text-[10px] font-black uppercase tracking-widest mt-8">
            <ShieldCheck size={14} />
            Secure & Encrypted
          </div>
        </div>
      </div>

      <div className="text-slate-300 dark:text-emerald-200/50 text-[10px] font-black uppercase tracking-widest text-center">
        Premium Finance Interface • 2025
      </div>
    </div>
  );
};

export default AuthScreen;