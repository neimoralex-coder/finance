import { Wallet, Settings, Trash2, X, Plus } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { navTabs, type Tab } from './BottomNav';

interface HeaderProps {
  currentMonth: string;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onAdd: () => void;
  onReset: () => void;
}

export default function Header({ currentMonth, activeTab, onTabChange, onAdd, onReset }: HeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const activeLabel = navTabs.find((tab) => tab.id === activeTab)?.label || 'Главная';

  const handleReset = () => {
    onReset();
    setConfirmReset(false);
    setShowSettings(false);
  };

  const handleTabClick = (tab: Tab) => {
    onTabChange(tab);
    setShowMobileMenu(false);
  };

  const handleAddClick = () => {
    onAdd();
    setShowMobileMenu(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setShowMobileMenu(true)}
              className="lg:pointer-events-none shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200"
              aria-label="Открыть меню"
            >
              <Wallet className="w-5 h-5 text-white" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 leading-tight truncate">Семейный бюджет</h1>
              <p className="text-xs text-slate-500 truncate">{currentMonth} · {activeLabel}</p>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
              aria-label="Настройки"
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

      <AnimatePresence>
        {showMobileMenu && (
          <>
            <motion.button
              type="button"
              aria-label="Закрыть меню"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMenu(false)}
              className="lg:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px]"
            />

            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.18 }}
              className="lg:hidden fixed left-3 right-3 top-3 z-50 rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 leading-tight">Меню</h2>
                    <p className="text-xs text-slate-500">{currentMonth}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMobileMenu(false)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
                  aria-label="Закрыть"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3">
                <button
                  type="button"
                  onClick={handleAddClick}
                  className="w-full mb-2 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Добавить операцию
                </button>

                <nav className="grid grid-cols-2 gap-2">
                  {navTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabClick(tab.id)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-medium transition-all ${
                        activeTab === tab.id
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {tab.icon}
                      <span className="truncate">{tab.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
