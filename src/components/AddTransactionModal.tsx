import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { TransactionType, Member, INCOME_CATEGORIES, EXPENSE_CATEGORIES, FamilyMember, BudgetTemplate } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (tx: { amount: number; type: TransactionType; category: string; description: string; date: string; member: Member; budgetTemplateId?: string }) => void;
  members: FamilyMember[];
  budgetTemplates: BudgetTemplate[];
}

export default function AddTransactionModal({ isOpen, onClose, onAdd, members, budgetTemplates }: Props) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [member, setMember] = useState<Member>('person1');
  const [budgetTemplateId, setBudgetTemplateId] = useState('');

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;
    onAdd({
      amount: parseFloat(amount),
      type,
      category,
      description: description || category,
      date,
      member,
      budgetTemplateId: type === 'expense' && budgetTemplateId ? budgetTemplateId : undefined,
    });
    setAmount('');
    setCategory('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setBudgetTemplateId('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Новая транзакция</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Type toggle */}
              <div className="flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => { setType('expense'); setCategory(''); setBudgetTemplateId(''); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Расход
                </button>
                <button
                  type="button"
                  onClick={() => { setType('income'); setCategory(''); setBudgetTemplateId(''); }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  Доход
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Сумма</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                    className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-lg font-semibold text-slate-900 transition-all"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">₽</span>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Категория</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all text-left ${
                        category === cat
                          ? type === 'income'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : 'border-rose-300 bg-rose-50 text-rose-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget item (only for expenses) */}
              {type === 'expense' && budgetTemplates.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Пункт бюджета</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBudgetTemplateId('')}
                      className={`px-3 py-2 text-sm rounded-lg border transition-all text-left ${
                        budgetTemplateId === ''
                          ? 'border-blue-300 bg-blue-50 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      Без бюджета
                    </button>
                    {budgetTemplates.map((bt) => (
                      <button
                        key={bt.id}
                        type="button"
                        onClick={() => setBudgetTemplateId(bt.id)}
                        className={`px-3 py-2 text-sm rounded-lg border transition-all text-left ${
                          budgetTemplateId === bt.id
                            ? 'border-blue-300 bg-blue-50 text-blue-700'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {bt.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Описание</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Например, покупка в Пятёрочке"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-slate-900 transition-all"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Дата</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none text-sm text-slate-900 transition-all"
                />
              </div>

              {/* Member */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Кто</label>
                <div className="flex gap-2">
                  {members.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMember(m.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                        member === m.id
                          ? 'border-slate-300 bg-slate-50 text-slate-900 shadow-sm'
                          : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: m.color }}
                      >
                        {m.avatar}
                      </div>
                      <span className="text-sm font-medium">{m.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className={`w-full py-3 rounded-xl text-white font-semibold shadow-lg transition-all flex items-center justify-center gap-2 ${
                  type === 'income'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-200 hover:shadow-emerald-300'
                    : 'bg-gradient-to-r from-rose-500 to-pink-600 shadow-rose-200 hover:shadow-rose-300'
                }`}
              >
                <Plus className="w-5 h-5" />
                Добавить {type === 'income' ? 'доход' : 'расход'}
              </button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
