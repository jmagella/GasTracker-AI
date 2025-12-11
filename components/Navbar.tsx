import React from 'react';
import { Moon, Sun, Fuel, Map, PlusCircle, History, BarChart3, Settings } from 'lucide-react';
import { Tab } from '../types';

interface NavbarProps {
  currentTab: Tab;
  onTabChange: (tab: Tab) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange }) => {
  const navItems = [
    { id: Tab.ENTRY, label: 'Add Fuel', icon: PlusCircle },
    { id: Tab.HISTORY, label: 'History', icon: History },
    { id: Tab.STATS, label: 'Stats', icon: BarChart3 },
    { id: Tab.MAP, label: 'Map', icon: Map },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 pb-safe shadow-lg z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex-1 h-full flex flex-col items-center justify-center text-sm font-medium transition-colors ${
              currentTab === item.id
                ? 'text-brand-600 dark:text-brand-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <item.icon className="w-5 h-5 mb-1" />
            <span className="text-[10px]">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export const Header: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => (
  <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex justify-between items-center">
    <div className="flex items-center gap-2">
      <div className="bg-brand-500 p-1.5 rounded-lg text-white">
        <Fuel size={20} />
      </div>
      <h1 className="text-xl font-bold bg-gradient-to-r from-brand-600 to-blue-400 bg-clip-text text-transparent">
        GasTracker AI
      </h1>
    </div>
    <button
      onClick={onOpenSettings}
      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-300"
      aria-label="Open Settings"
    >
      <Settings size={22} />
    </button>
  </header>
);

export default Navbar;