import React from 'react';
import { Shield, Zap } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="mt-8 pb-36 px-4 text-center animate-kick">
      <div className="flex flex-col items-center gap-4">
        {/* Divider */}
        <div className="flex items-center gap-3 opacity-20">
          <div className="h-[1px] w-12 bg-slate-400 dark:bg-slate-600"></div>
          <Zap size={10} className="text-slate-500" />
          <div className="h-[1px] w-12 bg-slate-400 dark:bg-slate-600"></div>
        </div>
        
        <div className="space-y-1.5">
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">
            Powered by <span className="text-brand-primary dark:text-indigo-400">JK</span>
          </p>
          
          <div className="flex items-center justify-center gap-2.5">
             <span className="text-[8px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">Build v1.1.8</span>
             <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800"></span>
             <span className="text-[8px] font-bold text-slate-300 dark:text-slate-600 uppercase tracking-widest">© 2025 Rights Reserved</span>
          </div>
        </div>

        {/* Security Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-white/5 rounded-full border border-slate-100 dark:border-white/5 transition-all opacity-40 hover:opacity-100 group">
          <Shield size={9} className="text-emerald-500 group-hover:scale-110 transition-transform" />
          <span className="text-[7px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">Neural Architecture Secured</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;