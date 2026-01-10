import React, { useMemo, useState } from 'react';
import { WealthItem, UserSettings } from '../types';
import { getCurrencySymbol } from '../constants';
import { 
  Plus, Landmark, CreditCard, ShieldCheck, 
  Edit3, ArrowUpRight, ArrowDownRight, TrendingUp
} from 'lucide-react';
import AccountForm from './AccountForm';
import { triggerHaptic } from '../utils/haptics';

interface AccountsProps {
  wealthItems: WealthItem[];
  settings: UserSettings;
  onUpdateWealth: (id: string, updates: Partial<WealthItem>) => void;
  onDeleteWealth: (id: string) => void;
  onAddWealth: (item: Omit<WealthItem, 'id'>) => void;
}

const Accounts: React.FC<AccountsProps> = ({
  wealthItems, settings, onUpdateWealth, onDeleteWealth, onAddWealth
}) => {
  const currencySymbol = getCurrencySymbol(settings.currency);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingItem, setEditingItem] = useState<WealthItem | null>(null);

  const stats = useMemo(() => {
    const debitItems = wealthItems.filter(i => ['Checking Account', 'Savings Account', 'Cash'].includes(i.category));
    const creditItems = wealthItems.filter(i => ['Loan', 'Credit Card'].includes(i.category));
    const otherAssets = wealthItems.filter(i => !['Checking Account', 'Savings Account', 'Cash', 'Loan', 'Credit Card'].includes(i.category));
    const totalDebit = debitItems.reduce((sum, i) => sum + i.value, 0);
    const totalCredit = creditItems.reduce((sum, i) => sum + i.value, 0);
    const totalAssets = totalDebit + otherAssets.reduce((sum, i) => sum + i.value, 0);
    const netWorth = totalAssets - totalCredit;
    return { debitItems, creditItems, otherAssets, totalDebit: Math.round(totalDebit), totalCredit: Math.round(totalCredit), netWorth: Math.round(netWorth) };
  }, [wealthItems]);

  const handleEdit = (item: WealthItem) => {
    triggerHaptic();
    setEditingItem(item);
    setShowAccountForm(true);
  };

  const handleAdd = () => {
    triggerHaptic();
    setEditingItem(null);
    setShowAccountForm(true);
  };

  const sectionClass = "bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mb-2 shadow-sm";

  return (
    <div className="pb-32 pt-1">
      <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 px-5 py-4 rounded-2xl mb-1 shadow-md">
        <div className="flex justify-between items-center w-full">
          <div>
            <h1 className="text-sm font-black text-white tracking-tighter uppercase leading-none">Portfolio Ledger</h1>
            <p className="text-[7px] font-black text-white/50 uppercase tracking-[0.2em] mt-1">Registry</p>
          </div>
          <button onClick={handleAdd} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-all active:scale-90">
             <Plus size={16} strokeWidth={3} />
          </button>
        </div>
      </div>

      <section className={sectionClass}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Portfolio Equity</p>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
              <span className="text-sm opacity-40 mr-1">{currencySymbol}</span>
              {stats.netWorth.toLocaleString()}
            </h2>
          </div>
          <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-xl">
            <ShieldCheck size={20} />
          </div>
        </div>
        <div className="mt-6 flex items-center gap-8">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowUpRight size={10} className="text-emerald-500" />
              <span className="text-[7px] font-black uppercase text-slate-400">Total Assets</span>
            </div>
            <p className="text-xs font-black text-slate-900 dark:text-white">
              {currencySymbol}{Math.round(stats.totalDebit + stats.otherAssets.reduce((s,i)=>s+i.value,0)).toLocaleString()}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowDownRight size={10} className="text-rose-500" />
              <span className="text-[7px] font-black uppercase text-slate-400">Total Liabilities</span>
            </div>
            <p className="text-xs font-black text-slate-900 dark:text-white">
              {currencySymbol}{stats.totalCredit.toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-2 mt-2">
        <section className={sectionClass}>
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Cash & Banking</h3>
          <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {stats.debitItems.map(item => (
              <div key={item.id} className="py-3 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center shrink-0">
                    <Landmark size={14} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-[11px] leading-none mb-1">{item.name}</h4>
                    <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">{item.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[11px] font-black text-slate-900 dark:text-white">{currencySymbol}{Math.round(item.value).toLocaleString()}</p>
                  <button onClick={() => handleEdit(item)} className="p-1 text-slate-300 hover:text-indigo-500 transition-all active:scale-90 opacity-0 group-hover:opacity-100">
                      <Edit3 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {stats.creditItems.length > 0 && (
          <section className={sectionClass}>
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Liabilities</h3>
            <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {stats.creditItems.map(item => (
                <div key={item.id} className="py-3 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center shrink-0">
                      <CreditCard size={14} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white text-[11px] leading-none mb-1">{item.name}</h4>
                      <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">{item.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-[11px] font-black text-rose-500">{currencySymbol}{Math.round(item.value).toLocaleString()}</p>
                    <button onClick={() => handleEdit(item)} className="p-1 text-slate-300 hover:text-indigo-500 active:scale-90 transition-all opacity-0 group-hover:opacity-100"><Edit3 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {stats.otherAssets.length > 0 && (
          <section className={sectionClass}>
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Investments</h3>
            <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {stats.otherAssets.map(item => (
                <div key={item.id} className="py-3 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center shrink-0">
                      <TrendingUp size={14} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white text-[11px] leading-none mb-1">{item.name}</h4>
                      <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">{item.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-[11px] font-black text-emerald-500">{currencySymbol}{Math.round(item.value).toLocaleString()}</p>
                    <button onClick={() => handleEdit(item)} className="p-1 text-slate-300 hover:text-indigo-500 active:scale-90 transition-all opacity-0 group-hover:opacity-100"><Edit3 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {showAccountForm && (
        <AccountForm 
          settings={settings}
          onSave={(item) => { onAddWealth(item); setShowAccountForm(false); }}
          onUpdate={(id, updates) => { onUpdateWealth(id, updates); setShowAccountForm(false); }}
          onCancel={() => { triggerHaptic(); setShowAccountForm(false); }}
          initialData={editingItem}
        />
      )}
    </div>
  );
};

export default Accounts;