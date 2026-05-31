import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Transaction,
  BudgetTemplate,
  MonthlyBudget,
  Member,
  FamilyMember,
  SavingsGoal,
  SavingsTransaction,
  BufferTransaction,
  BudgetResolutionAllocation,
  BudgetOverspendResolution,
} from './types';
import { supabase } from './supabaseClient';

const STORAGE_KEY = 'family-finance-tracker-v10';

export interface AppState {
  transactions: Transaction[];
  budgetTemplates: BudgetTemplate[];
  monthlyBudgets: MonthlyBudget[];
  savingsGoals: SavingsGoal[];
  savingsTransactions: SavingsTransaction[];
  bufferDebt: number;
  bufferTransactions: BufferTransaction[];
  budgetResolutions: BudgetOverspendResolution[];
  members: FamilyMember[];
}

const defaultMembers: FamilyMember[] = [
  { id: 'person1' as Member, name: 'Артем', color: '#3b82f6', avatar: 'А' },
  { id: 'person2' as Member, name: 'Елена', color: '#ec4899', avatar: 'Е' },
];

const defaultBudgetTemplates: BudgetTemplate[] = [
  { id: 'bt-prod', name: 'Продукты', limit: 35000, order: 0 },
  { id: 'bt-trans', name: 'Транспорт', limit: 15000, order: 1 },
  { id: 'bt-home', name: 'Жильё', limit: 50000, order: 2 },
  { id: 'bt-fun', name: 'Развлечения', limit: 15000, order: 3 },
  { id: 'bt-health', name: 'Здоровье', limit: 10000, order: 4 },
  { id: 'bt-cloth', name: 'Одежда', limit: 10000, order: 5 },
  { id: 'bt-rest', name: 'Рестораны', limit: 12000, order: 6 },
];

const defaultSavingsGoals: SavingsGoal[] = [
  { id: 'safety-net', name: 'Подушка безопасности', monthlyTarget: 15000, current: 125000, color: '#10b981', icon: '🛡️' },
  { id: 'investments', name: 'Инвестиции', monthlyTarget: 8000, current: 45000, color: '#8b5cf6', icon: '📈' },
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

function getMonthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function normalizeState(parsed: Partial<AppState> | null | undefined): AppState {
  return {
    transactions: parsed?.transactions || [],
    budgetTemplates: parsed?.budgetTemplates || defaultBudgetTemplates,
    monthlyBudgets: parsed?.monthlyBudgets || [],
    savingsGoals: parsed?.savingsGoals || defaultSavingsGoals,
    savingsTransactions: parsed?.savingsTransactions || [],
    bufferDebt: parsed?.bufferDebt || 0,
    bufferTransactions: parsed?.bufferTransactions || [],
    budgetResolutions: parsed?.budgetResolutions || [],
    members: parsed?.members || defaultMembers,
  };
}

function getInitialState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return normalizeState(JSON.parse(raw));
    }
  } catch {
    // ignore
  }

  return normalizeState(null);
}

function saveState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function loadCloudState(userId: string, fallbackState: AppState) {
  const { data, error } = await supabase
    .from('app_states')
    .select('id, data')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data?.id) {
    return {
      rowId: data.id as string,
      state: normalizeState(data.data as Partial<AppState>),
    };
  }

  const { data: inserted, error: insertError } = await supabase
    .from('app_states')
    .insert({
      user_id: userId,
      data: fallbackState,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError) {
    throw insertError;
  }

  return {
    rowId: inserted.id as string,
    state: fallbackState,
  };
}

async function saveCloudState(userId: string, state: AppState, rowId?: string | null) {
  const payload = {
    data: state,
    updated_at: new Date().toISOString(),
  };

  if (rowId) {
    const { error } = await supabase
      .from('app_states')
      .update(payload)
      .eq('id', rowId)
      .eq('user_id', userId);

    if (!error) return;

    console.error('Не удалось обновить данные Supabase по rowId, пробую по user_id:', error);
  }

  const { data: existing, error: selectError } = await supabase
    .from('app_states')
    .select('id')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('app_states')
      .update(payload)
      .eq('id', existing.id)
      .eq('user_id', userId);

    if (updateError) throw updateError;
    return;
  }

  const { error: insertError } = await supabase
    .from('app_states')
    .insert({
      user_id: userId,
      data: state,
      updated_at: new Date().toISOString(),
    });

  if (insertError) throw insertError;
}

function createMonthlyBudget(month: string, templates: BudgetTemplate[]): MonthlyBudget {
  return {
    month,
    items: templates.map((t) => ({ templateId: t.id, spent: 0 })),
    status: 'open',
  };
}

function ensureDemoData(state: AppState): AppState {
  if (state.transactions.length > 0) return state;

  const now = new Date();
  const currentMonth = getMonthKey(now);
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = getMonthKey(prevMonthDate);

  const demoTransactions: Transaction[] = [];

  const incomes = [
    { cat: 'Зарплата', amount: 120000, member: 'person1' as Member },
    { cat: 'Зарплата', amount: 95000, member: 'person2' as Member },
    { cat: 'Фриланс', amount: 25000, member: 'person1' as Member },
    { cat: 'Инвестиции', amount: 8000, member: 'person2' as Member },
  ];

  const expensesCurrent = [
    { cat: 'Продукты', amount: 18500, member: 'person1' as Member, bt: 'bt-prod' },
    { cat: 'Продукты', amount: 12200, member: 'person2' as Member, bt: 'bt-prod' },
    { cat: 'Транспорт', amount: 6500, member: 'person1' as Member, bt: 'bt-trans' },
    { cat: 'Транспорт', amount: 4200, member: 'person2' as Member, bt: 'bt-trans' },
    { cat: 'Жильё', amount: 45000, member: 'person1' as Member, bt: 'bt-home' },
    { cat: 'Развлечения', amount: 8500, member: 'person2' as Member, bt: 'bt-fun' },
    { cat: 'Здоровье', amount: 3200, member: 'person1' as Member, bt: 'bt-health' },
    { cat: 'Одежда', amount: 5600, member: 'person2' as Member, bt: 'bt-cloth' },
    { cat: 'Рестораны', amount: 7800, member: 'person1' as Member, bt: 'bt-rest' },
    { cat: 'Другое', amount: 3400, member: 'person2' as Member, bt: undefined },
  ];

  const expensesPrev = [
    { cat: 'Продукты', amount: 28000, member: 'person1' as Member, bt: 'bt-prod' },
    { cat: 'Жильё', amount: 48000, member: 'person1' as Member, bt: 'bt-home' },
    { cat: 'Развлечения', amount: 18000, member: 'person2' as Member, bt: 'bt-fun' },
    { cat: 'Транспорт', amount: 12000, member: 'person2' as Member, bt: 'bt-trans' },
    { cat: 'Здоровье', amount: 5000, member: 'person1' as Member, bt: 'bt-health' },
    { cat: 'Одежда', amount: 8000, member: 'person2' as Member, bt: 'bt-cloth' },
  ];

  for (let i = 0; i < incomes.length; i++) {
    const t = incomes[i];

    demoTransactions.push({
      id: generateId(),
      amount: t.amount,
      type: 'income',
      category: t.cat,
      description: t.cat === 'Зарплата' ? 'Ежемесячная зарплата' : 'Доход',
      date: new Date(now.getFullYear(), now.getMonth(), 5 + i * 3).toISOString().split('T')[0],
      member: t.member,
    });
  }

  for (let i = 0; i < expensesCurrent.length; i++) {
    const t = expensesCurrent[i];

    demoTransactions.push({
      id: generateId(),
      amount: t.amount,
      type: 'expense',
      category: t.cat,
      description: t.cat,
      date: new Date(now.getFullYear(), now.getMonth(), 2 + i * 2).toISOString().split('T')[0],
      member: t.member,
      budgetTemplateId: t.bt,
    });
  }

  for (let i = 0; i < 3; i++) {
    demoTransactions.push({
      id: generateId(),
      amount: 120000,
      type: 'income',
      category: 'Зарплата',
      description: 'Зарплата',
      date: new Date(now.getFullYear(), now.getMonth() - 1, 5 + i).toISOString().split('T')[0],
      member: i % 2 === 0 ? ('person1' as Member) : ('person2' as Member),
    });
  }

  for (let i = 0; i < expensesPrev.length; i++) {
    const t = expensesPrev[i];

    demoTransactions.push({
      id: generateId(),
      amount: t.amount,
      type: 'expense',
      category: t.cat,
      description: t.cat,
      date: new Date(now.getFullYear(), now.getMonth() - 1, 3 + i * 4).toISOString().split('T')[0],
      member: t.member,
      budgetTemplateId: t.bt,
    });
  }

  const currentMB = createMonthlyBudget(currentMonth, defaultBudgetTemplates);
  const prevMB = createMonthlyBudget(prevMonth, defaultBudgetTemplates);

  demoTransactions.forEach((tx) => {
    if (tx.type === 'expense' && tx.budgetTemplateId) {
      const txMonth = tx.date.slice(0, 7);
      const mb = txMonth === currentMonth ? currentMB : txMonth === prevMonth ? prevMB : null;

      if (mb) {
        const item = mb.items.find((it) => it.templateId === tx.budgetTemplateId);
        if (item) item.spent += tx.amount;
      }
    }
  });

  prevMB.status = 'closed';
  prevMB.closedAt = new Date().toISOString();

  const demoSavingsTx: SavingsTransaction[] = [
    {
      id: generateId(),
      goalId: 'safety-net',
      amount: 15000,
      date: new Date(now.getFullYear(), now.getMonth(), 10).toISOString().split('T')[0],
      note: 'Ежемесячное отложение',
      member: 'person1' as Member,
    },
    {
      id: generateId(),
      goalId: 'safety-net',
      amount: 5000,
      date: new Date(now.getFullYear(), now.getMonth(), 12).toISOString().split('T')[0],
      note: 'Дополнительно',
      member: 'person2' as Member,
    },
    {
      id: generateId(),
      goalId: 'investments',
      amount: 3000,
      date: new Date(now.getFullYear(), now.getMonth(), 15).toISOString().split('T')[0],
      note: 'В акции',
      member: 'person2' as Member,
    },
  ];

  return {
    ...state,
    transactions: demoTransactions,
    budgetTemplates: defaultBudgetTemplates,
    monthlyBudgets: [prevMB, currentMB],
    savingsGoals: defaultSavingsGoals,
    savingsTransactions: demoSavingsTx,
    bufferDebt: state.bufferDebt || 0,
    bufferTransactions: state.bufferTransactions || [],
    budgetResolutions: state.budgetResolutions || [],
    members: state.members || defaultMembers,
  };
}

export function useAppStore(userId: string | null = null) {
  const [state, setState] = useState<AppState>(() => ensureDemoData(getInitialState()));
  const [loaded, setLoaded] = useState(false);
  const [cloudRowId, setCloudRowId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      setLoaded(false);
      setCloudRowId(null);

      const localState = ensureDemoData(getInitialState());

      if (!userId) {
        setState(localState);
        setLoaded(true);
        return;
      }

      try {
        const cloud = await loadCloudState(userId, localState);

        if (cancelled) return;

        setState(ensureDemoData(cloud.state));
        setCloudRowId(cloud.rowId);
      } catch (error) {
        console.error('Не удалось загрузить данные из Supabase:', error);

        if (cancelled) return;

        setState(localState);
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    }

    loadState();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!loaded) return;

    const currentMonth = getMonthKey(new Date());

    setState((prev) => {
      const hasBudget = prev.monthlyBudgets.some((mb) => mb.month === currentMonth);

      if (hasBudget) return prev;

      return {
        ...prev,
        monthlyBudgets: [...prev.monthlyBudgets, createMonthlyBudget(currentMonth, prev.budgetTemplates)],
      };
    });
  }, [loaded]);

  useEffect(() => {
    if (!loaded) return;

    saveState(state);

    if (!userId) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      try {
        await saveCloudState(userId, state, cloudRowId);
      } catch (error) {
        console.error('Не удалось сохранить данные в Supabase:', error);
      }
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [state, loaded, userId, cloudRowId]);

  const addTransaction = useCallback((tx: Omit<Transaction, 'id'>) => {
    setState((prev) => {
      const newTx = { ...tx, id: generateId() };
      const newTransactions = [newTx, ...prev.transactions];

      if (tx.type === 'expense' && tx.budgetTemplateId) {
        const txMonth = tx.date.slice(0, 7);

        const newBudgets = prev.monthlyBudgets.map((mb) => {
          if (mb.month === txMonth && mb.status === 'open') {
            return {
              ...mb,
              items: mb.items.map((item) =>
                item.templateId === tx.budgetTemplateId
                  ? { ...item, spent: item.spent + tx.amount }
                  : item
              ),
            };
          }

          return mb;
        });

        return {
          ...prev,
          transactions: newTransactions,
          monthlyBudgets: newBudgets,
        };
      }

      return {
        ...prev,
        transactions: newTransactions,
      };
    });
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setState((prev) => {
      const tx = prev.transactions.find((t) => t.id === id);

      if (!tx) return prev;

      const newTransactions = prev.transactions.filter((t) => t.id !== id);

      if (tx.type === 'expense' && tx.budgetTemplateId) {
        const txMonth = tx.date.slice(0, 7);

        const newBudgets = prev.monthlyBudgets.map((mb) => {
          if (mb.month === txMonth) {
            return {
              ...mb,
              items: mb.items.map((item) =>
                item.templateId === tx.budgetTemplateId
                  ? { ...item, spent: Math.max(0, item.spent - tx.amount) }
                  : item
              ),
            };
          }

          return mb;
        });

        return {
          ...prev,
          transactions: newTransactions,
          monthlyBudgets: newBudgets,
        };
      }

      return {
        ...prev,
        transactions: newTransactions,
      };
    });
  }, []);

  const updateTransaction = useCallback((id: string, txUpdates: Partial<Transaction>) => {
    setState((prev) => {
      const oldTx = prev.transactions.find((t) => t.id === id);

      if (!oldTx) return prev;

      const newTransactions = prev.transactions.map((t) =>
        t.id === id ? { ...t, ...txUpdates } : t
      );

      if (
        oldTx.type === 'expense' &&
        (
          txUpdates.amount !== undefined ||
          txUpdates.budgetTemplateId !== undefined ||
          txUpdates.date !== undefined
        )
      ) {
        const newBudgets = prev.monthlyBudgets.map((mb) => ({
          ...mb,
          items: mb.items.map((item) => {
            const spent = newTransactions
              .filter(
                (t) =>
                  t.type === 'expense' &&
                  t.budgetTemplateId === item.templateId &&
                  t.date.slice(0, 7) === mb.month
              )
              .reduce((s, t) => s + t.amount, 0);

            return {
              ...item,
              spent,
            };
          }),
        }));

        return {
          ...prev,
          transactions: newTransactions,
          monthlyBudgets: newBudgets,
        };
      }

      return {
        ...prev,
        transactions: newTransactions,
      };
    });
  }, []);

  const addBudgetTemplate = useCallback((template: Omit<BudgetTemplate, 'id'>) => {
    setState((prev) => {
      const newTemplate = {
        ...template,
        id: generateId(),
      };

      const hasOpen = prev.monthlyBudgets.some((mb) => mb.status === 'open');

      let newBudgets = prev.monthlyBudgets;

      if (!hasOpen) {
        const currentMonth = getMonthKey(new Date());
        newBudgets = [...newBudgets, createMonthlyBudget(currentMonth, prev.budgetTemplates)];
      }

      newBudgets = newBudgets.map((mb) => {
        if (mb.status === 'open' && !mb.items.find((it) => it.templateId === newTemplate.id)) {
          return {
            ...mb,
            items: [...mb.items, { templateId: newTemplate.id, spent: 0 }],
          };
        }

        return mb;
      });

      return {
        ...prev,
        budgetTemplates: [...prev.budgetTemplates, newTemplate],
        monthlyBudgets: newBudgets,
      };
    });
  }, []);

  const updateBudgetTemplate = useCallback((id: string, updates: Partial<BudgetTemplate>) => {
    setState((prev) => ({
      ...prev,
      budgetTemplates: prev.budgetTemplates.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }));
  }, []);

  const deleteBudgetTemplate = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      budgetTemplates: prev.budgetTemplates.filter((t) => t.id !== id),
      monthlyBudgets: prev.monthlyBudgets.map((mb) => ({
        ...mb,
        items: mb.items.filter((it) => it.templateId !== id),
      })),
    }));
  }, []);

  const closeMonth = useCallback((month: string) => {
    setState((prev) => {
      const mb = prev.monthlyBudgets.find((m) => m.month === month);

      if (!mb || mb.status !== 'open') return prev;

      const newBudgets = prev.monthlyBudgets.map((m) =>
        m.month === month
          ? {
              ...m,
              status: 'closed' as const,
              closedAt: new Date().toISOString(),
            }
          : m
      );

      const y = parseInt(month.slice(0, 4));
      const m = parseInt(month.slice(5, 7));
      const nextDate = new Date(y, m, 1);
      const nextMonth = getMonthKey(nextDate);
      const hasNext = newBudgets.some((b) => b.month === nextMonth);

      const finalBudgets = hasNext
        ? newBudgets
        : [...newBudgets, createMonthlyBudget(nextMonth, prev.budgetTemplates)];

      return {
        ...prev,
        monthlyBudgets: finalBudgets,
      };
    });
  }, []);

  const reopenMonth = useCallback((month: string) => {
    setState((prev) => {
      const targetBudget = prev.monthlyBudgets.find((m) => m.month === month);

      if (!targetBudget || targetBudget.status !== 'closed') return prev;

      const hasLaterTransactions = prev.transactions.some((t) => t.date.slice(0, 7) > month);
      const hasLaterSavings = prev.savingsTransactions.some((t) => t.date.slice(0, 7) > month);
      const hasLaterResolutions = prev.budgetResolutions.some((r) => r.month > month);

      if (hasLaterTransactions || hasLaterSavings || hasLaterResolutions) {
        return prev;
      }

      const y = parseInt(month.slice(0, 4));
      const m = parseInt(month.slice(5, 7));
      const nextMonth = getMonthKey(new Date(y, m, 1));

      const resolutionsToUndo = prev.budgetResolutions.filter((r) => r.month === month);

      const bufferDebtToRemove = resolutionsToUndo.reduce(
        (sum, r) =>
          sum +
          r.allocations
            .filter((a) => a.type === 'buffer')
            .reduce((s, a) => s + a.amount, 0),
        0
      );

      const nextMonthLimitRestores = new Map<string, number>();

      resolutionsToUndo.forEach((resolution) => {
        const amount = resolution.allocations
          .filter((a) => a.type === 'next-month')
          .reduce((sum, a) => sum + a.amount, 0);

        if (amount > 0) {
          nextMonthLimitRestores.set(
            resolution.targetTemplateId,
            (nextMonthLimitRestores.get(resolution.targetTemplateId) || 0) + amount
          );
        }
      });

      const nextBudget = prev.monthlyBudgets.find((b) => b.month === nextMonth);

      const nextBudgetHasManualData =
        !!nextBudget &&
        (
          nextBudget.items.some((item) => (item.spent || 0) > 0 || (item.correctionSpent || 0) > 0) ||
          prev.transactions.some((t) => t.date.slice(0, 7) === nextMonth) ||
          prev.savingsTransactions.some((t) => t.date.slice(0, 7) === nextMonth) ||
          prev.budgetResolutions.some((r) => r.month === nextMonth)
        );

      let newBudgets = prev.monthlyBudgets.map((budget) => {
        if (budget.month === month) {
          return {
            ...budget,
            status: 'open' as const,
            closedAt: undefined,
            items: budget.items.map((item) => ({
              ...item,
              correctionSpent: undefined,
            })),
          };
        }

        if (budget.month === nextMonth && nextMonthLimitRestores.size > 0) {
          return {
            ...budget,
            items: budget.items.map((item) => {
              const restoreAmount = nextMonthLimitRestores.get(item.templateId) || 0;

              if (restoreAmount <= 0 || item.limitOverride === undefined) {
                return item;
              }

              const templateLimit = prev.budgetTemplates.find((t) => t.id === item.templateId)?.limit;
              const restoredLimit = item.limitOverride + restoreAmount;

              return {
                ...item,
                limitOverride:
                  templateLimit !== undefined && restoredLimit >= templateLimit
                    ? undefined
                    : restoredLimit,
              };
            }),
          };
        }

        return budget;
      });

      if (nextBudget && !nextBudgetHasManualData) {
        newBudgets = newBudgets.filter((budget) => budget.month !== nextMonth);
      }

      return {
        ...prev,
        monthlyBudgets: newBudgets,
        bufferDebt: Math.max(0, prev.bufferDebt - bufferDebtToRemove),
        budgetResolutions: prev.budgetResolutions.filter((r) => r.month !== month),
      };
    });
  }, []);

  const addSavingsTransaction = useCallback((tx: Omit<SavingsTransaction, 'id'>) => {
    setState((prev) => {
      const newTx = {
        ...tx,
        id: generateId(),
      };

      const updatedGoals = prev.savingsGoals.map((g) =>
        g.id === tx.goalId
          ? {
              ...g,
              current: g.current + tx.amount,
            }
          : g
      );

      return {
        ...prev,
        savingsTransactions: [newTx, ...prev.savingsTransactions],
        savingsGoals: updatedGoals,
      };
    });
  }, []);

  const deleteSavingsTransaction = useCallback((id: string) => {
    setState((prev) => {
      const tx = prev.savingsTransactions.find((t) => t.id === id);

      if (!tx) return prev;

      const updatedGoals = prev.savingsGoals.map((g) =>
        g.id === tx.goalId
          ? {
              ...g,
              current: Math.max(0, g.current - tx.amount),
            }
          : g
      );

      return {
        ...prev,
        savingsTransactions: prev.savingsTransactions.filter((t) => t.id !== id),
        savingsGoals: updatedGoals,
      };
    });
  }, []);

  const updateSavingsGoal = useCallback((id: string, updates: Partial<SavingsGoal>) => {
    setState((prev) => ({
      ...prev,
      savingsGoals: prev.savingsGoals.map((g) =>
        g.id === id ? { ...g, ...updates } : g
      ),
    }));
  }, []);

  const addSavingsGoal = useCallback((goal: Omit<SavingsGoal, 'id'>) => {
    setState((prev) => {
      const newGoal = {
        ...goal,
        id: generateId(),
      };

      return {
        ...prev,
        savingsGoals: [...prev.savingsGoals, newGoal],
      };
    });
  }, []);

  const deleteSavingsGoal = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      savingsGoals: prev.savingsGoals.filter((g) => g.id !== id),
      savingsTransactions: prev.savingsTransactions.filter((t) => t.goalId !== id),
    }));
  }, []);

  const addMember = useCallback((name: string) => {
  setState((prev) => {
    const newMember: FamilyMember = {
      id: generateId() as Member,
      name,
      color: '#64748b',
      avatar: name.trim().charAt(0).toUpperCase() || '?',
    };

    return {
      ...prev,
      members: [...prev.members, newMember],
    };
  });
}, []);

  const updateMember = useCallback((id: Member, updates: Partial<FamilyMember>) => {
    setState((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    }));
  }, []);

  const deleteMember = useCallback((id: Member) => {
    setState((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.id !== id),
      transactions: prev.transactions.filter((t) => t.member !== id),
      savingsTransactions: prev.savingsTransactions.filter((t) => t.member !== id),
    }));
  }, []);

  const resolveOverspend = useCallback(
    (month: string, targetTemplateId: string, allocations: BudgetResolutionAllocation[]) => {
      setState((prev) => {
        const budget = prev.monthlyBudgets.find((mb) => mb.month === month);
        const targetTemplate = prev.budgetTemplates.find((t) => t.id === targetTemplateId);

        if (!budget || !targetTemplate) return prev;

        const resolution: BudgetOverspendResolution = {
          id: generateId(),
          month,
          targetTemplateId,
          targetName: targetTemplate.name,
          overspentAmount: allocations.reduce((sum, a) => sum + a.amount, 0),
          allocations,
          createdAt: new Date().toISOString(),
        };

        let newBudgetDebt = prev.bufferDebt;

        const categoryAllocations = allocations.filter(
          (a) => a.type === 'category' && a.sourceTemplateId
        );

        const bufferAmount = allocations
          .filter((a) => a.type === 'buffer')
          .reduce((sum, a) => sum + a.amount, 0);

        const nextMonthAmount = allocations
          .filter((a) => a.type === 'next-month')
          .reduce((sum, a) => sum + a.amount, 0);

        newBudgetDebt += bufferAmount;

        let newBudgets = prev.monthlyBudgets.map((mb) => {
          if (mb.month !== month) return mb;

          return {
            ...mb,
            items: mb.items.map((item) => {
              const allocation = categoryAllocations
                .filter((a) => a.sourceTemplateId === item.templateId)
                .reduce((sum, a) => sum + a.amount, 0);

              return allocation > 0
                ? {
                    ...item,
                    correctionSpent: (item.correctionSpent || 0) + allocation,
                  }
                : item;
            }),
          };
        });

        if (nextMonthAmount > 0) {
          const y = parseInt(month.slice(0, 4));
          const m = parseInt(month.slice(5, 7));
          const nextMonth = getMonthKey(new Date(y, m, 1));
          const hasNext = newBudgets.some((b) => b.month === nextMonth);

          if (!hasNext) {
            newBudgets = [...newBudgets, createMonthlyBudget(nextMonth, prev.budgetTemplates)];
          }

          newBudgets = newBudgets.map((mb) => {
            if (mb.month !== nextMonth) return mb;

            return {
              ...mb,
              items: mb.items.map((item) => {
                if (item.templateId !== targetTemplateId) return item;

                const currentLimit = item.limitOverride ?? targetTemplate.limit;

                return {
                  ...item,
                  limitOverride: Math.max(0, currentLimit - nextMonthAmount),
                };
              }),
            };
          });
        }

        return {
          ...prev,
          monthlyBudgets: newBudgets,
          bufferDebt: newBudgetDebt,
          budgetResolutions: [resolution, ...prev.budgetResolutions],
        };
      });
    },
    []
  );

  const addBufferTransaction = useCallback((tx: Omit<BufferTransaction, 'id'>) => {
    setState((prev) => {
      const amount = Math.max(0, tx.amount);

      return {
        ...prev,
        bufferDebt: Math.max(0, prev.bufferDebt - amount),
        bufferTransactions: [
          {
            ...tx,
            id: generateId(),
            amount,
          },
          ...prev.bufferTransactions,
        ],
      };
    });
  }, []);

  const resetData = useCallback(() => {
    const currentMonth = getMonthKey(new Date());

    setState({
      transactions: [],
      budgetTemplates: [],
      monthlyBudgets: [createMonthlyBudget(currentMonth, [])],
      savingsGoals: [],
      savingsTransactions: [],
      bufferDebt: 0,
      bufferTransactions: [],
      budgetResolutions: [],
      members: defaultMembers,
    });
  }, []);

  return {
    state,
    loaded,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    addBudgetTemplate,
    updateBudgetTemplate,
    deleteBudgetTemplate,
    closeMonth,
    reopenMonth,
    addSavingsTransaction,
    deleteSavingsTransaction,
    updateSavingsGoal,
    addSavingsGoal,
    deleteSavingsGoal,
    addMember,
    updateMember,
    deleteMember,
    resolveOverspend,
    addBufferTransaction,
    resetData,
  };
}