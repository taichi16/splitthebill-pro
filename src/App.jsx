import React, { useState, useEffect } from 'react';
import { Moon, Sun, Wallet, MapPin } from 'lucide-react';
import Navbar from './components/Navbar';
import MemberManager from './components/MemberManager';
import ExpenseList from './components/ExpenseList';
import ExpenseModal from './components/ExpenseModal';
import SettlementView from './components/SettlementView';
import DataManager from './components/DataManager';
import {
  loadStoredTripName,
  saveStoredTripName,
  loadStoredMembers,
  saveStoredMembers,
  loadStoredExpenses,
  saveStoredExpenses
} from './utils/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState('expenses'); // 'members' | 'expenses' | 'settlement' | 'data'
  const [theme, setTheme] = useState('light');
  const [tripName, setTripName] = useState(loadStoredTripName);
  const [members, setMembers] = useState(loadStoredMembers);
  const [expenses, setExpenses] = useState(loadStoredExpenses);

  // Expense modal state
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Toast state
  const [toastMessage, setToastMessage] = useState(null);

  // Sync LocalStorage whenever tripName, members, or expenses change
  useEffect(() => {
    saveStoredTripName(tripName);
  }, [tripName]);

  useEffect(() => {
    saveStoredMembers(members);
  }, [members]);

  useEffect(() => {
    saveStoredExpenses(expenses);
  }, [expenses]);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleOpenAddExpense = () => {
    if (members.length === 0) {
      showToast('請先新增至少一位成員！');
      setActiveTab('members');
      return;
    }
    setEditingExpense(null);
    setShowExpenseModal(true);
  };

  const handleOpenEditExpense = (expense) => {
    setEditingExpense(expense);
    setShowExpenseModal(true);
  };

  const handleSaveExpense = (expData) => {
    if (editingExpense) {
      setExpenses(expenses.map(e => e.id === expData.id ? expData : e));
      showToast(`已更新消費「${expData.title}」`);
    } else {
      setExpenses([expData, ...expenses]);
      showToast(`已新增消費「${expData.title}」`);
    }
    setShowExpenseModal(false);
  };

  return (
    <div className="app-container">
      {/* Toast message popup */}
      {toastMessage && (
        <div className="toast-container">
          <div className="toast">{toastMessage}</div>
        </div>
      )}

      {/* Top Mobile Header */}
      <header className="app-header">
        <div>
          <div className="app-title">
            <Wallet size={22} />
            <span>多人記帳拆帳 專業版</span>
          </div>
          {tripName && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
              <MapPin size={12} color="var(--primary)" /> {tripName}
            </div>
          )}
        </div>
        <button className="theme-btn" onClick={toggleTheme} title="切換主題模式">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} color="#fbbf24" />}
        </button>
      </header>

      {/* Main Tab Views */}
      <main>
        {activeTab === 'members' && (
          <MemberManager
            members={members}
            setMembers={setMembers}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpenseList
            expenses={expenses}
            setExpenses={setExpenses}
            members={members}
            onOpenAdd={handleOpenAddExpense}
            onOpenEdit={handleOpenEditExpense}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'settlement' && (
          <SettlementView
            members={members}
            expenses={expenses}
            tripName={tripName}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'data' && (
          <DataManager
            tripName={tripName}
            setTripName={setTripName}
            members={members}
            expenses={expenses}
            setMembers={setMembers}
            setExpenses={setExpenses}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Expense Modal */}
      <ExpenseModal
        show={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSave={handleSaveExpense}
        editingExpense={editingExpense}
        members={members}
      />

      {/* Bottom Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
