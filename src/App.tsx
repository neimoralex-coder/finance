import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from './store';
import BottomNav from './components/BottomNav';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import MonthlyBudgetPage from './components/MonthlyBudgetPage';
import Analytics from './components/Analytics';
import Savings from './components/Savings';
import Buffer from './components/Buffer';
import AddTransactionModal from './components/AddTransactionModal';
import Header from './components/Header';
import { getCurrentMonthYear } from './lib/utils';

type Tab = 'dashboard' | 'transactions' | 'budgets' | 'analytics' | 'savings' | 'buffer' | 'monthlyBudget';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showAddTx, setShowAddTx] = useState(false);

  const store = useAppStore();

  if (!store.loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <BottomNav active={activeTab} onChange={setActiveTab} onAdd={() => setShowAddTx(true)} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header currentMonth={getCurrentMonthYear()} onReset={store.resetData} />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && (
                <Dashboard
                  state={store.state}
                  onAddClick={() => setShowAddTx(true)}
                  onSavingsClick={() => setActiveTab('savings')}
                  onBudgetClick={() => setActiveTab('monthlyBudget')}
                />
              )}
              {activeTab === 'transactions' && (
                <Transactions
                  state={store.state}
                  onDelete={store.deleteTransaction}
                  onUpdate={store.updateTransaction}
                />
              )}
              {activeTab === 'monthlyBudget' && (
                <MonthlyBudgetPage
                  state={store.state}
                  onAddTemplate={store.addBudgetTemplate}
                  onUpdateTemplate={store.updateBudgetTemplate}
                  onDeleteTemplate={store.deleteBudgetTemplate}
                  onCloseMonth={store.closeMonth}
                  onResolveOverspend={store.resolveOverspend}
                />
              )}
              {activeTab === 'savings' && (
                <Savings
                  state={store.state}
                  onAddSavings={store.addSavingsTransaction}
                  onDeleteSavings={store.deleteSavingsTransaction}
                  onUpdateGoal={store.updateSavingsGoal}
                  onAddGoal={store.addSavingsGoal}
                  onDeleteGoal={store.deleteSavingsGoal}
                />
              )}
              {activeTab === 'buffer' && <Buffer state={store.state} onAddBufferTransaction={store.addBufferTransaction} />}
              {activeTab === 'analytics' && <Analytics state={store.state} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <AddTransactionModal
        isOpen={showAddTx}
        onClose={() => setShowAddTx(false)}
        onAdd={store.addTransaction}
        members={store.state.members}
        budgetTemplates={store.state.budgetTemplates}
      />
    </div>
  );
}
