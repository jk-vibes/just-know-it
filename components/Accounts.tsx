import React, { useMemo, useState, useEffect, useRef } from 'react';
import { WealthItem, UserSettings, Expense, Income } from '../types';
import { getCurrencySymbol, CATEGORY_COLORS } from '../constants';
import { 
  Plus, Landmark, CreditCard, ShieldCheck, 
  Edit3, ArrowUpRight, ArrowDownRight, TrendingUp,
  ArrowLeft, ArrowRight, History, ArrowUpCircle, ArrowRightLeft,
  Wallet, PiggyBank, Briefcase, Trash2
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
  onDeleteExpense: (id: string) => void;
  onDeleteIncome: (id: string) => void;
  externalShowAdd?: boolean;
  onAddClose?: () => void;
}

const SwipeableStatementItem: React.FC<{
  tx: any;
  currencySymbol: string;
  onDelete: (id: string, type: 'expense' | 'income') => void;
}> = ({ tx, currencySymbol, onDelete }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleting) return;
    if (e.touches.length > 0) { touchStartX.current = e.touches[0].clientX; setIsSwiping(true); }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDeleting || touchStartX.current === null || e.touches.length === 0) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    if (diff < 0) setOffsetX(diff);
  };
  const handleTouchEnd = () => {
    if (isDeleting) return;
    if (offsetX < -75) { 
      triggerHaptic(20); setOffsetX(-1000); setIsDeleting(true); 
      setTimeout(() => onDelete(tx.id, tx.type), 300); 
    }
    else setOffsetX(0);
    setIsSwiping(false);
    touchStartX.current = null;
  };

  return (
    <div className={`relative overflow-hidden transition-all duration-300 ${isDeleting ? 'max-h-0 opacity-0' : 'max-h-[120px] opacity-100'}`}>
      <div className="absolute inset-0 bg-rose-500 flex items-center justify-end px-6">
        <Trash2 className="text-white animate-pulse" size={18} />
      </div>
      <div 
        className="relative z-10 p-5 flex items-center justify-between group bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/40"
        style={{ transform: `translateX(${offsetX}px)`, transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      >
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
    </div>
  );
};

const SwipeableAccountItem: React.FC<{
  item: WealthItem;
  currencySymbol: string;
  onDelete: (id: string) => void;
  onEdit: (item: WealthItem, e: React.MouseEvent) => void;
  onClick: () => void;
}> = ({ item, currencySymbol, onDelete, onEdit, onClick }) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const totalMovementRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleting) return;
    if (e.touches.length > 0) { touchStartX.current = e.touches[0].clientX; totalMovementRef.current = 0; setIsSwiping(true); }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDeleting || touchStartX.current === null || e.touches.length === 0) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    totalMovementRef.current = Math.max(totalMovementRef.current, Math.abs(diff));
    if (diff < 0) setOffsetX(diff);
  };
  const handleTouchEnd = () => {
    if (isDeleting) return;
    if (offsetX < -75) { 
      if (window.confirm(`Permanently delete "${item.alias || item.name}" and all its records?`)) {
        triggerHaptic(30); setOffsetX(-1000); setIsDeleting(true); setTimeout(() => onDelete(item.id), 300); 
      } else {
        setOffsetX(0);
      }
    }
    else setOffsetX(0);
    setIsSwiping(false);
    touchStartX.current = null;
  };

  const getAccountIcon = (category: string) => {
    if (category === 'Savings') return <PiggyBank size={16} />;
    if (category === 'Card') return <CreditCard size={16} />;
    if (category === 'Loan') return <Landmark size={16} />;
    if (category === 'Investment') return <TrendingUp size={16} />;
    return <Wallet size={16} />;
  };

  return (
    <div className={`relative overflow-hidden transition-all duration-300 ${isDeleting ? 'max-h-0 opacity-0' : 'max-h-[100px] opacity-100'}`}>
      <div className="absolute inset-0 bg-rose-500 flex items-center justify-end px-6">
        <Trash2 className="text-white animate-pulse" size={20} />
      </div>
      <div 
        onClick={() => totalMovementRef.current < 10 && (triggerHaptic(), onClick())}
        className={`relative z-10 py-4 flex items-center justify-between group cursor-pointer bg-white dark:bg-slate-900 active:bg-slate-50 dark:active:bg-slate-800/30 transition-all px-1`}
        style={{ transform: `translateX(${offsetX}px)`, transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' }} 
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center gap-5">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 ${item.type === 'Liability' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500' : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500'}`}>
            {getAccountIcon(item.category)}
          </div>
          <div>
            <h4 className="font-black text-slate-900 dark:text-white text-[13px] leading-none mb-1.5 group-hover:text-brand-primary transition-colors tracking-tight">{item.alias || item.name}</h4>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em]">{item.category} &rsaquo; {item.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className={`text-[14px] font-black tracking-tight ${item.type === 'Liability' ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>{currencySymbol}{Math.round(item.value).toLocaleString()}</p>
          <button onClick={(e) => onEdit(item, e)} className="p-2 text-slate-300 dark:text-slate-600 hover:text-indigo-500 transition-all active:scale-90">
              <Edit3 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const Accounts: React.FC<AccountsProps> = ({
  wealthItems, expenses, incomes, settings, onUpdateWealth, onDeleteWealth, onAddWealth, onEditAccount, onAddAccountClick, onAddIncomeClick, onAddTransferClick, onDeleteExpense, onDeleteIncome, externalShowAdd, onAddClose
}) => {
  const currencySymbol = getCurrencySymbol(settings.currency);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  useEffect(() => {
    if (externalShowAdd) { onAddAccountClick(); onAddClose?.(); }
  }, [externalShowAdd, onAddAccountClick, onAddClose]);

  const stats = useMemo(() => {
    const debitItems = wealthItems.filter(i => i.type === 'Investment');
    const creditItems = wealthItems.filter(i => i.type === 'Liability');
    const totalDebit = debitItems.reduce((sum, i) => sum + i.value, 0);
    const totalCredit = creditItems.reduce((sum, i) => sum + i.value, 0);
    return { debitItems, creditItems, totalDebit: Math.round(totalDebit), totalCredit: Math.round(totalCredit), netWorth: Math.round(totalDebit - totalCredit) };
  }, [wealthItems]);

  const selectedAccount = useMemo(() => wealthItems.find(w => w.id === selectedAccountId), [wealthItems, selectedAccountId]);

  const accountTransactions = useMemo(() => {
    if (!selectedAccountId) return [];
    const accountExps = expenses.filter(e => e.sourceAccountId === selectedAccountId).map(e => ({ ...e, type: 'expense' as const }));
    const accountIncs = incomes.filter(i => i.targetAccountId === selectedAccountId).map(i => ({ ...i, type: 'income' as const }));
    return [...accountExps, ...accountIncs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedAccountId, expenses, incomes]);

  const handleDeleteStatementEntry = (id: string, type: 'expense' | 'income') => {
    if (type === 'expense') onDeleteExpense(id);
    else onDeleteIncome(id);
  };

  const handleEdit = (item: WealthItem, e?: React.MouseEvent) => {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    triggerHaptic();
    onEditAccount(item);
  };

  const sectionClass = `glass premium-card p-5 rounded-[32px] mb-3 relative overflow-hidden`;

  if (selectedAccountId && selectedAccount) {
    const color = selectedAccount.type === 'Liability' ? 'rose' : 'emerald';
    const gradient = selectedAccount.type === 'Liability' ? 'from-rose-700 to-rose-900' : 'from-brand-primary to-brand-secondary';
    return (
      <div className="animate-slide-up">
        <div className={`bg-gradient-to-r ${gradient} px-5 py-4 rounded-2xl mb-4 mx-1 shadow-2xl relative overflow-hidden`}>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-5">
              <button onClick={() => setSelectedAccountId(null)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white active:scale-90 transition-all border border-white/10"><ArrowLeft size={18} strokeWidth={3} /></button>
              <div>
                <h1 className="text-sm font-black text-white tracking-tighter uppercase leading-none">Statement</h1>
                <p className="text-[8px] font-black text-white/50 uppercase tracking-[0.2em] mt-1.5 truncate max-w-[160px]">{selectedAccount.alias || selectedAccount.name}</p>
              </div>
            </div>
            <button onClick={(e) => handleEdit(selectedAccount, e)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white active:scale-90 border border-white/10"><Edit3 size={16} /></button>
          </div>
        </div>

        <section className={`${sectionClass} border-b-8 border-b-${color}-500`}>
          <div className="flex justify-between items-end relative z-10">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{selectedAccount.type === 'Liability' ? 'Total Outstanding' : 'Available Balance'}</p>
              <h2 className={`text-4xl font-black tracking-tighter leading-none ${selectedAccount.type === 'Liability' ? 'text-rose-500' : 'text-slate-900 dark:text-white'}`}>
                <span className="text-base opacity-40 mr-1 font-bold">{currencySymbol}</span>
                {Math.round(selectedAccount.value).toLocaleString()}
              </h2>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Classification</p>
              <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${selectedAccount.type === 'Liability' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'} border border-current`}>
                {selectedAccount.category}
              </span>
            </div>
          </div>
        </section>

        <div className="mt-6 px-1">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-3 flex items-center gap-2.5">
            <History size={12} strokeWidth={3} /> Transaction History
          </h3>
          <div className="glass rounded-[32px] overflow-hidden shadow-sm border-white/10 divide-y divide-slate-100 dark:divide-slate-800/40">
            {accountTransactions.length === 0 ? (
              <div className="py-20 text-center"><p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No Recorded Activity</p></div>
            ) : (
              accountTransactions.map((tx: any) => (
                <SwipeableStatementItem key={tx.id} tx={tx} currencySymbol={currencySymbol} onDelete={handleDeleteStatementEntry} />
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <div className="bg-gradient-to-r from-brand-primary to-brand-secondary px-5 py-4 rounded-2xl mb-4 mx-1 shadow-xl relative overflow-hidden group">
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
      </section>

      <div className="space-y-3 mt-4">
        <section className={sectionClass}>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-5 pl-1">Assets</h3>
          <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {stats.debitItems.map(item => (
              <SwipeableAccountItem key={item.id} item={item} currencySymbol={currencySymbol} onDelete={onDeleteWealth} onEdit={handleEdit} onClick={() => setSelectedAccountId(item.id)} />
            ))}
          </div>
        </section>

        <section className={sectionClass}>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-5 pl-1">Liabilities</h3>
          <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
            {stats.creditItems.map(item => (
              <SwipeableAccountItem key={item.id} item={item} currencySymbol={currencySymbol} onDelete={onDeleteWealth} onEdit={handleEdit} onClick={() => setSelectedAccountId(item.id)} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Accounts;