import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, PiggyBank, Scale, RotateCcw, CheckCircle2 } from 'lucide-react';
import { AppState } from '../store';
import { formatCurrency } from '../lib/utils';

interface Props {
  state: AppState;
  onAddBufferTransaction: (tx: { amount: number; date: string; note: string }) => void;
}

export default function Buffer({ state, onAddBufferTransaction }: Props) {
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('Возврат долга перед буфером');

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
  const availableBuffer = buffer - state.bufferDebt;

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

  const repay = () => {
    const value = Math.max(0, Number(amount));
    if (!value) return;
    onAddBufferTransaction({
      amount: value,
      date: new Date().toISOString().slice(0, 10),
      note: note || 'Пополнение буфера',
    });
    setAmount('');
    setNote('Возврат долга перед буфером');
  };

  return (
    <div className="space-y-6">
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
            <h3 className="text-sm font-semibold text-slate-900">Буфер</h3>
            <p className="text-xs text-slate-500">Свободные деньги − долг перед буфером</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-xs text-slate-500">Расчётный буфер</p>
            <p className={`text-2xl font-bold ${buffer >= 0 ? 'text-slate-900' : 'text-red-600'}`}>{formatCurrency(buffer)}</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-100">
            <p className="text-xs text-red-700">Долг перед буфером</p>
            <p className="text-2xl font-bold text-red-700">{formatCurrency(state.bufferDebt)}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <p className="text-xs text-blue-700">Реально доступно</p>
            <p className={`text-2xl font-bold ${availableBuffer >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{formatCurrency(availableBuffer)}</p>
          </div>
        </div>

        {state.bufferDebt > 0 ? (
          <div className="mt-4 bg-white rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <RotateCcw className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-semibold text-slate-900">Пополнить буфер</p>
            </div>
            <p className="text-xs text-slate-500 mb-3">Если перерасход был покрыт из буфера, это считается долгом. Вернул — долг уменьшается.</p>
            <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Сумма"
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-500"
              />
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Комментарий"
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-500"
              />
              <button onClick={repay} className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
                Пополнить
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-sm text-emerald-700">
            <CheckCircle2 className="w-4 h-4 mt-0.5" />
            Долга перед буфером нет. Буфер чистый, сэр.
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
      >
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Общая картина</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1"><TrendingUp className="w-4 h-4 text-emerald-600" /><span className="text-xs font-medium text-emerald-700">Доходы</span></div>
            <p className="text-lg font-bold text-emerald-700">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-rose-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1"><TrendingDown className="w-4 h-4 text-rose-600" /><span className="text-xs font-medium text-rose-700">Расходы</span></div>
            <p className="text-lg font-bold text-rose-700">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1"><PiggyBank className="w-4 h-4 text-amber-600" /><span className="text-xs font-medium text-amber-700">Сбережения</span></div>
            <p className="text-lg font-bold text-amber-700">{formatCurrency(totalSavingsTransferred)}</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
      >
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Текущий месяц</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-600">Доходы</span><span className="font-semibold text-emerald-600">+{formatCurrency(monthlyIncome)}</span></div>
          <div className="flex justify-between"><span className="text-slate-600">Расходы</span><span className="font-semibold text-rose-600">-{formatCurrency(monthlyExpense)}</span></div>
          <div className="flex justify-between"><span className="text-slate-600">Сбережения</span><span className="font-semibold text-amber-600">-{formatCurrency(monthlySavings)}</span></div>
          <div className="border-t border-slate-100 pt-3 flex justify-between"><span className="font-semibold text-slate-900">Итог месяца</span><span className={`font-bold ${monthlyIncome - monthlyExpense - monthlySavings >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(monthlyIncome - monthlyExpense - monthlySavings)}</span></div>
        </div>
      </motion.div>

      {state.bufferTransactions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">История пополнений буфера</h3>
          <div className="space-y-2">
            {state.bufferTransactions.slice(0, 8).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div><p className="text-sm text-slate-900">{tx.note}</p><p className="text-xs text-slate-400">{tx.date}</p></div>
                <p className="text-sm font-semibold text-blue-600">{formatCurrency(tx.amount)}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
