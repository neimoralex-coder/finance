import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Check, X, Lock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { AppState } from '../store';
import { BudgetTemplate } from '../types';
import { formatCurrency } from '../lib/utils';

interface Props {
  state: AppState;
  onAddTemplate: (t: Omit<BudgetTemplate, 'id'>) => void;
  onUpdateTemplate: (id: string, updates: Partial<BudgetTemplate>) => void;
  onDeleteTemplate: (id: string) => void;
  onCloseMonth: (month: string) => void;
}

export default function MonthlyBudgetPage({ state, onAddTemplate, onUpdateTemplate, onDeleteTemplate, onCloseMonth }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const sortedBudgets = useMemo(() => {
    return [...state.monthlyBudgets].sort((a, b) => b.month.localeCompare(a.month));
  }, [state.monthlyBudgets]);

  const openBudgets = sortedBudgets.filter((mb) => mb.status === 'open');
  const currentMB = openBudgets[0] || null;
  const activeMonth = currentMB?.month || new Date().toISOString().slice(0, 7);

  const currentItems = useMemo(() => {
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

  const totalLimit = currentItems.reduce((s, it) => s + (it?.limit || 0), 0);
  const totalSpent = currentItems.reduce((s, it) => s + (it?.spent || 0), 0);
  const totalPercent = totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0;
  const isOverTotal = totalSpent > totalLimit;

  const handleAdd = () => {
    if (!newName || !newLimit) return;
    onAddTemplate({ name: newName, limit: parseFloat(newLimit), order: state.budgetTemplates.length });
    setNewName('');
    setNewLimit('');
    setShowAdd(false);
  };

  const startEdit = (t: BudgetTemplate) => {
    setEditingId(t.id);
    setEditName(t.name);
    setEditLimit(t.limit.toString());
  };

  const saveEdit = (id: string) => {
    const val = parseFloat(editLimit);
    if (editName && val > 0) {
      onUpdateTemplate(id, { name: editName, limit: val });
    }
    setEditingId(null);
  };

  const monthLabel = (m: string) => {
    const [y, mo] = m.split('-');
    const d = new Date(parseInt(y), parseInt(mo) - 1, 1);
    return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Current month summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Бюджет на {monthLabel(activeMonth)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentMB?.status === 'open' ? 'Активный месяц' : 'Нет активного бюджета'}
            </p>
          </div>
          {currentMB?.status === 'open' && (
            <>
              {!confirmClose ? (
                <button
                  onClick={() => setConfirmClose(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl shadow-md hover:bg-slate-800 transition-all"
                >
                  <Lock className="w-4 h-4" />
                  Закрыть месяц
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { onCloseMonth(activeMonth); setConfirmClose(false); }}
                    className="px-3 py-2 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Закрыть
                  </button>
                  <button
                    onClick={() => setConfirmClose(false)}
                    className="px-3 py-2 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Отмена
                  </button>
                </div>
              )}
            </>
          )}
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

        {isOverTotal && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl mb-3">
            <AlertTriangle className="w-4 h-4" />
            Перерасход бюджета на {formatCurrency(totalSpent - totalLimit)}
          </div>
        )}

        {!isOverTotal && totalPercent > 80 && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-xl mb-3">
            <AlertTriangle className="w-4 h-4" />
            Осталось {formatCurrency(totalLimit - totalSpent)} — {Math.round(100 - totalPercent)}%
          </div>
        )}
      </motion.div>

      {/* Budget items */}
      <div className="space-y-3">
        {currentItems.map((it, i) => {
          if (!it) return null;
          const template = state.budgetTemplates.find((t) => t.id === it.templateId);
          const isEditing = editingId === it.templateId;

          return (
            <motion.div
              key={it.templateId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-white rounded-2xl p-5 shadow-sm border transition-all ${
                it.over ? 'border-red-200' : it.percent > 80 ? 'border-amber-200' : 'border-slate-100'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500"
                      />
                      <div className="relative">
                        <input
                          type="number"
                          value={editLimit}
                          onChange={(e) => setEditLimit(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₽</span>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-slate-900">{it.name}</h4>
                        <span className={`text-sm font-bold ${it.over ? 'text-red-600' : it.percent > 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {Math.round(it.percent)}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatCurrency(it.spent)} из {formatCurrency(it.limit)}
                        {it.over && (
                          <span className="text-red-500 ml-2">Перерасход {formatCurrency(it.spent - it.limit)}</span>
                        )}
                        {!it.over && (
                          <span className="text-slate-400 ml-2">Осталось {formatCurrency(it.remaining)}</span>
                        )}
                      </p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-3">
                  {isEditing ? (
                    <>
                      <button onClick={() => saveEdit(it.templateId)} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => template && startEdit(template)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => onDeleteTemplate(it.templateId)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(it.percent, 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${it.over ? 'bg-red-500' : it.percent > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add new item */}
      <AnimatePresence>
        {showAdd ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 overflow-hidden"
          >
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Новый пункт бюджета</h4>
            <div className="flex gap-3">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Название"
                className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
              />
              <div className="relative w-40">
                <input
                  type="number"
                  value={newLimit}
                  onChange={(e) => setNewLimit(e.target.value)}
                  placeholder="Лимит"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₽</span>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleAdd}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all"
              >
                Добавить
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Отмена
              </button>
            </div>
          </motion.div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 text-sm font-medium hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Добавить пункт бюджета
          </button>
        )}
      </AnimatePresence>

      {/* History */}
      {sortedBudgets.filter((mb) => mb.status === 'closed').length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">История бюджетов</h3>
          {sortedBudgets
            .filter((mb) => mb.status === 'closed')
            .map((mb) => {
              const isExpanded = expandedMonth === mb.month;
              const mbTotalLimit = mb.items.reduce((s, it) => {
                const t = state.budgetTemplates.find((tm) => tm.id === it.templateId);
                return s + (t?.limit || 0);
              }, 0);
              const mbTotalSpent = mb.items.reduce((s, it) => s + it.spent, 0);

              return (
                <motion.div
                  key={mb.month}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedMonth(isExpanded ? null : mb.month)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-slate-900">{monthLabel(mb.month)}</p>
                        <p className="text-xs text-slate-500">
                          {formatCurrency(mbTotalSpent)} из {formatCurrency(mbTotalLimit)}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-4 space-y-2">
                          {mb.items.map((item) => {
                            const template = state.budgetTemplates.find((t) => t.id === item.templateId);
                            if (!template) return null;
                            const percent = template.limit > 0 ? (item.spent / template.limit) * 100 : 0;
                            return (
                              <div key={item.templateId} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                                <div className="flex-1">
                                  <p className="text-sm text-slate-700">{template.name}</p>
                                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1 w-32">
                                    <div
                                      className={`h-full rounded-full ${percent > 100 ? 'bg-red-400' : 'bg-blue-400'}`}
                                      style={{ width: `${Math.min(percent, 100)}%` }}
                                    />
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-slate-900">{formatCurrency(item.spent)}</p>
                                  <p className="text-xs text-slate-400">из {formatCurrency(template.limit)}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
        </div>
      )}
    </div>
  );
}
