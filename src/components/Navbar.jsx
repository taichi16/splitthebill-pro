import React from 'react';
import { Users, Receipt, PieChart, Settings } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const navItems = [
    { id: 'members', label: '成員管理', icon: Users },
    { id: 'expenses', label: '消費明細', icon: Receipt },
    { id: 'settlement', label: '結算拆帳', icon: PieChart },
    { id: 'data', label: '資料與備份', icon: Settings },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
