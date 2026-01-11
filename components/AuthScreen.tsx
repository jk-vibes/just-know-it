import React, { useState } from 'react';
import { UserProfile } from '../types';
import { LogIn, ShieldCheck, UserCircle, Globe, Sparkles, Fingerprint, Loader2 } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface AuthScreenProps {
  onLogin: (user: UserProfile) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState('');

  const handleGoogleSignIn = () => {
    triggerHaptic(20);
    setLoading(true);
    setAuthStatus('Connecting to Google...');
    
    setTimeout(() => setAuthStatus('Authenticating Identity...'), 800);
    setTimeout(() => setAuthStatus('Verifying Vault Permissions...'), 1600);
    
    setTimeout(() => {
      onLogin({
        id: 'google-123',
        name: 'Jay',
        email: 'jay@example.com',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jay',
        accessToken: 'simulated_oauth_token_xyz_123'
      });
      setLoading(false);
    }, 2400);
  };

  const handleGuestSignIn = () => {
    triggerHaptic();
    setGuestLoading(true);
    setAuthStatus('Initializing Local Sandbox...');
    
    setTimeout(() => {
      onLogin({
        id: 'guest-' + Math.random().toString(36).substring(7),
        name: 'Guest User',
        email: 'guest@local.host',
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Guest',
      });
      setGuestLoading(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-8 relative overflow-hidden transition-all duration-700">
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[120px] animate-pulse-slow"></div>
      <div className="absolute bottom-[-10%] left-[-20%] w-[400px] h-[400px] bg-brand-accent/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: '3s' }}></div>
      <div className="absolute top-[20%] left-[-10%] w-[300px] h-[300px] bg-purple-600/5 rounded-full blur-[80px]"></div>
      
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        
        <div className="mb-14 relative group">
          <div className="absolute inset-0 bg-brand-primary/20 blur-3xl group-hover:bg-brand-primary/30 transition-all duration-500 rounded-full"></div>
          <div className="relative bg-white/5 backdrop-blur-3xl p-8 rounded-[40px] border border-white/10 shadow-2xl transform transition-transform group-hover:scale-105 duration-500">
            <svg 
              width="80" 
              height="80" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg" 
              className="drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]"
            >
              <path 
                d="M4 8C4 7.44772 4.44772 7 5 7H19C19.5523 7 20 7.44772 20 8V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V8Z" 
                fill="currentColor" 
                className="text-brand-primary"
              />
              <path 
                d="M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7" 
                stroke="currentColor" 
                className="text-brand-primary"
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
          </div>
          
          <div className="absolute -top-4 -right-4 bg-brand-accent p-2 rounded-2xl shadow-lg animate-bounce-slow">
            <Sparkles size={16} className="text-white" />
          </div>
        </div>
        
        <div className="text-center space-y-4 mb-14">
          <h1 className="text-5xl font-black text-white tracking-tighter lowercase">just keep it</h1>
          <div className="flex justify-center gap-2">
            <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.3em] bg-brand-primary/10 px-3 py-1 rounded-full border border-brand-primary/20">The Wealth Portal</span>
          </div>
          <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[240px] mx-auto mt-4">
            A premium interface for your personal capital. Secure, automated, and insightful.
          </p>
        </div>

        <div className="w-full space-y-4">
          {loading || guestLoading ? (
            <div className="flex flex-col items-center gap-4 py-8 animate-pulse">
               <Loader2 className="text-brand-primary animate-spin" size={40} />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{authStatus}</p>
            </div>
          ) : (
            <>
              <button
                onClick={handleGoogleSignIn}
                className="group relative w-full bg-white text-slate-900 font-black py-5 rounded-[28px] flex items-center justify-center gap-3 shadow-[0_20px_40px_-10px_rgba(255,255,255,0.1)] hover:shadow-white/20 hover:scale-[1.02] active:scale-95 transition-all duration-300 uppercase tracking-widest text-xs"
              >
                <LogIn size={18} strokeWidth={3} />
                Enter with Google
              </button>

              <button
                onClick={handleGuestSignIn}
                className="w-full bg-white/5 backdrop-blur-md text-white font-black py-5 rounded-[28px] flex items-center justify-center gap-3 border border-white/10 hover:bg-white/10 transition-all duration-300 uppercase tracking-widest text-[11px]"
              >
                <UserCircle size={18} strokeWidth={2.5} className="text-slate-400" />
                Explore as Guest
              </button>
            </>
          )}
        </div>

        <div className="mt-16 grid grid-cols-2 gap-8 w-full">
           <div className="flex flex-col items-center gap-2">
             <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                <ShieldCheck size={18} className="text-emerald-500" />
             </div>
             <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">End-to-End Secure</span>
           </div>
           <div className="flex flex-col items-center gap-2">
             <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                <Globe size={18} className="text-indigo-400" />
             </div>
             <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Global Sync</span>
           </div>
        </div>

        <div className="mt-20 flex items-center gap-2 py-4 px-6 bg-white/5 rounded-full border border-white/5 opacity-40 hover:opacity-100 transition-opacity">
          <Fingerprint size={14} className="text-brand-primary" />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Build 2.0.4 • Stable</span>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;