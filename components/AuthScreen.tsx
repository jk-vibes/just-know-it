
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { LogIn, ShieldCheck } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (user: UserProfile) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = () => {
    setLoading(true);
    // Simulating Google OAuth redirect and token return
    setTimeout(() => {
      onLogin({
        id: 'google-123',
        name: 'Jay',
        email: 'jay@example.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jay',
        accessToken: 'simulated_oauth_token_xyz_123'
      });
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col p-8 relative overflow-hidden transition-colors">
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-[#163074]/5 dark:bg-white/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-5%] left-[-5%] w-48 h-48 bg-[#f14444]/5 dark:bg-red-400/5 rounded-full blur-2xl"></div>
      
      <div className="flex-1 flex flex-col justify-center items-center text-center">
        {/* Briefcase Brand Logo */}
        <div className="mb-12 group animate-kick">
          <div className="relative">
            <svg 
              width="96" 
              height="96" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg" 
              className="drop-shadow-2xl"
            >
              <path 
                d="M4 8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" 
                fill="#163074" 
                className="dark:fill-indigo-600"
              />
              <path 
                d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" 
                stroke="#163074" 
                className="dark:stroke-indigo-600"
                strokeWidth="2" 
                strokeLinecap="round" 
              />
              <text 
                x="12" 
                y="17" 
                fontSize="6" 
                fontWeight="900" 
                textAnchor="middle" 
                fill="white" 
                style={{ fontFamily: 'Plus Jakarta Sans' }}
              >
                JK
              </text>
            </svg>
            <div className="absolute -top-1 -right-1 bg-[#f14444] w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 shadow-md"></div>
          </div>
        </div>
        
        <div className="space-y-2 mb-12">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Just Know It</h1>
          <div className="flex justify-center gap-1.5">
            <div className="bg-slate-50 dark:bg-white/5 px-2 py-0.5 rounded-full border border-slate-100 dark:border-white/10">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Premium Tracking</span>
            </div>
          </div>
        </div>

        <p className="text-slate-500 dark:text-slate-400 text-lg mb-12 max-w-xs font-bold leading-tight">
          Seamless financial tracking with automatic Google Drive cloud backup.
        </p>

        <div className="w-full max-w-sm space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-[#163074] dark:bg-indigo-600 text-white font-black py-5 rounded-[24px] flex items-center justify-center gap-3 shadow-2xl border border-transparent hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 uppercase tracking-widest text-xs"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn size={20} />
                Connect Google Account
              </>
            )}
          </button>
          
          <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mt-8">
            <ShieldCheck size={14} className="text-[#f14444]" />
            Encrypted Drive Storage
          </div>
        </div>
      </div>

      <div className="text-slate-300 dark:text-slate-700 text-[10px] font-black uppercase tracking-widest text-center">
        Interface Experience • v1.3
      </div>
    </div>
  );
};

export default AuthScreen;
