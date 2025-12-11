import React, { useState, useEffect } from 'react';
import Navbar, { Header } from './components/Navbar';
import FuelEntry from './components/FuelEntry';
import FuelHistory from './components/FuelHistory';
import FuelStats from './components/FuelStats';
import FuelMap from './components/FuelMap';
import { FuelLog, Tab } from './types';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.ENTRY);
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Load data and theme on mount
  useEffect(() => {
    const savedLogs = localStorage.getItem('fuelLogs');
    if (savedLogs) {
      try {
        setLogs(JSON.parse(savedLogs));
      } catch (e) {
        console.error("Failed to parse logs", e);
      }
    }

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Persist logs
  useEffect(() => {
    localStorage.setItem('fuelLogs', JSON.stringify(logs));
  }, [logs]);

  // Persist theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const addLog = (logData: Omit<FuelLog, 'id'>) => {
    const newLog: FuelLog = {
      ...logData,
      id: crypto.randomUUID()
    };
    setLogs(prev => [...prev, newLog]);
    setActiveTab(Tab.HISTORY);
  };

  const deleteLog = (id: string) => {
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  return (
    <div className="min-h-screen pb-20 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      
      <main className="pt-4 h-full">
        {activeTab === Tab.ENTRY && <FuelEntry onAddLog={addLog} />}
        {activeTab === Tab.HISTORY && <FuelHistory logs={logs} onDelete={deleteLog} />}
        {activeTab === Tab.STATS && <FuelStats logs={logs} />}
        {activeTab === Tab.MAP && <FuelMap logs={logs} />}
      </main>

      <Navbar 
        currentTab={activeTab} 
        onTabChange={setActiveTab}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />
    </div>
  );
}

export default App;