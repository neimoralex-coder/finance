import { Wallet, Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface HeaderProps {
  currentMonth: string;
  onReset: () => void;
}

export default function Header({ currentMonth, onReset }: HeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleReset = () => {
    onReset();
    setConfirmReset(false);
    setShowSettings(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Семейный бюджет</h1>
              <p className="text-xs text-slate-500">{currentMonth}</p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
            >
              <Settings className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden"
                >
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">Настройки</h3>
                    {!confirmReset ? (
                      <button
                        onClick={() => setConfirmReset(true)}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Сбросить все данные
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-600">Уверены? Все транзакции и бюджеты будут удалены.</p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleReset}
                            className="flex-1 px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Да, сбросить
                          </button>
                          <button
                            onClick={() => setConfirmReset(false)}
                            className="flex-1 px-3 py-1.5 text-xs bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
