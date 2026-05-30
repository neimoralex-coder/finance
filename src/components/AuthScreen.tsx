import { useState } from 'react';
import { Wallet, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

type Mode = 'login' | 'register';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const isRegister = mode === 'register';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');

    if (!email.trim() || !password.trim()) {
      setMessage('Введите email и пароль.');
      return;
    }

    setLoading(true);

    const result = isRegister
      ? await supabase.auth.signUp({ email: email.trim(), password })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password });

    setLoading(false);

    if (result.error) {
      setMessage(result.error.message);
      return;
    }

    if (isRegister && !result.data.session) {
      setMessage('Аккаунт создан. Проверьте почту для подтверждения входа или отключите подтверждение email в Supabase на время теста.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Семейный бюджет</h1>
            <p className="text-sm text-slate-500">Вход в облачную версию</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              autoComplete="email"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Пароль</label>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Минимум 6 символов"
            />
          </div>

          {message && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-white font-semibold shadow-lg shadow-emerald-200 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isRegister ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(isRegister ? 'login' : 'register');
            setMessage('');
          }}
          className="w-full mt-4 text-sm text-slate-600 hover:text-slate-900"
        >
          {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
        </button>

        <p className="mt-5 text-xs text-slate-500 leading-relaxed">
          Для теста можно создать один общий аккаунт для вас с Леной. Все данные будут храниться в Supabase и открываться на разных устройствах после входа.
        </p>
      </div>
    </div>
  );
}
