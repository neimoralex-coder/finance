import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line, AreaChart, Area
} from 'recharts';
import { AppState } from '../store';
import { formatCurrency } from '../lib/utils';
import { getCategoryColor, TransactionType } from '../types';
import { PieChartIcon, BarChart3, TrendingUp, Calendar } from 'lucide-react';

interface Props {
  state: AppState;
}

type ChartTab = 'categories' | 'members' | 'trend' | 'compare';

export default function Analytics({ state }: Props) {
  const [activeTab, setActiveTab] = useState<ChartTab>('categories');
  const [monthsCount, setMonthsCount] = useState(3);

  // Category data for current month
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    state.transactions
      .filter((t) => t.type === 'expense' && t.date >= monthStart && t.date <= monthEnd)
      .forEach((t) => {
        map.set(t.category, (map.get(t.category) || 0) + t.amount);
      });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value, color: getCategoryColor(name, 'expense') }))
      .sort((a, b) => b.value - a.value);
  }, [state.transactions]);
  
// Member data
const memberData = useMemo(() => {
  const currentMonth = new Date().toISOString().slice(0, 7);

  return state.members.map((m) => {
    const income = state.transactions
      .filter((t) => t.member === m.id && t.type === 'income' && t.date.startsWith(currentMonth))
      .reduce((s, t) => s + t.amount, 0);

    const expense = state.transactions
      .filter((t) => t.member === m.id && t.type === 'expense' && t.date.startsWith(currentMonth))
      .reduce((s, t) => s + t.amount, 0);

    return {
      name: m.name,
      Доход: income,
      Расход: expense,
      color: m.color,
    };
  });
}, [state.members, state.transactions]);

  // Trend data (last N months)
  const trendData = useMemo(() => {
    const data: { month: string; Доход: number; Расход: number; Баланс: number }[] = [];
    const now = new Date();

    for (let i = monthsCount - 1; i >= 0; i--) {
      const year = now.getFullYear();
      const month = now.getMonth() - i;
      const d = new Date(year, month, 1);
      const monthStart = d.toISOString().split('T')[0];
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      const monthLabel = d.toLocaleDateString('ru-RU', { month: 'short' });

      const income = state.transactions
        .filter((t) => t.type === 'income' && t.date >= monthStart && t.date <= monthEnd)
        .reduce((s, t) => s + t.amount, 0);
      const expense = state.transactions
        .filter((t) => t.type === 'expense' && t.date >= monthStart && t.date <= monthEnd)
        .reduce((s, t) => s + t.amount, 0);

      data.push({
        month: monthLabel,
        Доход: income,
        Расход: expense,
        Баланс: income - expense,
      });
    }

    return data;
  }, [state.transactions, monthsCount]);

  // Compare by category over time
  const compareData = useMemo(() => {
    const data: { month: string; [key: string]: number | string }[] = [];
    const now = new Date();
    const topCategories = [...categoryData].slice(0, 5).map((c) => c.name);

    for (let i = monthsCount - 1; i >= 0; i--) {
      const year = now.getFullYear();
      const month = now.getMonth() - i;
      const d = new Date(year, month, 1);
      const monthStart = d.toISOString().split('T')[0];
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
      const monthLabel = d.toLocaleDateString('ru-RU', { month: 'short' });

      const row: { month: string; [key: string]: number | string } = { month: monthLabel };
      topCategories.forEach((cat) => {
        row[cat] = state.transactions
          .filter((t) => t.type === 'expense' && t.category === cat && t.date >= monthStart && t.date <= monthEnd)
          .reduce((s, t) => s + t.amount, 0);
      });
      data.push(row);
    }

    return { data, categories: topCategories };
  }, [state.transactions, categoryData, monthsCount]);

  const tabs: { id: ChartTab; label: string; icon: React.ReactNode }[] = [
    { id: 'categories', label: 'Категории', icon: <PieChartIcon className="w-4 h-4" /> },
    { id: 'members', label: 'По участникам', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'trend', label: 'Динамика', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'compare', label: 'Сравнение', icon: <Calendar className="w-4 h-4" /> },
  ];

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#ef4444', '#06b6d4', '#6366f1'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-3 text-sm">
          {label && <p className="font-semibold text-slate-900 mb-1">{label}</p>}
          {payload.map((entry: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 py-0.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-600">{entry.name}:</span>
              <span className="font-semibold text-slate-900">{formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white shadow-lg'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}

        {(activeTab === 'trend' || activeTab === 'compare') && (
          <div className="flex items-center gap-1 ml-auto">
            {[3, 6, 12].map((n) => (
              <button
                key={n}
                onClick={() => setMonthsCount(n)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  monthsCount === n ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {n} мес.
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      <motion.div
        key={activeTab + monthsCount}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100"
      >
        {activeTab === 'categories' && (
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Расходы по категориям (текущий месяц)</h3>
            {categoryData.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {categoryData.map((cat) => (
                    <div key={cat.name} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="flex-1 text-sm text-slate-700">{cat.name}</span>
                      <span className="text-sm font-semibold text-slate-900">{formatCurrency(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-center text-slate-400 py-12">Нет данных за текущий месяц</p>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Сравнение доходов и расходов по участникам</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={memberData} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="Доход" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Расход" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'trend' && (
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Динамика доходов и расходов</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area type="monotone" dataKey="Доход" stroke="#10b981" strokeWidth={2} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="Расход" stroke="#f43f5e" strokeWidth={2} fill="url(#colorExpense)" />
                  <Line type="monotone" dataKey="Баланс" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'compare' && (
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Сравнение топ категорий по месяцам</h3>
            {compareData.categories.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compareData.data} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend />
                    {compareData.categories.map((cat, i) => (
                      <Bar key={cat} dataKey={cat} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-center text-slate-400 py-12">Недостаточно данных</p>
            )}
          </div>
        )}
      </motion.div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {trendData.length > 0 && (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Средний доход за {monthsCount} мес.</p>
              <p className="text-xl font-bold text-emerald-600">
                {formatCurrency(trendData.reduce((s, d) => s + d.Доход, 0) / trendData.length)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Средний расход за {monthsCount} мес.</p>
              <p className="text-xl font-bold text-rose-600">
                {formatCurrency(trendData.reduce((s, d) => s + d.Расход, 0) / trendData.length)}
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 mb-1">Средний баланс за {monthsCount} мес.</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(trendData.reduce((s, d) => s + d.Баланс, 0) / trendData.length)}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
