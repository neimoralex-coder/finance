import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, ChevronRight } from 'lucide-react';
import { AppState } from '../store';
import { formatCurrency } from '../lib/utils';

interface Props {
  state: AppState;
  onClick: () => void;
}

export default function MonthlyBudgetWidget({ state, onClick }: Props) {
  const currentMB = useMemo(() => {
    const openBudgets = state.monthlyBudgets
      .filter((mb) => mb.status === 'open')
      .sort((a, b) => b.month.localeCompare(a.month));
    return openBudgets[0] || null;
  }, [state.monthlyBudgets]);

  const items = useMemo(() => {
    if (!currentMB) return [];
    return currentMB.items
      .map((item) => {
        const template = state.budgetTemplates.find((t) => t.id === item.templateId);
        if (!template) return null;
        const percent = template.limit > 0 ? (item.spent / template.limit) * 100 : 0;
        const remaining = template.limit - item.spent;
        return {
          ...item,
          name: template.name,
          limit: template.limit,
          percent,
          remaining,
          over: item.spent > template.limit,
        };
      })
      .filter(Boolean)
      .sort((a, b) => (b?.percent || 0) - (a?.percent || 0));
  }, [currentMB, state.budgetTemplates]);

  const totalLimit = items.reduce((s, it) => s + (it?.limit || 0), 0);
  const totalSpent = items.reduce((s, it) => s + (it?.spent || 0), 0);
  const totalPercent = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
  const isOverTotal = totalSpent > totalLimit;

  if (!currentMB) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={onClick}
        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer"
      >
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-5 h-5 text-blue-500" />
          <h3 className="text-sm font-semibold text-slate-900">Бюджет на месяц</h3>
        </div>
        <p className="text-sm text-slate-400">Нет активного бюджета · Нажмите для создания</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-500" />
          <h3 className="text-sm font-semibold text-slate-900">Бюджет на месяц</h3>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
      </div>

      <div className="flex items-end gap-4 mb-3">
        <div>
          <p className="text-3xl font-bold text-slate-900">{formatCurrency(totalSpent)}</p>
          <p className="text-sm text-slate-500">из {formatCurrency(totalLimit)}</p>
        </div>
        <div className="flex-1 pb-1.5">
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(totalPercent, 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full ${isOverTotal ? 'bg-red-500' : totalPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {items.slice(0, 5).map((it) => {
          if (!it) return null;
          return (
            <div key={it.templateId} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-700 truncate">{it.name}</span>
                  <span className={`text-xs font-semibold ${it.over ? 'text-red-600' : it.percent > 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {Math.round(it.percent)}%
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(it.percent, 100)}%` }}
                    transition={{ duration: 0.8 }}
                    className={`h-full rounded-full ${it.over ? 'bg-red-500' : it.percent > 80 ? 'bg-amber-500' : 'bg-blue-400'}`}
                  />
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] text-slate-400">{formatCurrency(it.spent)} из {formatCurrency(it.limit)}</span>
                  {it.over ? (
                    <span className="text-[10px] text-red-500 font-medium">Перерасход {formatCurrency(Math.abs(it.remaining))}</span>
                  ) : (
                    <span className="text-[10px] text-slate-400">Осталось {formatCurrency(it.remaining)}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {items.length > 5 && (
        <p className="text-xs text-slate-400 mt-3 text-center">+ещё {items.length - 5} пунктов</p>
      )}
    </motion.div>
  );
}
