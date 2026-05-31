import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, TrendingUp, PiggyBank, ChevronRight, Wallet } from 'lucide-react';
import { AppState } from '../store';
import { formatCurrency, getCurrentMonthStart, getCurrentMonthEnd, getMonthYear } from '../lib/utils';
import StatCard from './StatCard';
import { getCategoryColor } from '../types';
import MonthlyBudgetWidget from './MonthlyBudgetWidget';

interface Props {
  state: AppState;
  onAddClick: () => void;
  onSavingsClick: () => void;
  onBudgetClick: () => void;
}

export default function Dashboard({ state, onAddClick, onSavingsClick, onBudgetClick }: Props) {
  const monthStart = getCurrentMonthStart();
  const monthEnd = getCurrentMonthEnd();
  const currentMonth = getMonthYear(monthStart);
  const monthKey = new Date().toISOString().slice(0, 7);

  const monthlyTransactions = useMemo(() => {
  return state.transactions.filter((t) => t.date.startsWith(monthKey));
}, [state.transactions, monthKey]);

  const income = useMemo(
    () => monthlyTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [monthlyTransactions]
  );

  const expense = useMemo(
    () => monthlyTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [monthlyTransactions]
  );

  // Buffer = all income - all expenses - all savings (lifetime)
  const totalIncome = state.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = state.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalSavingsTransferred = state.savingsTransactions.reduce((s, t) => s + t.amount, 0);
  const buffer = totalIncome - totalExpense - totalSavingsTransferred;

  // Savings monthly progress
  const currentMonthActual = useMemo(() => {
    const map = new Map<string, number>();
    state.savingsTransactions
      .filter((t) => t.date.startsWith(monthKey))
      .forEach((t) => {
        map.set(t.goalId, (map.get(t.goalId) || 0) + t.amount);
      });
    return map;
  }, [state.savingsTransactions, monthKey]);

  const savingsPlanned = state.savingsGoals.reduce((s, g) => s + g.monthlyTarget, 0);
  const savingsActual = state.savingsGoals.reduce((s, g) => s + (currentMonthActual.get(g.id) || 0), 0);
  const savingsPercent = savingsPlanned > 0 ? (savingsActual / savingsPlanned) * 100 : 0;
  const savingsShort = savingsActual < savingsPlanned;

  const totalSaved = state.savingsGoals.reduce((s, g) => s + g.current, 0);

  const categoryExpenses = useMemo(() => {
    const map = new Map<string, number>();
    monthlyTransactions.filter((t) => t.type === 'expense').forEach((t) => {
      map.set(t.category, (map.get(t.category) || 0) + t.amount);
    });
    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount, color: getCategoryColor(category, 'expense') }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [monthlyTransactions]);

  const memberStats = useMemo(() => {
    return state.members.map((m) => {
      const mIncome = monthlyTransactions.filter((t) => t.member === m.id && t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const mExpense = monthlyTransactions.filter((t) => t.member === m.id && t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return { ...m, income: mIncome, expense: mExpense };
    });
  }, [state.members, monthlyTransactions]);

  const recentTransactions = useMemo(() => {
    return [...state.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  }, [state.transactions]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Доходы" amount={income} type="income" subtitle={currentMonth} index={0} />
        <StatCard title="Расходы" amount={expense} type="expense" subtitle={currentMonth} index={1} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={onSavingsClick}
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-emerald-600" />
            </div>
            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
          </div>
          <p className="text-sm text-slate-500 mb-1">Сбережения за месяц</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(savingsActual)}</p>
          <p className="text-xs text-slate-400 mt-1">
            из {formatCurrency(savingsPlanned)} обязательных
            {savingsShort && <span className="text-amber-500 ml-1">· Не хватает {formatCurrency(savingsPlanned - savingsActual)}</span>}
          </p>
          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(savingsPercent, 100)}%` }}
              transition={{ duration: 0.8 }}
              className={`h-full rounded-full ${savingsShort ? 'bg-amber-400' : 'bg-emerald-400'}`}
            />
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-slate-500 mb-1">Буфер (баланс)</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(buffer)}</p>
          <p className="text-xs text-slate-400 mt-1">
            Все доходы − расходы − сбережения
          </p>
          <p className="text-xs text-slate-400 mt-1">Всего отложено: <strong className="text-slate-700">{formatCurrency(totalSaved)}</strong></p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1st column: Monthly Budget */}
        <MonthlyBudgetWidget state={state} onClick={onBudgetClick} />

        {/* 2nd column: Top categories */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
        >
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Топ категорий расходов</h3>
          {categoryExpenses.length > 0 ? (
            <div className="space-y-3">
              {categoryExpenses.map((cat) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700 truncate">{cat.category}</span>
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(cat.amount)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((cat.amount / expense) * 100, 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">Нет расходов в этом месяце</p>
          )}
        </motion.div>

        {/* 3rd column: Members + Recent */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">По участникам</h3>
            <div className="space-y-4">
              {memberStats.map((m) => (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0" style={{ backgroundColor: m.color }}>
                    {m.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-900">{m.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 text-emerald-600">
                        <ArrowUpRight className="w-3 h-3" />
                        {formatCurrency(m.income)}
                      </span>
                      <span className="flex items-center gap-1 text-rose-600">
                        <ArrowDownRight className="w-3 h-3" />
                        {formatCurrency(m.expense)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 bg-slate-100 rounded-full overflow-hidden flex">
                      {m.income + m.expense > 0 && (
                        <>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(m.income / (m.income + m.expense)) * 100}%` }} transition={{ duration: 0.8 }} className="h-full bg-emerald-400" />
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(m.expense / (m.income + m.expense)) * 100}%` }} transition={{ duration: 0.8 }} className="h-full bg-rose-400" />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Последние операции</h3>
            <div className="space-y-2">
              {recentTransactions.map((t) => {
                const member = state.members.find((m) => m.id === t.member);
                return (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ backgroundColor: member?.color || '#9ca3af' }}>
                        {member?.avatar || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-slate-900 truncate">{t.description}</p>
                        <p className="text-xs text-slate-400">{t.category}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold flex-shrink-0 ${t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
            <button onClick={onAddClick} className="w-full mt-3 py-2 text-sm text-blue-600 font-medium hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Добавить транзакцию
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
