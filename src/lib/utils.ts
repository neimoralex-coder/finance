import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function getMonthYear(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

export function getCurrentMonthYear(): string {
  const now = new Date();
  return now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

export function getCurrentMonthStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
}

export function getCurrentMonthEnd(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
}

export function getMonthStart(monthKey: string): string {
  return `${monthKey}-01`;
}

export function getMonthEnd(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m, 0).toISOString().split('T')[0];
}
