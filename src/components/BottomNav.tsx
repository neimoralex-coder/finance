import { LayoutDashboard, List, BarChart3, Plus, PiggyBank, Wallet, Calendar } from 'lucide-react';

export type Tab = 'dashboard' | 'transactions' | 'budgets' | 'analytics' | 'savings' | 'buffer' | 'monthlyBudget';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
  onAdd: () => void;
}

export const navTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Главная', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'transactions', label: 'Транзакции', icon: <List className="w-5 h-5" /> },
  { id: 'monthlyBudget', label: 'Бюджет', icon: <Calendar className="w-5 h-5" /> },
  { id: 'savings', label: 'Сбережения', icon: <PiggyBank className="w-5 h-5" /> },
  { id: 'buffer', label: 'Буфер', icon: <Wallet className="w-5 h-5" /> },
  { id: 'analytics', label: 'Аналитика', icon: <BarChart3 className="w-5 h-5" /> },
];

export default function BottomNav({ active, onChange, onAdd }: Props) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Семейный</h1>
              <p className="text-xs text-slate-500">бюджет</p>
            </div>
          </div>

          <button
            onClick={onAdd}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transition-all flex items-center justify-center gap-2 mb-6"
          >
            <Plus className="w-5 h-5" />
            Добавить
          </button>

          <nav className="space-y-1">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active === tab.id
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
