import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, PiggyBank, Scale } from 'lucide-react';
import { AppState } from '../store';
import { formatCurrency } from '../lib/utils';

interface Props {
  state: AppState;
}

export default function Buffer({ state }: Props) {
  // Buffer = all income - all expenses - all savings transfers (lifetime)
  const totalIncome = useMemo(
    () => state.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [state.transactions]
  );

  const totalExpense = useMemo(
    () => state.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [state.transactions]
  );

  const totalSavingsTransferred = useMemo(
    () => state.savingsTransactions.reduce((s, t) => s + t.amount, 0),
    [state.savingsTransactions]
  );

  const buffer = totalIncome - totalExpense - totalSavingsTransferred;

  // Monthly breakdown
  const monthKey = new Date().toISOString().slice(0, 7);
  const monthlyIncome = state.transactions
    .filter((t) => t.type === 'income' && t.date.startsWith(monthKey))
    .reduce((s, t) => s + t.amount, 0);
  const monthlyExpense = state.transactions
    .filter((t) => t.type === 'expense' && t.date.startsWith(monthKey))
    .reduce((s, t) => s + t.amount, 0);
  const monthlySavings = state.savingsTransactions
    .filter((t) => t.date.startsWith(monthKey))
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      {/* Main balance card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
            <Scale className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Буфер (баланс)</h3>
            <p className="text-xs text-slate-500">Все доходы − расходы − сбережения</p>
          </div>
        </div>

        <p className={`text-4xl font-bold ${buffer >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
          {formatCurrency(buffer)}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          {buffer >= 0 ? 'Свободные деньги в буфере' : 'Недостаток для обязательств'}
        </p>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-emerald-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700">Доходы</span>
            </div>
            <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-rose-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              <span className="text-xs font-medium text-rose-700">Расходы</span>
            </div>
            <p className="text-lg font-bold text-rose-700">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <PiggyBank className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Сбережения</span>
            </div>
            <p className="text-lg font-bold text-amber-700">{formatCurrency(totalSavingsTransferred)}</p>
          </div>
        </div>
      </motion.div>

      {/* Monthly breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
      >
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Распределение за текущий месяц</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Доходы</span>
            <span className="text-sm font-semibold text-emerald-600">+{formatCurrency(monthlyIncome)}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: '100%' }} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Расходы</span>
            <span className="text-sm font-semibold text-rose-600">-{formatCurrency(monthlyExpense)}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-rose-400 rounded-full" style={{ width: `${monthlyIncome > 0 ? Math.min((monthlyExpense / monthlyIncome) * 100, 100) : 0}%` }} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Сбережения</span>
            <span className="text-sm font-semibold text-amber-600">-{formatCurrency(monthlySavings)}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${monthlyIncome > 0 ? Math.min((monthlySavings / monthlyIncome) * 100, 100) : 0}%` }} />
          </div>

          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">Остаток в буфере</span>
              <span className={`text-sm font-bold ${monthlyIncome - monthlyExpense - monthlySavings >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(monthlyIncome - monthlyExpense - monthlySavings)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
