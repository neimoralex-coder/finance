import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Check, X, ArrowUpRight, Target, ChevronUp, AlertTriangle } from 'lucide-react';
import { AppState } from '../store';
import { SavingsGoal, Member } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';

interface Props {
  state: AppState;
  onAddSavings: (tx: { goalId: string; amount: number; date: string; note: string; member: Member }) => void;
  onDeleteSavings: (id: string) => void;
  onUpdateGoal: (id: string, updates: Partial<SavingsGoal>) => void;
  onAddGoal: (goal: Omit<SavingsGoal, 'id'>) => void;
  onDeleteGoal: (id: string) => void;
}

export default function Savings({ state, onAddSavings, onDeleteSavings, onUpdateGoal, onAddGoal, onDeleteGoal }: Props) {
  const [showAddTx, setShowAddTx] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [addTxForm, setAddTxForm] = useState({
    goalId: '',
    amount: '',
    note: '',
    date: new Date().toISOString().split('T')[0],
    member: 'person1' as Member,
  });
  const [addGoalForm, setAddGoalForm] = useState({
    name: '',
    monthlyTarget: '',
    color: '#10b981',
    icon: '💰',
  });
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [editMonthlyTarget, setEditMonthlyTarget] = useState('');
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const currentMonth = new Date().toISOString().slice(0, 7);

  // Calculate monthly actual per goal from transactions
  const currentMonthActual = useMemo(() => {
    const map = new Map<string, number>();
    state.savingsTransactions
      .filter((t) => t.date.startsWith(currentMonth))
      .forEach((t) => {
        map.set(t.goalId, (map.get(t.goalId) || 0) + t.amount);
      });
    return map;
  }, [state.savingsTransactions, currentMonth]);

  const items = useMemo(() => {
    return state.savingsGoals
      .map((goal) => {
        const actual = currentMonthActual.get(goal.id) || 0;
        const percent = goal.monthlyTarget > 0 ? (actual / goal.monthlyTarget) * 100 : 0;
        return {
          ...goal,
          actual,
          percent,
          short: actual < goal.monthlyTarget,
        };
      })
      .sort((a, b) => b.percent - a.percent);
  }, [state.savingsGoals, currentMonthActual]);

  const totalPlanned = items.reduce((s, it) => s + it.monthlyTarget, 0);
  const totalActual = items.reduce((s, it) => s + it.actual, 0);
  const totalPercent = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0;
  const isShortTotal = totalActual < totalPlanned;

  const totalSaved = state.savingsGoals.reduce((s, g) => s + g.current, 0);

  const goalTransactions = useMemo(() => {
    if (!selectedGoal) return [];
    return state.savingsTransactions
      .filter((t) => t.goalId === selectedGoal)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.savingsTransactions, selectedGoal]);

  const selectedGoalData = state.savingsGoals.find((g) => g.id === selectedGoal);

  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addTxForm.goalId || !addTxForm.amount) return;
    onAddSavings({
      goalId: addTxForm.goalId,
      amount: parseFloat(addTxForm.amount),
      date: addTxForm.date,
      note: addTxForm.note || 'Отложение',
      member: addTxForm.member,
    });
    setAddTxForm({ goalId: '', amount: '', note: '', date: new Date().toISOString().split('T')[0], member: 'person1' });
    setShowAddTx(false);
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addGoalForm.name || !addGoalForm.monthlyTarget) return;
    onAddGoal({
      name: addGoalForm.name,
      monthlyTarget: parseFloat(addGoalForm.monthlyTarget),
      current: 0,
      color: addGoalForm.color,
      icon: addGoalForm.icon,
    });
    setAddGoalForm({ name: '', monthlyTarget: '', color: '#10b981', icon: '💰' });
    setShowAddGoal(false);
  };

  const startEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal.id);
    setEditMonthlyTarget(goal.monthlyTarget.toString());
  };

  const saveEdit = (id: string) => {
    const val = parseFloat(editMonthlyTarget);
    if (val > 0) {
      onUpdateGoal(id, { monthlyTarget: val });
    }
    setEditingGoal(null);
  };

  const monthLabel = (m: string) => {
    const [y, mo] = m.split('-');
    const d = new Date(parseInt(y), parseInt(mo) - 1, 1);
    return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Monthly summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Сбережения на {monthLabel(currentMonth)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Обязательные ежемесячные отложения</p>
          </div>
          <button
            onClick={() => setShowAddTx(!showAddTx)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium rounded-xl shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all"
          >
            <Plus className="w-4 h-4" />
            Отложить
          </button>
        </div>

        <div className="flex items-end gap-4 mb-3">
          <div>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(totalActual)}</p>
            <p className="text-sm text-slate-500">из {formatCurrency(totalPlanned)} обязательных</p>
          </div>
          <div className="flex-1 pb-1.5">
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(totalPercent, 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full ${isShortTotal ? 'bg-amber-500' : 'bg-emerald-500'}`}
              />
            </div>
          </div>
        </div>

        {isShortTotal && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-xl mb-3">
            <AlertTriangle className="w-4 h-4" />
            Не довложено {formatCurrency(totalPlanned - totalActual)} — {Math.round(100 - totalPercent)}%
          </div>
        )}

        {!isShortTotal && totalPlanned > 0 && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl mb-3">
            <Check className="w-4 h-4" />
            План выполнен! Избыток {formatCurrency(totalActual - totalPlanned)}
          </div>
        )}

        <div className="text-xs text-slate-500 mt-2">
          Всего накоплено: <strong className="text-slate-900">{formatCurrency(totalSaved)}</strong>
        </div>
      </motion.div>

      {/* Add transaction form */}
      <AnimatePresence>
        {showAddTx && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddTx}
            className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 overflow-hidden"
          >
            <h4 className="text-sm font-semibold text-slate-900 mb-4">Отложить деньги из буфера</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Цель</label>
                <select
                  value={addTxForm.goalId}
                  onChange={(e) => setAddTxForm({ ...addTxForm, goalId: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                >
                  <option value="">Выберите цель</option>
                  {state.savingsGoals.map((g) => (
                    <option key={g.id} value={g.id}>{g.name} (обяз: {formatCurrency(g.monthlyTarget)}/мес)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Сумма</label>
                <div className="relative">
                  <input
                    type="number"
                    value={addTxForm.amount}
                    onChange={(e) => setAddTxForm({ ...addTxForm, amount: e.target.value })}
                    placeholder="0"
                    min="1"
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₽</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Дата</label>
                <input
                  type="date"
                  value={addTxForm.date}
                  onChange={(e) => setAddTxForm({ ...addTxForm, date: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Кто отлаживает</label>
                <div className="flex gap-2">
                  {state.members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAddTxForm({ ...addTxForm, member: m.id })}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-all ${
                        addTxForm.member === m.id
                          ? 'border-slate-300 bg-slate-50 text-slate-900'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: m.color }}>
                        {m.avatar}
                      </div>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Примечание</label>
                <input
                  type="text"
                  value={addTxForm.note}
                  onChange={(e) => setAddTxForm({ ...addTxForm, note: e.target.value })}
                  placeholder="Например, ежемесячное отложение"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all">
                Отложить {formatCurrency(parseFloat(addTxForm.amount) || 0)}
              </button>
              <button type="button" onClick={() => setShowAddTx(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                Отмена
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Goals grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, i) => {
          const isSelected = selectedGoal === item.id;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => setSelectedGoal(isSelected ? null : item.id)}
              className={`bg-white rounded-2xl p-5 shadow-sm border cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'border-emerald-300 ring-2 ring-emerald-100' : item.short ? 'border-amber-200' : 'border-slate-100'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: item.color }}>
                    <Target className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">{item.name}</h4>
                    <p className="text-xs text-slate-500">{formatCurrency(item.actual)} из {formatCurrency(item.monthlyTarget)} в этом месяце</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold ${item.short ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {Math.round(item.percent)}%
                  </span>
                </div>
              </div>

              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(item.percent, 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${item.short ? 'bg-amber-500' : 'bg-emerald-500'}`}
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                {item.short ? (
                  <span className="text-amber-600 font-medium">Не хватает {formatCurrency(item.monthlyTarget - item.actual)}</span>
                ) : (
                  <span className="text-slate-400">Выполнено +{formatCurrency(item.actual - item.monthlyTarget)}</span>
                )}
                <span className="text-slate-500 font-medium">Всего {formatCurrency(item.current)}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Selected goal history */}
      <AnimatePresence>
        {selectedGoal && selectedGoalData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
          >
            <div className="px-5 py-4 flex items-center justify-between" style={{ backgroundColor: selectedGoalData.color + '10' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm" style={{ backgroundColor: selectedGoalData.color }}>
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">{selectedGoalData.name}</h4>
                  <p className="text-xs text-slate-500">{goalTransactions.length} операций · Всего {formatCurrency(selectedGoalData.current)}</p>
                </div>
              </div>
              <button onClick={() => setSelectedGoal(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/50 transition-colors">
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>

            <div className="divide-y divide-slate-50">
              {goalTransactions.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-slate-400">Пока нет отложений в эту цель</div>
              ) : (
                goalTransactions.map((tx) => {
                  const member = state.members.find((m) => m.id === tx.member);
                  return (
                    <div key={tx.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                          <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm text-slate-900">{tx.note}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>{formatDate(tx.date)}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: member?.color }} />
                              {member?.name}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-emerald-600">+{formatCurrency(tx.amount)}</span>
                        <button onClick={() => onDeleteSavings(tx.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goals management */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Цели сбережений</h3>
          <button
            onClick={() => setShowAddGoal(!showAddGoal)}
            className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Новая цель
          </button>
        </div>

        <AnimatePresence>
          {showAddGoal && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddGoal}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={addGoalForm.name}
                  onChange={(e) => setAddGoalForm({ ...addGoalForm, name: e.target.value })}
                  placeholder="Название цели"
                  required
                  className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none"
                />
                <div className="relative">
                  <input
                    type="number"
                    value={addGoalForm.monthlyTarget}
                    onChange={(e) => setAddGoalForm({ ...addGoalForm, monthlyTarget: e.target.value })}
                    placeholder="Обязательно в месяц"
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₽/мес</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-semibold shadow-lg shadow-emerald-200 transition-all">
                  Создать цель
                </button>
                <button type="button" onClick={() => setShowAddGoal(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                  Отмена
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {state.savingsGoals.map((goal) => {
          const isEditing = editingGoal === goal.id;
          return (
            <div key={goal.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: goal.color }}>
                <Target className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-slate-700">{goal.name}</span>
                    <div className="relative w-32">
                      <input
                        type="number"
                        value={editMonthlyTarget}
                        onChange={(e) => setEditMonthlyTarget(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 pr-8"
                        autoFocus
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">₽</span>
                    </div>
                    <button onClick={() => saveEdit(goal.id)} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setEditingGoal(null); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-slate-900">{goal.name}</p>
                    <p className="text-xs text-slate-500">
                      Всего {formatCurrency(goal.current)} · Обязательно в месяц: {formatCurrency(goal.monthlyTarget)}
                    </p>
                  </>
                )}
              </div>
              {!isEditing && (
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(goal)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDeleteGoal(goal.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
