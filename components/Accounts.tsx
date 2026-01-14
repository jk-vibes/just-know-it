import React, { useMemo, useState, useEffect } from 'react';
import { WealthItem, UserSettings, Expense, Income } from '../types';
import { getCurrencySymbol, CATEGORY_COLORS } from '../constants';
import { 
  Plus, Landmark, CreditCard, ShieldCheck, 
  Edit3, ArrowUpRight, ArrowDownRight, TrendingUp,
  ArrowLeft, ArrowRight, History, ArrowUpCircle, ArrowRightLeft,
  Wallet, PiggyBank, Briefcase
} from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface AccountsProps {
  wealthItems: WealthItem[];
  expenses: Expense[];
  incomes: Income[];
  settings: UserSettings;
  onUpdateWealth: (id: string, updates: Partial<WealthItem>) => void;
  onDeleteWealth: (id: string) => void;
  onAddWealth: (item: Omit<WealthItem, 'id'>) => void;
  onEditAccount: (account: WealthItem) => void;
  onAddAccountClick: () => void;
  onAddIncomeClick?: () => void;
  onAddTransferClick?: () => void;
  externalShowAdd?: boolean;
  onAddClose?: () => void;
}

const Accounts: React.FC<AccountsProps> = ({
  wealthItems, expenses, incomes, settings, onUpdateWealth, onDeleteWealth, onAddWealth, onEditAccount, onAddAccountClick, onAddIncomeClick, onAddTransferClick, externalShowAdd, onAddClose
}) => {
  const currencySymbol = getCurrencySymbol(settings.currency);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (externalShowAdd) {
      onAddAccountClick();
      onAddClose?.();
    }
  }, [externalShowAdd, onAddAccountClick, onAddClose]);

  const stats = useMemo(() => {
    const debitItems = wealthItems.filter(i => i.type === 'Investment');
    const creditItems = wealthItems.filter(i => i.type === 'Liability');
    const totalDebit = debitItems.reduce((sum, i) => sum + i.value, 0);
    const totalCredit = creditItems.reduce((sum, i) => sum + i.value, 0);
    const netWorth = totalDebit - totalCredit;
    return { debitItems, creditItems, totalDebit: Math.round(totalDebit), totalCredit: Math.round(totalCredit), netWorth: Math.round(netWorth) };
  }, [wealthItems]);

  const selectedAccount = useMemo(() => 
    wealthItems.find(w => w.id === selectedAccountId), 
  [wealthItems, selectedAccountId]);

  const accountTransactions = useMemo(() => {
    if (!selectedAccountId) return [];
    const accountExps = expenses.filter(e => e.sourceAccountId === selectedAccountId).map(e => ({ ...e, type: 'expense' as const }));
    const accountIncs = incomes.filter(i => i.targetAccountId === selectedAccountId).map(i => ({ ...i, type: 'income' as const }));
    return [...accountExps, ...accountIncs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedAccountId, expenses, incomes]);

  const handleEdit = (item: WealthItem, e?: React.MouseEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    triggerHaptic();
    onEditAccount(item);
  };

  const getAccountIcon = (category: string) => {
    if (category === 'Savings') return <PiggyBank size={16} />;
    if (category === 'Card') return <CreditCard size={16} />;
    if (category === 'Loan') return <Landmark size={16} />;
    if (category === 'Investment') return <TrendingUp size={16} />;
    return <Wallet size={16} />;
  };

  const sectionClass = `glass premium-card p-5 rounded-[32px] mb-3 relative overflow-hidden`;

  if (selectedAccountId && selectedAccount) {
    const color = selectedAccount.type === 'Liability' ? 'rose' : 'emerald';
    const gradient = selectedAccount.type === 'Liability' ? 'from-rose-700 to-rose-900' : 'from-emerald-600 to-teal-800';
    return (
      <div className="pb-32 pt-1 animate-slide-up">
        <div className={`bg-gradient-to-r ${gradient} px-5 py-4 rounded-2xl mb-4 mx-1 shadow-2xl relative overflow-hidden`}>
          <div className={`absolute inset-0 bg-${color}-500 opacity-10 blur-3xl rounded-full translate-x-1/2`}></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-5">
              <button 
                onClick={() => setSelectedAccountId(null)}
                className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white active:scale-90 transition-all border border-white/10"
              >
                <ArrowLeft size={18} strokeWidth={3} />
              </button>
              <div>
                <h1 className="text-sm font-black text-white tracking-tighter uppercase leading-none">Statement</h1>
                <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em] mt-1.5 truncate max-w-[160px]">{selectedAccount.alias || selectedAccount.name}</p>
              </div>
            </div>
            <button 
              onClick={(e) => handleEdit(selectedAccount, e)}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white active:scale-90 border border-white/10"
            >
              <Edit3 size={16} />
            </button>
          </div>
        </div>

        <section className={`${sectionClass} border-b-8 border-b-${color}-500`}>
          <div className="flex justify-between items-end relative z-10">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{selectedAccount.type === 'Liability' ? 'Balance Outstanding' : 'Authorized Balance'}</p>
              <h2 className={`text-4xl font-black tracking-tighter leading-none ${selectedAccount.type === 'Liability' ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                <span className="text-base opacity-40 mr-1 font-bold">{currencySymbol}</span>
                {Math.round(selectedAccount.value).toLocaleString()}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Type</p>
              <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${selectedAccount.type === 'Liability' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'} border border-current opacity-80`}>
                {selectedAccount.category}
              </span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
             <p className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em]">Neural ID: <span className="text-slate-500 dark:text-slate-400">{selectedAccount.name}</span></p>
          </div>
        </section>

        <div className="mt-6 px-1">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-3 flex items-center gap-2.5">
            <History size={12} strokeWidth={3} /> Temporal Ledger
          </h3>
          <div className="glass rounded-[32px] overflow-hidden shadow-sm border-white/10">
            {accountTransactions.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No Temporal Nodes Found</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {accountTransactions.map((tx: any) => (
                  <div key={tx.id} className="p-5 flex items-center justify-between group hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                    <div className="flex items-center gap-4">
                      <div 
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-[10px] shadow-lg`}
                        style={{ backgroundColor: tx.type === 'income' ? '#10b981' : CATEGORY_COLORS[tx.category] || '#64748b' }}
                      >
                        {tx.type === 'income' ? 'IN' : 'OUT'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[13px] font-black text-slate-800 dark:text-slate-100 truncate max-w-[140px] leading-tight tracking-tight">
                          {tx.merchant || tx.note || (tx.type === 'income' ? 'Direct Credit' : 'Payment')}
                        </h4>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1.5">
                          {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <p className={`text-base font-black tracking-tight ${tx.type === 'income' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
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
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-4 rounded-2xl mb-4 mx-1 shadow-xl relative overflow-hidden group">
        <div className="absolute inset-0 bg-white/5 pointer-events-none"></div>
        <div className="flex justify-between items-center w-full relative z-10">
          <div>
            <h1 className="text-sm font-black text-white tracking-tighter uppercase leading-none">Accounts</h1>
            <p className="text-[7px] font-black text-white/50 uppercase tracking-[0.2em] mt-1">Instrument Registry</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onAddTransferClick} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white border border-white/10 backdrop-blur-md transition-all active:scale-95"><ArrowRightLeft size={16} strokeWidth={2.5} /></button>
            <button onClick={onAddIncomeClick} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white border border-white/10 backdrop-blur-md transition-all active:scale-95"><ArrowUpCircle size={16} strokeWidth={2.5} /></button>
            <button onClick={onAddAccountClick} className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-white border border-white/20 backdrop-blur-md transition-all active:scale-95"><Plus size={16} strokeWidth={4} /></button>
          </div>
        </div>
      </div>

      <section className={sectionClass}>
        <div className="absolute top-0 right-0 p-4 opacity-10 text-emerald-500 rotate-12"><ShieldCheck size={80} /></div>
        <div className="flex justify-between items-start relative z-10">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Portfolio Equity</p>
            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
              <span className="text-base opacity-40 mr-1 font-bold">{currencySymbol}</span>
              {stats.netWorth.toLocaleString()}
            </h2>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-800">
            <ShieldCheck size={24} strokeWidth={2.5} />
          </div>
        </div>
        <div className="mt-8 flex items-center gap-10 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <ArrowUpRight size={12} strokeWidth={3} className="text-emerald-500" />
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Debit Assets</span>
            </div>
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {currencySymbol}{stats.totalDebit.toLocaleString()}
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <ArrowDownRight size={12} strokeWidth={3} className="text-rose-500" />
              <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Credit Debt</span>
            </div>
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {currencySymbol}{stats.totalCredit.toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-3 mt-4">
        <section className={sectionClass}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Asset Hub</h3>
            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full">Liquidity</span>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {stats.debitItems.map(item => (
              <div 
                key={item.id} 
                onClick={() => setSelectedAccountId(item.id)}
                className="py-4 flex items-center justify-between group cursor-pointer active:bg-slate-50 dark:active:bg-slate-800/30 transition-colors px-1 rounded-xl"
              >
                <div className="flex items-center gap-5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                    {getAccountIcon(item.category)}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-[13px] leading-none mb-1.5 group-hover:text-brand-primary transition-colors tracking-tight">{item.alias || item.name}</h4>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em]">{item.category} &rsaquo; {item.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-[14px] font-black text-slate-900 dark:text-white tracking-tight">{currencySymbol}{Math.round(item.value).toLocaleString()}</p>
                  <button onClick={(e) => handleEdit(item, e)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-indigo-500 transition-all active:scale-90">
                      <Edit3 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={sectionClass}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Liability Hub</h3>
            <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/10 px-2 py-0.5 rounded-full">Debt</span>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {stats.creditItems.map(item => (
              <div 
                key={item.id} 
                onClick={() => setSelectedAccountId(item.id)}
                className="py-4 flex items-center justify-between group cursor-pointer active:bg-slate-50 dark:active:bg-slate-800/30 transition-colors px-1 rounded-xl"
              >
                <div className="flex items-center gap-5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                    {getAccountIcon(item.category)}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-[13px] leading-none mb-1.5 group-hover:text-brand-primary transition-colors tracking-tight">{item.alias || item.name}</h4>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em]">{item.category} &rsaquo; {item.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-[14px] font-black text-rose-500 tracking-tight">{currencySymbol}{Math.round(item.value).toLocaleString()}</p>
                  <button onClick={(e) => handleEdit(item, e)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-indigo-500 transition-all active:scale-90"><Edit3 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Accounts;