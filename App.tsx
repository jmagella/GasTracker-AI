import React, { useState, useEffect } from 'react';
import Navbar, { Header } from './components/Navbar';
import FuelEntry from './components/FuelEntry';
import FuelHistory from './components/FuelHistory';
import FuelStats from './components/FuelStats';
import FuelMap from './components/FuelMap';
import Settings from './components/Settings';
import { FuelLog, Tab, ThemeColor } from './types';
import { applyThemeColor } from './utils';
import { Fuel, ArrowRight, Key } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.ENTRY);
  
  // Lazy initialize logs to ensure we read from localStorage before first render
  const [logs, setLogs] = useState<FuelLog[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fuelLogs');
      try {
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        console.error("Failed to parse logs", e);
        return [];
      }
    }
    return [];
  });

  // Lazy initialize theme
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') return true;
      if (savedTheme === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Lazy initialize color
  const [themeColor, setThemeColor] = useState<ThemeColor>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('themeColor');
      return (saved as ThemeColor) || 'blue';
    }
    return 'blue';
  });

  const [isKeySet, setIsKeySet] = useState<boolean>(false);
  const [isCheckingKey, setIsCheckingKey] = useState<boolean>(true);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);

  const checkKey = async () => {
    setIsCheckingKey(true);
    // Small delay to allow window.aistudio injection
    await new Promise(resolve => setTimeout(resolve, 500));

    let hasKey = false;

    // 1. Check AI Studio
    if (window.aistudio) {
      try {
        hasKey = await window.aistudio.hasSelectedApiKey();
      } catch (e) { console.error(e); }
    }

    // 2. Check Environment
    if (!hasKey && typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      hasKey = true;
    }

    // 3. Check LocalStorage
    if (!hasKey && localStorage.getItem('gemini_api_key')) {
      hasKey = true;
    }

    setIsKeySet(hasKey);
    setIsCheckingKey(false);
  };

  useEffect(() => {
    checkKey();
    // Apply initial theme settings
    if (isDarkMode) document.documentElement.classList.add('dark');
    applyThemeColor(themeColor);
  }, []);

  const handleConnectAIStudio = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        checkKey();
      } catch (e) {
        alert("Failed to select API key.");
      }
    } else {
      // If AI Studio is not available, show manual entry
      setShowManualEntry(true);
    }
  };

  const handleManualKeySubmit = () => {
    if (manualKey.trim().length > 10) {
      localStorage.setItem('gemini_api_key', manualKey.trim());
      checkKey(); // Re-run check
    } else {
      alert("Please enter a valid API key");
    }
  };

  // Persist logs whenever they change
  useEffect(() => {
    localStorage.setItem('fuelLogs', JSON.stringify(logs));
  }, [logs]);

  // Persist theme whenever it changes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const handleColorChange = (color: ThemeColor) => {
    setThemeColor(color);
    applyThemeColor(color);
    localStorage.setItem('themeColor', color);
  };

  const addLog = (logData: Omit<FuelLog, 'id'>) => {
    const newLog: FuelLog = {
      ...logData,
      id: crypto.randomUUID()
    };
    setLogs(prev => [...prev, newLog]);
    setActiveTab(Tab.HISTORY);
  };

  const updateLog = (updatedLog: FuelLog) => {
    setLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));
  };

  const deleteLog = (id: string) => {
    setLogs(prev => prev.filter(l => l.id !== id));
  };

  const clearAllData = () => {
    if(window.confirm("Are you sure you want to delete all history? This cannot be undone.")) {
      setLogs([]);
      setShowSettings(false);
    }
  }

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  if (isCheckingKey) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-brand-200 dark:bg-brand-900 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isKeySet) {
    return (
      <div className="fixed inset-0 h-[100dvh] flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900 text-center relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-brand-200 dark:bg-brand-900/20 rounded-full blur-3xl opacity-50 z-0"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-blue-200 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50 z-0"></div>

        <div className="relative z-10 max-w-sm w-full">
          <div className="w-20 h-20 bg-brand-500 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-brand-500/30 mx-auto transform rotate-3">
            <Fuel size={40} />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">GasTracker AI</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Track mileage and costs with AI-powered receipt scanning.
          </p>
          
          <div className="space-y-4">
            {!showManualEntry ? (
              <>
                 {/* Only show "Connect Google" if we suspect we are in an environment that supports it, or as a primary option */}
                <button 
                  onClick={handleConnectAIStudio}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 px-8 rounded-xl shadow-lg shadow-brand-500/30 transition-all flex items-center justify-center gap-2"
                >
                  Get Started <ArrowRight size={18} />
                </button>
                
                <button 
                  onClick={() => setShowManualEntry(true)}
                  className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-3.5 px-8 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
                >
                  <Key size={18} /> Enter API Key Manually
                </button>
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 animate-in fade-in zoom-in duration-300">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Enter Gemini API Key</h3>
                <input
                  type="password"
                  value={manualKey}
                  onChange={(e) => setManualKey(e.target.value)}
                  placeholder="Paste key here..."
                  className="w-full p-3 mb-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 outline-none dark:text-white"
                />
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowManualEntry(false)}
                    className="flex-1 py-3 text-gray-500 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handleManualKeySubmit}
                    className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-500/20"
                  >
                    Save
                  </button>
                </div>
                <p className="mt-4 text-xs text-gray-400">
                  Don't have a key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-brand-500 hover:underline">Get one from Google AI Studio</a>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 h-[100dvh] w-full flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-200 overflow-hidden">
      <Header onOpenSettings={() => setShowSettings(true)} />
      
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative w-full pt-4 pb-4 no-scrollbar">
        {activeTab === Tab.ENTRY && <FuelEntry onAddLog={addLog} />}
        {activeTab === Tab.HISTORY && <FuelHistory logs={logs} onDelete={deleteLog} onUpdate={updateLog} />}
        {activeTab === Tab.STATS && <FuelStats logs={logs} />}
        {activeTab === Tab.MAP && <FuelMap logs={logs} />}
      </main>

      <Navbar 
        currentTab={activeTab} 
        onTabChange={setActiveTab}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />

      {showSettings && (
        <Settings 
          onClose={() => setShowSettings(false)}
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          onClearData={clearAllData}
          currentColor={themeColor}
          onColorChange={handleColorChange}
        />
      )}
    </div>
  );
}

export default App;