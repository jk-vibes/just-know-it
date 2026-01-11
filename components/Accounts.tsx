import React, { useMemo, useState, useEffect } from 'react';
import { WealthItem, UserSettings, Expense, Income } from '../types';
import { getCurrencySymbol, CATEGORY_COLORS } from '../constants';
import { 
  Plus, Landmark, CreditCard, ShieldCheck, 
  Edit3, ArrowUpRight, ArrowDownRight, TrendingUp,
  ArrowLeft, ArrowRight, History
} from 'lucide-react';
import AccountForm from './AccountForm';
import { triggerHaptic } from '../utils/haptics';

interface AccountsProps {
  wealthItems: WealthItem[];
  expenses: Expense[];
  incomes: Income[];
  settings: UserSettings;
  onUpdateWealth: (id: string, updates: Partial<WealthItem>) => void;
  onDeleteWealth: (id: string) => void;
  onAddWealth: (item: Omit<WealthItem, 'id'>) => void;
  externalShowAdd?: boolean;
  onAddClose?: () => void;
}

const Accounts: React.FC<AccountsProps> = ({
  wealthItems, expenses, incomes, settings, onUpdateWealth, onDeleteWealth, onAddWealth, externalShowAdd, onAddClose
}) => {
  const currencySymbol = getCurrencySymbol(settings.currency);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingItem, setEditingItem] = useState<WealthItem | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (externalShowAdd) {
      handleAdd();
      onAddClose?.();
    }
  }, [externalShowAdd, onAddClose]);

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

  const selectedAccount = useMemo(() => 
    wealthItems.find(w => w.id === selectedAccountId), 
  [wealthItems, selectedAccountId]);

  const accountTransactions = useMemo(() => {
    if (!selectedAccountId) return [];
    
    const accountExps = expenses
      .filter(e => e.sourceAccountId === selectedAccountId)
      .map(e => ({ ...e, type: 'expense' as const }));
    
    const accountIncs = incomes
      .filter(i => i.targetAccountId === selectedAccountId)
      .map(i => ({ ...i, type: 'income' as const }));
    
    return [...accountExps, ...accountIncs].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [selectedAccountId, expenses, incomes]);

  const handleEdit = (item: WealthItem, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    setEditingItem(item);
    setShowAccountForm(true);
  };

  const handleAdd = () => {
    triggerHaptic();
    setEditingItem(null);
    setShowAccountForm(true);
  };

  const handleAccountClick = (id: string) => {
    triggerHaptic();
    setSelectedAccountId(id);
  };

  const sectionClass = "bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 mb-2 shadow-sm";

  if (selectedAccountId && selectedAccount) {
    return (
      <div className="pb-32 pt-1 animate-slide-up">
        <div className="bg-gradient-to-r from-slate-800 to-slate-950 dark:from-slate-900 dark:to-black px-5 py-4 rounded-2xl mb-4 mx-1">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { triggerHaptic(); setSelectedAccountId(null); }}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white active:scale-90 transition-all"
            >
              <ArrowLeft size={18} strokeWidth={3} />
            </button>
            <div>
              <h1 className="text-sm font-black text-white tracking-tighter uppercase leading-none">Statement</h1>
              <p className="text-[7px] font-black text-white/50 uppercase tracking-[0.2em] mt-1 truncate max-w-[200px]">{selectedAccount.name}</p>
            </div>
          </div>
        </div>

        <section className={sectionClass}>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Available Balance</p>
              <h2 className={`text-2xl font-black tracking-tighter leading-none ${selectedAccount.type === 'Liability' ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                <span className="text-sm opacity-40 mr-1">{currencySymbol}</span>
                {Math.round(selectedAccount.value).toLocaleString()}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Account Category</p>
              <span className="text-[10px] font-black uppercase text-brand-primary bg-brand-primary/5 px-2 py-1 rounded-lg">
                {selectedAccount.category}
              </span>
            </div>
          </div>
        </section>

        <div className="mt-4 px-1">
          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-2 flex items-center gap-2">
            <History size={10} /> Transaction Timeline
          </h3>
          <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            {accountTransactions.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No transaction history</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 dark:divide-slate-800/40">
                {accountTransactions.map((tx: any) => (
                  <div key={tx.id} className="p-4 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-[9px]"
                        style={{ backgroundColor: tx.type === 'income' ? '#10b981' : CATEGORY_COLORS[tx.category] }}
                      >
                        {tx.type === 'income' ? 'IN' : 'OUT'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px] leading-tight">
                          {tx.merchant || tx.note || (tx.type === 'income' ? 'Income' : 'Expense')}
                        </h4>
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-tight">
                          {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <p className={`text-[12px] font-black ${tx.type === 'income' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                      {tx.type === 'income' ? '+' : '-'}{currencySymbol}{Math.round(tx.amount).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32 pt-1 animate-slide-up">
      <div className="bg-gradient-to-r from-emerald-600 to-indigo-600 px-5 py-4 rounded-2xl mb-1 shadow-md">
        <div className="flex justify-between items-center w-full">
          <div>
            <h1 className="text-sm font-black text-white tracking-tighter uppercase leading-none">Accounts</h1>
            <p className="text-[7px] font-black text-white/50 uppercase tracking-[0.2em] mt-1">Registry</p>
          </div>
          {/* Header Plus Icon Removed - Now handled by FAB morph */}
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
              <div 
                key={item.id} 
                onClick={() => handleAccountClick(item.id)}
                className="py-3 flex items-center justify-between group cursor-pointer active:bg-slate-50 dark:active:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center shrink-0">
                    <Landmark size={14} />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-[11px] leading-none mb-1 group-hover:text-brand-primary transition-colors">{item.name}</h4>
                    <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">{item.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-[11px] font-black text-slate-900 dark:text-white">{currencySymbol}{Math.round(item.value).toLocaleString()}</p>
                  <button onClick={(e) => handleEdit(item, e)} className="p-1 text-slate-300 hover:text-indigo-500 transition-all active:scale-90 opacity-0 group-hover:opacity-100">
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
                <div 
                  key={item.id} 
                  onClick={() => handleAccountClick(item.id)}
                  className="py-3 flex items-center justify-between group cursor-pointer active:bg-slate-50 dark:active:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center shrink-0">
                      <CreditCard size={14} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white text-[11px] leading-none mb-1 group-hover:text-brand-primary transition-colors">{item.name}</h4>
                      <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">{item.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-[11px] font-black text-rose-500">{currencySymbol}{Math.round(item.value).toLocaleString()}</p>
                    <button onClick={(e) => handleEdit(item, e)} className="p-1 text-slate-300 hover:text-indigo-500 active:scale-90 transition-all opacity-0 group-hover:opacity-100"><Edit3 size={14} /></button>
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
                <div 
                  key={item.id} 
                  onClick={() => handleAccountClick(item.id)}
                  className="py-3 flex items-center justify-between group cursor-pointer active:bg-slate-50 dark:active:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center shrink-0">
                      <TrendingUp size={14} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white text-[11px] leading-none mb-1 group-hover:text-brand-primary transition-colors">{item.name}</h4>
                      <p className="text-[7px] font-bold text-slate-400 uppercase tracking-tight">{item.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-[11px] font-black text-emerald-500">{currencySymbol}{Math.round(item.value).toLocaleString()}</p>
                    <button onClick={(e) => handleEdit(item, e)} className="p-1 text-slate-300 hover:text-indigo-500 active:scale-90 transition-all opacity-0 group-hover:opacity-100"><Edit3 size={14} /></button>
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