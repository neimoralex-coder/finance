export type TransactionType = 'income' | 'expense';
export type Member = 'person1' | 'person2';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  date: string;
  member: Member;
  budgetTemplateId?: string;
}

export interface BudgetTemplate {
  id: string;
  name: string;
  limit: number;
  order: number;
}

export interface MonthlyBudgetItem {
  templateId: string;
  spent: number;
}

export interface MonthlyBudget {
  month: string;
  items: MonthlyBudgetItem[];
  status: 'open' | 'closed';
  closedAt?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  monthlyTarget: number;
  current: number;
  color: string;
  icon: string;
}

export interface SavingsTransaction {
  id: string;
  goalId: string;
  amount: number;
  date: string;
  note: string;
  member: Member;
}

export interface FamilyMember {
  id: Member;
  name: string;
  color: string;
  avatar: string;
}

export const INCOME_CATEGORIES = [
  'Зарплата',
  'Фриланс',
  'Инвестиции',
  'Кэшбэк',
  'Подарки',
  'Другое',
];

export const EXPENSE_CATEGORIES = [
  'Продукты',
  'Транспорт',
  'Жильё',
  'Развлечения',
  'Здоровье',
  'Одежда',
  'Образование',
  'Связь',
  'Рестораны',
  'Другое',
];

export const CATEGORY_COLORS: Record<string, string> = {
  'Зарплата': '#10b981',
  'Фриланс': '#34d399',
  'Инвестиции': '#059669',
  'Кэшбэк': '#6ee7b7',
  'Подарки': '#a7f3d0',
  'Другое (доход)': '#d1fae5',
  'Продукты': '#f59e0b',
  'Транспорт': '#3b82f6',
  'Жильё': '#8b5cf6',
  'Развлечения': '#ec4899',
  'Здоровье': '#ef4444',
  'Одежда': '#06b6d4',
  'Образование': '#6366f1',
  'Связь': '#14b8a6',
  'Рестораны': '#f97316',
  'Другое': '#9ca3af',
};

export function getCategoryColor(category: string, type: TransactionType): string {
  if (type === 'income') {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS['Другое (доход)'];
  }
  return CATEGORY_COLORS[category] || CATEGORY_COLORS['Другое'];
}
