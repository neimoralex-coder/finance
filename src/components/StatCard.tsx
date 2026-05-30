import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';
import { formatCurrency } from '../lib/utils';

interface StatCardProps {
  title: string;
  amount: number;
  type: 'income' | 'expense' | 'balance' | 'savings';
  subtitle?: string;
  index?: number;
}

const icons = {
  income: TrendingUp,
  expense: TrendingDown,
  balance: Wallet,
  savings: PiggyBank,
};

const gradients = {
  income: 'from-emerald-500 to-teal-600',
  expense: 'from-rose-500 to-pink-600',
  balance: 'from-blue-500 to-indigo-600',
  savings: 'from-amber-500 to-orange-600',
};

const bgColors = {
  income: 'bg-emerald-50',
  expense: 'bg-rose-50',
  balance: 'bg-blue-50',
  savings: 'bg-amber-50',
};

const textColors = {
  income: 'text-emerald-700',
  expense: 'text-rose-700',
  balance: 'text-blue-700',
  savings: 'text-amber-700',
};

export default function StatCard({ title, amount, type, subtitle, index = 0 }: StatCardProps) {
  const Icon = icons[type];
  const isNegative = amount < 0 && type === 'balance';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${bgColors[type]} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${textColors[type]}`} />
        </div>
        {type === 'income' && (
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            +
          </span>
        )}
        {type === 'expense' && (
          <span className="text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
            -
          </span>
        )}
      </div>
      <p className="text-sm text-slate-500 mb-1">{title}</p>
      <p className={`text-2xl font-bold ${isNegative ? 'text-rose-600' : 'text-slate-900'}`}>
        {formatCurrency(Math.abs(amount))}
      </p>
      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </motion.div>
  );
}
