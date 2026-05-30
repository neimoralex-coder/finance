import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit2, Check, X, Lock, AlertTriangle, ChevronDown, ChevronUp, ShieldAlert, Unlock } from 'lucide-react';
import { AppState } from '../store';
import { BudgetTemplate, BudgetResolutionAllocation, MonthlyBudget } from '../types';
import { formatCurrency } from '../lib/utils';

interface Props {
  state: AppState;
  onAddTemplate: (t: Omit<BudgetTemplate, 'id'>) => void;
  onUpdateTemplate: (id: string, updates: Partial<BudgetTemplate>) => void;
  onDeleteTemplate: (id: string) => void;
  onCloseMonth: (month: string) => void;
  onReopenMonth: (month: string) => void;
  onResolveOverspend: (month: string, targetTemplateId: string, allocations: BudgetResolutionAllocation[]) => void;
}

type RichBudgetItem = {
  templateId: string;
  name: string;
  limit: number;
  spent: number;
  correctionSpent: number;
  used: number;
  percent: number;
  remaining: number;
  over: boolean;
};

export default function MonthlyBudgetPage({ state, onAddTemplate, onUpdateTemplate, onDeleteTemplate, onCloseMonth, onReopenMonth, onResolveOverspend }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editLimit, setEditLimit] = useState('');
  const [confirmClose, setConfirmClose] = useState(false);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [showCompensation, setShowCompensation] = useState(false);
  const [compensationAllocations, setCompensationAllocations] = useState<Record<string, string>>({});

  const sortedBudgets = useMemo(() => [...state.monthlyBudgets].sort((a, b) => b.month.localeCompare(a.month)), [state.monthlyBudgets]);
  const openBudgets = sortedBudgets.filter((mb) => mb.status === 'open');
  const currentMB = openBudgets[0] || null;
  const activeMonth = currentMB?.month || new Date().toISOString().slice(0, 7);

  const getRichItems = (mb: MonthlyBudget | null): RichBudgetItem[] => {
    if (!mb) return [];
    return mb.items
      .map((item) => {
        const template = state.budgetTemplates.find((t) => t.id === item.templateId);
        if (!template) return null;
        const limit = item.limitOverride ?? template.limit;
        const correctionSpent = item.correctionSpent || 0;
        const used = item.spent + correctionSpent;
        const percent = limit > 0 ? (used / limit) * 100 : 0;
        const remaining = limit - used;
        return { templateId: item.templateId, name: template.name, limit, spent: item.spent, correctionSpent, used, percent, remaining, over: used > limit };
      })
      .filter(Boolean) as RichBudgetItem[];
  };

  const currentItems = useMemo(() => getRichItems(currentMB).sort((a, b) => b.percent - a.percent), [currentMB, state.budgetTemplates]);
  const totalLimit = currentItems.reduce((s, it) => s + it.limit, 0);
  const totalUsed = currentItems.reduce((s, it) => s + it.used, 0);
  const totalPercent = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
  const isOverTotal = totalUsed > totalLimit;

  const hasFinancialActivityAfterMonth = (month: string) => {
    return (
      state.transactions.some((t) => t.date.slice(0, 7) > month) ||
      state.savingsTransactions.some((t) => t.date.slice(0, 7) > month) ||
      state.budgetResolutions.some((r) => r.month > month)
    );
  };

  const handleReopenMonth = (month: string) => {
    const confirmed = window.confirm(
      `Переоткрыть ${monthLabel(month)}?\n\nМесяц снова станет активным, отчёт закрытия и компенсации перерасхода за этот месяц будут отменены. Если следующий месяц был создан автоматически и в нём нет операций, он удалится.`
    );
    if (!confirmed) return;
    onReopenMonth(month);
    setExpandedMonth(null);
  };

  const totalIncome = state.transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = state.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const totalSavings = state.savingsTransactions.reduce((s, t) => s + t.amount, 0);
  const availableBuffer = totalIncome - totalExpense - totalSavings - state.bufferDebt;

  const monthLabel = (m: string) => {
    const [y, mo] = m.split('-');
    const d = new Date(parseInt(y), parseInt(mo) - 1, 1);
    return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
  };

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
    if (editName && val > 0) onUpdateTemplate(id, { name: editName, limit: val });
    setEditingId(null);
  };

  const getMonthReport = (month: string, mb: MonthlyBudget) => {
    const monthStart = `${month}-01`;
    const [year, monthNumber] = month.split('-').map(Number);
    const nextMonth = new Date(year, monthNumber, 1).toISOString().slice(0, 7);
    const nextMonthStart = `${nextMonth}-01`;
    const transactionsBeforeMonth = state.transactions.filter((t) => t.date < monthStart);
    const savingsBeforeMonth = state.savingsTransactions.filter((t) => t.date < monthStart);
    const transactionsUntilMonthEnd = state.transactions.filter((t) => t.date < nextMonthStart);
    const savingsUntilMonthEnd = state.savingsTransactions.filter((t) => t.date < nextMonthStart);
    const calcBuffer = (transactions: typeof state.transactions, savings: typeof state.savingsTransactions) => {
      const income = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const saved = savings.reduce((sum, t) => sum + t.amount, 0);
      return income - expense - saved;
    };
    const monthTransactions = state.transactions.filter((t) => t.date.startsWith(month));
    const monthSavings = state.savingsTransactions.filter((t) => t.date.startsWith(month));
    const richItems = getRichItems(mb);
    const income = monthTransactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = monthTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const savings = monthSavings.reduce((sum, t) => sum + t.amount, 0);
    const plannedBudget = richItems.reduce((sum, item) => sum + item.limit, 0);
    const budgetSpent = richItems.reduce((sum, item) => sum + item.spent, 0);
    const correctionSpent = richItems.reduce((sum, item) => sum + item.correctionSpent, 0);
    const savedByCategories = richItems.reduce((sum, item) => sum + Math.max(item.limit - item.used, 0), 0);
    const overspentByCategories = richItems.reduce((sum, item) => sum + Math.max(item.used - item.limit, 0), 0);
    const unbudgetedExpense = monthTransactions.filter((t) => t.type === 'expense' && !t.budgetTemplateId).reduce((sum, t) => sum + t.amount, 0);
    const memberStats = state.members.map((member) => {
      const memberTransactions = monthTransactions.filter((t) => t.member === member.id);
      const memberSavings = monthSavings.filter((t) => t.member === member.id);
      return {
        ...member,
        income: memberTransactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        expense: memberTransactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0),
        savings: memberSavings.reduce((sum, t) => sum + t.amount, 0),
      };
    });
    const resolutions = state.budgetResolutions.filter((r) => r.month === month);
    return {
      balanceStart: calcBuffer(transactionsBeforeMonth, savingsBeforeMonth),
      balanceEnd: calcBuffer(transactionsUntilMonthEnd, savingsUntilMonthEnd),
      income,
      expense,
      savings,
      monthResult: income - expense - savings,
      plannedBudget,
      budgetSpent,
      correctionSpent,
      savedByCategories,
      overspentByCategories,
      unbudgetedExpense,
      memberStats,
      resolutions,
    };
  };

  const overspentItems = currentItems.filter((it) => it.over);
  const toRubles = (value: number) => Math.round(value);
  const totalOverspendAmount = overspentItems.reduce((sum, it) => sum + toRubles(Math.max(0, it.used - it.limit)), 0);

  const allocationKey = (targetId: string, sourceId: string) => `${targetId}:${sourceId}`;
  const getAllocationValue = (targetId: string, sourceId: string) => compensationAllocations[allocationKey(targetId, sourceId)] || '';
  const setAllocationValue = (targetId: string, sourceId: string, value: string) => {
    setCompensationAllocations((prev) => ({ ...prev, [allocationKey(targetId, sourceId)]: value }));
  };
  const toMoney = (value: number) => toRubles(value);
  const getNumericAllocation = (targetId: string, sourceId: string) => toRubles(Math.max(0, Number(getAllocationValue(targetId, sourceId)) || 0));
  const getTargetNeeded = (target: RichBudgetItem) => toRubles(Math.max(0, target.used - target.limit));
  const getTargetEnteredTotal = (target: RichBudgetItem) => {
    const categoryTotal = currentItems
      .filter((source) => source.templateId !== target.templateId && source.remaining > 0)
      .reduce((sum, source) => sum + getNumericAllocation(target.templateId, source.templateId), 0);
    return toMoney(categoryTotal + getNumericAllocation(target.templateId, '__buffer') + getNumericAllocation(target.templateId, '__nextMonth'));
  };
  const getTargetBalance = (target: RichBudgetItem) => toMoney(getTargetNeeded(target) - getTargetEnteredTotal(target));
  const getTargetLeftToCompensate = (target: RichBudgetItem) => toMoney(Math.max(0, getTargetBalance(target)));
  const getTargetOverCompensated = (target: RichBudgetItem) => toMoney(Math.max(0, -getTargetBalance(target)));
  const getAllocatedFromSource = (sourceId: string) => {
    return overspentItems.reduce((sum, target) => sum + getNumericAllocation(target.templateId, sourceId), 0);
  };
  const getAllocatedFromSourceExcept = (sourceId: string, targetId: string) => {
    return overspentItems.reduce((sum, target) => {
      if (target.templateId === targetId) return sum;
      return sum + getNumericAllocation(target.templateId, sourceId);
    }, 0);
  };
  const getAvailableForSourceRow = (source: RichBudgetItem, targetId: string) => Math.max(0, source.remaining - getAllocatedFromSourceExcept(source.templateId, targetId));
  const getAvailableBufferForTarget = (targetId: string) => Math.max(0, availableBuffer - getAllocatedFromSourceExcept('__buffer', targetId));
  const totalEnteredCompensation = overspentItems.reduce((sum, target) => sum + getTargetEnteredTotal(target), 0);
  const totalLeftToCompensate = overspentItems.reduce((sum, target) => sum + getTargetLeftToCompensate(target), 0);
  const totalOverCompensated = overspentItems.reduce((sum, target) => sum + getTargetOverCompensated(target), 0);
  const hasSourceOveruse = currentItems.some((source) => {
    if (source.remaining <= 0) return false;
    return getAllocatedFromSource(source.templateId) > toRubles(source.remaining);
  }) || getAllocatedFromSource('__buffer') > toRubles(availableBuffer);
  const hasTargetMismatch = overspentItems.some((target) => getTargetLeftToCompensate(target) !== 0 || getTargetOverCompensated(target) !== 0);
  const isCompensationReady = overspentItems.length > 0 && !hasSourceOveruse && !hasTargetMismatch && totalLeftToCompensate === 0 && totalOverCompensated === 0;
  const hasInvalidCompensation = !isCompensationReady;


  const startCloseFlow = () => {
    if (overspentItems.length > 0) {
      setCompensationAllocations({});
      setShowCompensation(true);
      return;
    }
    setConfirmClose(true);
  };

  const applyCompensationAndClose = () => {
    if (!currentMB || hasInvalidCompensation) return;

    overspentItems.forEach((target) => {
      const result: BudgetResolutionAllocation[] = [];
      currentItems
        .filter((source) => source.templateId !== target.templateId && source.remaining > 0)
        .forEach((source) => {
          const amount = toMoney(getNumericAllocation(target.templateId, source.templateId));
          if (amount > 0) result.push({ type: 'category', sourceTemplateId: source.templateId, sourceName: source.name, amount });
        });

      const bufferAmount = toMoney(getNumericAllocation(target.templateId, '__buffer'));
      if (bufferAmount > 0) result.push({ type: 'buffer', sourceName: 'Буфер', amount: bufferAmount });

      const nextMonthAmount = toMoney(getNumericAllocation(target.templateId, '__nextMonth'));
      if (nextMonthAmount > 0) result.push({ type: 'next-month', sourceName: 'Следующий месяц', amount: nextMonthAmount });

      if (result.length > 0) {
        onResolveOverspend(activeMonth, target.templateId, result);
      }
    });

    onCloseMonth(activeMonth);
    setShowCompensation(false);
    setCompensationAllocations({});
    setConfirmClose(false);
    setExpandedMonth(activeMonth);
  };

  const MonthReportCard = ({ month, mb }: { month: string; mb: MonthlyBudget }) => {
    const report = getMonthReport(month, mb);
    return (
      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">Итоги месяца</p>
          <p className="text-xs text-slate-500 mt-0.5">Остатки категорий не переносятся в следующий бюджет. Они остаются в свободном буфере.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <InfoCard label="Буфер на начало" value={formatCurrency(report.balanceStart)} />
          <InfoCard label="Буфер на конец" value={formatCurrency(report.balanceEnd)} valueClass={report.balanceEnd >= 0 ? 'text-blue-600' : 'text-red-600'} />
          <InfoCard label="Доходы" value={`+${formatCurrency(report.income)}`} box="bg-emerald-50" valueClass="text-emerald-700" />
          <InfoCard label="Расходы" value={`-${formatCurrency(report.expense)}`} box="bg-rose-50" valueClass="text-rose-700" />
          <InfoCard label="Отложено" value={`-${formatCurrency(report.savings)}`} box="bg-amber-50" valueClass="text-amber-700" />
          <InfoCard label="Итог месяца" value={`${report.monthResult >= 0 ? '+' : ''}${formatCurrency(report.monthResult)}`} valueClass={report.monthResult >= 0 ? 'text-blue-600' : 'text-red-600'} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <InfoCard label="План по категориям" value={formatCurrency(report.plannedBudget)} />
          <InfoCard label="Факт по категориям" value={formatCurrency(report.budgetSpent)} />
          <InfoCard label="Корректировки" value={formatCurrency(report.correctionSpent)} />
          <InfoCard label="Сохранено" value={formatCurrency(report.savedByCategories)} box="bg-emerald-50" valueClass="text-emerald-700" />
          <InfoCard label="Перерасход" value={formatCurrency(report.overspentByCategories)} box="bg-red-50" valueClass="text-red-700" />
          <InfoCard label="Долг перед буфером" value={formatCurrency(state.bufferDebt)} box={state.bufferDebt > 0 ? 'bg-red-50' : 'bg-white'} valueClass={state.bufferDebt > 0 ? 'text-red-700' : 'text-slate-900'} />
        </div>
        {report.unbudgetedExpense > 0 && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Есть расходы без привязки к бюджету: {formatCurrency(report.unbudgetedExpense)}. Они уменьшают буфер, но не отображаются в категориях бюджета.</span>
          </div>
        )}
        {report.resolutions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700">Корректировки перерасхода</p>
            {report.resolutions.map((r) => (
              <div key={r.id} className="bg-white rounded-xl p-3 border border-slate-100">
                <p className="text-sm font-semibold text-slate-900">{r.targetName}: компенсировано {formatCurrency(r.overspentAmount)}</p>
                <div className="mt-2 space-y-1">
                  {r.allocations.map((a, index) => (
                    <div key={index} className="flex justify-between text-xs">
                      <span className="text-slate-500">{a.sourceName}{a.type === 'buffer' ? ' — создан долг перед буфером' : a.type === 'next-month' ? ' — перенесено в следующий месяц' : ''}</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(a.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-700">По участникам</p>
          {report.memberStats.map((member) => (
            <div key={member.id} className="bg-white rounded-xl p-3 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: member.color }}>{member.avatar}</div>
                <p className="text-sm font-semibold text-slate-900">{member.name}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div><p className="text-slate-400">Внёс</p><p className="font-semibold text-emerald-600">{formatCurrency(member.income)}</p></div>
                <div><p className="text-slate-400">Потратил</p><p className="font-semibold text-rose-600">{formatCurrency(member.expense)}</p></div>
                <div><p className="text-slate-400">Отложил</p><p className="font-semibold text-amber-600">{formatCurrency(member.savings)}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showCompensation && currentMB && overspentItems.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-slate-900/40 flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} className="w-full max-w-3xl bg-white rounded-3xl p-5 shadow-xl max-h-[90vh] overflow-auto">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Компенсация перерасхода перед закрытием месяца</h3>
                  <p className="text-sm text-slate-500 mt-1">Всего перерасхода: {formatCurrency(totalOverspendAmount)} · введено: {formatCurrency(totalEnteredCompensation)}</p>
                </div>
                <button onClick={() => setShowCompensation(false)} className="p-2 rounded-xl hover:bg-slate-100"><X className="w-5 h-5" /></button>
              </div>

              <div className={`${isCompensationReady ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} border rounded-2xl p-4 mb-4`}>
                <p className={`text-xs ${isCompensationReady ? 'text-emerald-700' : 'text-red-700'}`}>Перерасход найден в {overspentItems.length} {overspentItems.length === 1 ? 'категории' : 'категориях'}</p>
                <p className={`text-3xl font-bold ${isCompensationReady ? 'text-emerald-700' : 'text-red-700'}`}>{isCompensationReady ? 'Готово' : formatCurrency(totalLeftToCompensate)}</p>
                <p className={`text-xs mt-1 ${isCompensationReady ? 'text-emerald-700' : 'text-red-600'}`}>
                  {isCompensationReady
                    ? 'Все перерасходы компенсированы. Можно закрывать месяц.'
                    : `Осталось компенсировать: ${formatCurrency(totalLeftToCompensate)} из общего перерасхода ${formatCurrency(totalOverspendAmount)}.`}
                </p>
                {totalOverCompensated > 0 && <p className="text-xs text-amber-700 mt-1">Введено больше нужного на {formatCurrency(totalOverCompensated)}. Уменьши одну из сумм.</p>}
                {hasSourceOveruse && <p className="text-xs text-amber-700 mt-1">По одному из источников взято больше доступного остатка.</p>}
              </div>

              <div className="space-y-4">
                {overspentItems.map((target, targetIndex) => {
                  const needed = getTargetNeeded(target);
                  const entered = getTargetEnteredTotal(target);
                  const left = getTargetLeftToCompensate(target);
                  const sources = currentItems.filter((source) => source.templateId !== target.templateId && source.remaining > 0);
                  return (
                    <div key={target.templateId} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-xs text-slate-500">Перерасход {targetIndex + 1}</p>
                          <h4 className="text-base font-bold text-slate-900">{target.name}</h4>
                          <p className="text-xs text-slate-500">Потрачено {formatCurrency(target.used)} из {formatCurrency(target.limit)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500">Осталось компенсировать</p>
                          <p className={`text-xl font-bold ${left === 0 && getTargetOverCompensated(target) === 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(left)}</p>
                          <p className="text-xs text-slate-400">Введено: {formatCurrency(entered)} / {formatCurrency(needed)}</p>
                          {getTargetOverCompensated(target) > 0 && <p className="text-xs text-amber-600">Лишняя компенсация: {formatCurrency(getTargetOverCompensated(target))}</p>}
                        </div>
                      </div>

                      <div className="space-y-3">
                        {sources.map((source) => {
                          const available = getAvailableForSourceRow(source, target.templateId);
                          return (
                            <AllocationRow
                              key={source.templateId}
                              label={source.name}
                              available={available}
                              value={getAllocationValue(target.templateId, source.templateId)}
                              onChange={(v) => setAllocationValue(target.templateId, source.templateId, v)}
                            />
                          );
                        })}
                        <AllocationRow
                          label="Буфер"
                          warning="крайняя мера, создаст долг перед буфером"
                          available={getAvailableBufferForTarget(target.templateId)}
                          value={getAllocationValue(target.templateId, '__buffer')}
                          onChange={(v) => setAllocationValue(target.templateId, '__buffer', v)}
                        />
                        <AllocationRow
                          label="Перенести в следующий месяц"
                          warning="лимит этой категории в следующем месяце уменьшится"
                          available={left + getNumericAllocation(target.templateId, '__nextMonth')}
                          value={getAllocationValue(target.templateId, '__nextMonth')}
                          onChange={(v) => setAllocationValue(target.templateId, '__nextMonth', v)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2 mt-5">
                <button disabled={hasInvalidCompensation} onClick={applyCompensationAndClose} className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold disabled:bg-slate-300 disabled:cursor-not-allowed">Применить компенсацию и закрыть месяц</button>
                <button onClick={() => setShowCompensation(false)} className="px-4 py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold">Отмена</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Бюджет на {monthLabel(activeMonth)}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{currentMB?.status === 'open' ? 'Активный месяц' : 'Нет активного бюджета'}</p>
          </div>
          {currentMB?.status === 'open' && (
            !confirmClose ? (
              <button onClick={startCloseFlow} className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl shadow-md hover:bg-slate-800 transition-all"><Lock className="w-4 h-4" />Закрыть месяц</button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => { onCloseMonth(activeMonth); setConfirmClose(false); setExpandedMonth(activeMonth); }} className="px-3 py-2 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors">Подтвердить</button>
                <button onClick={() => setConfirmClose(false)} className="px-3 py-2 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200 transition-colors">Отмена</button>
              </div>
            )
          )}
        </div>

        {confirmClose && currentMB && <div className="mb-4"><MonthReportCard month={activeMonth} mb={currentMB} /></div>}

        <div className="flex items-end gap-4 mb-3">
          <div><p className="text-3xl font-bold text-slate-900">{formatCurrency(totalUsed)}</p><p className="text-sm text-slate-500">из {formatCurrency(totalLimit)}</p></div>
          <div className="flex-1 pb-1.5"><div className="h-3 bg-slate-100 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(totalPercent, 100)}%` }} transition={{ duration: 1, ease: 'easeOut' }} className={`h-full rounded-full ${isOverTotal ? 'bg-red-500' : totalPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} /></div></div>
        </div>
        {isOverTotal && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl mb-3"><AlertTriangle className="w-4 h-4" />Перерасход бюджета на {formatCurrency(totalUsed - totalLimit)}</div>}
        {!isOverTotal && totalPercent > 80 && <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-xl mb-3"><AlertTriangle className="w-4 h-4" />Осталось {formatCurrency(totalLimit - totalUsed)} — {Math.round(100 - totalPercent)}%</div>}
      </motion.div>

      <div className="space-y-3">
        {currentItems.map((it, i) => {
          const template = state.budgetTemplates.find((t) => t.id === it.templateId);
          const isEditing = editingId === it.templateId;
          return (
            <motion.div key={it.templateId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className={`bg-white rounded-2xl p-5 shadow-sm border transition-all ${it.over ? 'border-red-200' : it.percent > 80 ? 'border-amber-200' : 'border-slate-100'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-2"><input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500" /><div className="relative"><input type="number" value={editLimit} onChange={(e) => setEditLimit(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 pr-8" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₽</span></div></div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between"><h4 className="text-sm font-semibold text-slate-900">{it.name}</h4><span className={`text-sm font-bold ${it.over ? 'text-red-600' : it.percent > 80 ? 'text-amber-600' : 'text-emerald-600'}`}>{Math.round(it.percent)}%</span></div>
                      <p className="text-xs text-slate-500 mt-0.5">{formatCurrency(it.spent)} из {formatCurrency(it.limit)}{it.correctionSpent > 0 && <span className="text-blue-500 ml-2">Коррекция {formatCurrency(it.correctionSpent)}</span>}{it.over ? <span className="text-red-500 ml-2">Перерасход {formatCurrency(it.used - it.limit)}</span> : <span className="text-slate-400 ml-2">Осталось {formatCurrency(it.remaining)}</span>}</p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-3">
                  {isEditing ? <><button onClick={() => saveEdit(it.templateId)} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50"><Check className="w-4 h-4" /></button><button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button></> : <><button onClick={() => template && startEdit(template)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50"><Edit2 className="w-3.5 h-3.5" /></button><button onClick={() => onDeleteTemplate(it.templateId)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button></>}
                </div>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(it.percent, 100)}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className={`h-full rounded-full ${it.over ? 'bg-red-500' : it.percent > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} /></div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {showAdd ? (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 overflow-hidden">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">Новый пункт бюджета</h4>
            <div className="flex gap-3"><input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Название" className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none" /><div className="relative w-40"><input type="number" value={newLimit} onChange={(e) => setNewLimit(e.target.value)} placeholder="Лимит" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-blue-500 outline-none pr-8" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₽</span></div></div>
            <div className="flex gap-2 mt-3"><button onClick={handleAdd} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold">Добавить</button><button onClick={() => setShowAdd(false)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600">Отмена</button></div>
          </motion.div>
        ) : (
          <button onClick={() => setShowAdd(true)} className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-slate-500 text-sm font-medium hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"><Plus className="w-4 h-4" />Добавить пункт бюджета</button>
        )}
      </AnimatePresence>

      {sortedBudgets.filter((mb) => mb.status === 'closed').length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">История бюджетов</h3>
          {sortedBudgets.filter((mb) => mb.status === 'closed').map((mb) => {
            const isExpanded = expandedMonth === mb.month;
            const rich = getRichItems(mb);
            const mbTotalLimit = rich.reduce((s, it) => s + it.limit, 0);
            const mbTotalUsed = rich.reduce((s, it) => s + it.used, 0);
            return (
              <motion.div key={mb.month} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <button onClick={() => setExpandedMonth(isExpanded ? null : mb.month)} className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center"><Lock className="w-4 h-4 text-slate-500" /></div><div className="text-left"><p className="text-sm font-semibold text-slate-900">{monthLabel(mb.month)}</p><p className="text-xs text-slate-500">{formatCurrency(mbTotalUsed)} из {formatCurrency(mbTotalLimit)}</p></div></div>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
                <AnimatePresence>{isExpanded && <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden"><div className="px-5 pb-4 space-y-4"><MonthReportCard month={mb.month} mb={mb} />{(() => { const canReopen = !hasFinancialActivityAfterMonth(mb.month); return <div className={`rounded-2xl border p-4 ${canReopen ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}><div className="flex items-start gap-3"><div className={`w-9 h-9 rounded-xl flex items-center justify-center ${canReopen ? 'bg-blue-100' : 'bg-slate-100'}`}><Unlock className={`w-4 h-4 ${canReopen ? 'text-blue-600' : 'text-slate-400'}`} /></div><div className="flex-1"><p className="text-sm font-semibold text-slate-900">Переоткрыть месяц</p><p className="text-xs text-slate-500 mt-1">Если месяц закрыли случайно, его можно вернуть в работу. Автоматически созданный следующий месяц удалится, если в нём ещё нет операций.</p>{!canReopen && <p className="text-xs text-amber-600 mt-2">Переоткрытие заблокировано: после этого месяца уже есть операции или корректировки. Сначала уберите их, чтобы не сломать историю бюджета.</p>}</div></div><button disabled={!canReopen} onClick={() => handleReopenMonth(mb.month)} className={`mt-3 w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${canReopen ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>Переоткрыть {monthLabel(mb.month)}</button></div>; })()}{rich.map((item) => <div key={item.templateId} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0"><div className="flex-1"><p className="text-sm text-slate-700">{item.name}</p><div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1 w-32"><div className={`h-full rounded-full ${item.percent > 100 ? 'bg-red-400' : 'bg-blue-400'}`} style={{ width: `${Math.min(item.percent, 100)}%` }} /></div></div><div className="text-right"><p className="text-sm font-medium text-slate-900">{formatCurrency(item.used)}</p><p className="text-xs text-slate-400">из {formatCurrency(item.limit)}</p></div></div>)}</div></motion.div>}</AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value, box = 'bg-white', valueClass = 'text-slate-900' }: { label: string; value: string; box?: string; valueClass?: string }) {
  return <div className={`${box} rounded-xl p-3 border border-slate-100`}><p className="text-xs text-slate-500">{label}</p><p className={`text-sm font-bold ${valueClass}`}>{value}</p></div>;
}

function AllocationRow({ label, available, value, onChange, warning }: { label: string; available: number; value: string; onChange: (v: string) => void; warning?: string }) {
  const numeric = Math.round(Number(value) || 0);
  const roundedAvailable = Math.round(available);
  const tooMuch = numeric > roundedAvailable && label !== 'Перенести в следующий месяц';
  return (
    <div className={`rounded-2xl border p-3 ${tooMuch ? 'border-red-200 bg-red-50' : 'border-slate-100 bg-slate-50'}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="text-xs text-slate-500">Доступно: {formatCurrency(roundedAvailable)}</p>
          {warning && <p className="text-xs text-amber-600 mt-1 flex items-center gap-1"><ShieldAlert className="w-3 h-3" />{warning}</p>}
        </div>
        <input type="number" min="0" step="1" value={value} onChange={(e) => onChange(e.target.value)} onBlur={() => value && onChange(String(Math.round(Number(value) || 0)))} className="w-32 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-blue-500" placeholder="0" />
      </div>
      {tooMuch && <p className="text-xs text-red-600 mt-2">Нельзя взять больше остатка.</p>}
    </div>
  );
}
