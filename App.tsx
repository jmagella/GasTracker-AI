import React, { useState, useEffect } from 'react';
import Navbar, { Header } from './components/Navbar';
import FuelEntry from './components/FuelEntry';
import FuelHistory from './components/FuelHistory';
import FuelStats from './components/FuelStats';
import FuelMap from './components/FuelMap';
import { FuelLog, Tab } from './types';
import { Fuel, ArrowRight } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.ENTRY);
  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isKeySet, setIsKeySet] = useState<boolean>(false);
  const [isCheckingKey, setIsCheckingKey] = useState<boolean>(true);

  // Check for API Key on mount
  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio) {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          setIsKeySet(hasKey);
        } else {
          // If not in AI Studio, assume environment variables are set during build/deployment
          setIsKeySet(true);
        }
      } catch (e) {
        console.error("Error checking API key:", e);
        setIsKeySet(true); // Fallback
      } finally {
        setIsCheckingKey(false);
      }
    };
    checkKey();
  }, []);

  const handleConnect = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // Assume success after dialog closes (race condition mitigation)
        setIsKeySet(true);
      } catch (e) {
        console.error("Failed to select key:", e);
        alert("Failed to select API key. Please try again.");
      }
    }
  };

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

  if (isCheckingKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-brand-200 dark:bg-brand-900 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isKeySet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900 text-center">
        <div className="w-20 h-20 bg-brand-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-brand-500/30">
          <Fuel size={40} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">GasTracker AI</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs">
          Connect your Google account to enable AI scanning features.
        </p>
        <button 
          onClick={handleConnect}
          className="bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-8 rounded-xl shadow-lg shadow-brand-500/30 transition-all flex items-center gap-2"
        >
          Get Started <ArrowRight size={18} />
        </button>
      </div>
    );
  }

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