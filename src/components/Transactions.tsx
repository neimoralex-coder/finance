import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Trash2, Edit2, X, Check, ArrowUpRight, ArrowDownRight, Target } from 'lucide-react';
import { AppState } from '../store';
import { Transaction, TransactionType, Member, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';

interface Props {
  state: AppState;
  onDelete: (id: string) => void;
  onUpdate: (id: string, tx: Partial<Transaction>) => void;
}

export default function Transactions({ state, onDelete, onUpdate }: Props) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [memberFilter, setMemberFilter] = useState<Member | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});

  const allCategories = [...new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])];

  const filtered = useMemo(() => {
    return state.transactions
      .filter((t) => {
        if (typeFilter !== 'all' && t.type !== typeFilter) return false;
        if (memberFilter !== 'all' && t.member !== memberFilter) return false;
        if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            t.description.toLowerCase().includes(q) ||
            t.category.toLowerCase().includes(q) ||
            t.amount.toString().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [state.transactions, typeFilter, memberFilter, categoryFilter, search]);

  const startEdit = (t: Transaction) => {
    setEditingId(t.id);
    setEditForm({ ...t });
  };

  const saveEdit = () => {
    if (editingId && editForm) {
      onUpdate(editingId, editForm);
      setEditingId(null);
      setEditForm({});
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    filtered.forEach((t) => {
      const key = t.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск транзакций..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TransactionType | 'all')}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:border-blue-500 outline-none bg-white"
          >
            <option value="all">Все типы</option>
            <option value="income">Доходы</option>
            <option value="expense">Расходы</option>
          </select>

          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value as Member | 'all')}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:border-blue-500 outline-none bg-white"
          >
            <option value="all">Все участники</option>
            {state.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:border-blue-500 outline-none bg-white"
          >
            <option value="all">Все категории</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {(typeFilter !== 'all' || memberFilter !== 'all' || categoryFilter !== 'all' || search) && (
            <button
              onClick={() => {
                setTypeFilter('all');
                setMemberFilter('all');
                setCategoryFilter('all');
                setSearch('');
              }}
              className="flex items-center gap-1 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {grouped.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
            <Filter className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">Транзакций не найдено</p>
          </div>
        ) : (
          grouped.map(([date, txs]) => (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
            >
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {formatDate(date)}
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {txs.map((t) => {
                  const member = state.members.find((m) => m.id === t.member);
                  const budgetItem = t.budgetTemplateId
                    ? state.budgetTemplates.find((bt) => bt.id === t.budgetTemplateId)
                    : null;
                  const isEditing = editingId === t.id;

                  return (
                    <div key={t.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50/50 transition-colors">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: member?.color || '#9ca3af' }}
                      >
                        {member?.avatar || '?'}
                      </div>

                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={editForm.description || ''}
                                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                              />
                              <input
                                type="number"
                                value={editForm.amount || ''}
                                onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) })}
                                className="w-24 px-2 py-1 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                              />
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="date"
                                value={editForm.date || ''}
                                onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                                className="px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                              />
                              <select
                                value={editForm.type || 'expense'}
                                onChange={(e) => setEditForm({ ...editForm, type: e.target.value as TransactionType })}
                                className="px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                              >
                                <option value="expense">Расход</option>
                                <option value="income">Доход</option>
                              </select>
                              {editForm.type === 'expense' && (
                                <select
                                  value={editForm.budgetTemplateId || ''}
                                  onChange={(e) => setEditForm({ ...editForm, budgetTemplateId: e.target.value || undefined })}
                                  className="px-2 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                                >
                                  <option value="">Без бюджета</option>
                                  {state.budgetTemplates.map((bt) => (
                                    <option key={bt.id} value={bt.id}>{bt.name}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-slate-900 truncate">{t.description}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                              <span>{t.category}</span>
                              <span>·</span>
                              <span>{member?.name}</span>
                              {budgetItem && (
                                <>
                                  <span>·</span>
                                  <span className="flex items-center gap-0.5 text-blue-500">
                                    <Target className="w-3 h-3" />
                                    {budgetItem.name}
                                  </span>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={saveEdit}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span
                              className={`text-sm font-bold flex items-center gap-0.5 ${
                                t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                              }`}
                            >
                              {t.type === 'income' ? (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowDownRight className="w-3.5 h-3.5" />
                              )}
                              {formatCurrency(t.amount)}
                            </span>
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => startEdit(t)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDelete(t.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
