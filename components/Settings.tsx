import React, { useState, useEffect } from 'react';
import { Save, Trash2, Moon, Sun, Key, ShieldCheck, X, Palette, Check } from 'lucide-react';
import { ThemeColor } from '../types';

interface SettingsProps {
  onClose: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onClearData: () => void;
  currentColor: ThemeColor;
  onColorChange: (color: ThemeColor) => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose, isDarkMode, toggleTheme, onClearData, currentColor, onColorChange }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('gemini_api_key');
    if (stored) setApiKey(stored);
  }, []);

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      alert('API Key saved successfully.');
    } else {
      localStorage.removeItem('gemini_api_key');
      alert('API Key removed.');
    }
  };

  const colors: { id: ThemeColor; label: string; hex: string }[] = [
    { id: 'blue', label: 'Blue', hex: '#3b82f6' },
    { id: 'green', label: 'Green', hex: '#22c55e' },
    { id: 'orange', label: 'Orange', hex: '#f97316' },
    { id: 'purple', label: 'Purple', hex: '#a855f7' },
    { id: 'red', label: 'Red', hex: '#ef4444' },
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex justify-between items-center shadow-sm">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Settings</h2>
        <button 
          onClick={onClose}
          className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* API Key Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-brand-500" /> API Configuration
          </h3>
          
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">
              Gemini API Key
            </label>
            <div className="relative">
              <input 
                type={showKey ? "text" : "password"} 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter AI Studio API Key"
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all dark:text-white pr-10"
              />
              <button 
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                {showKey ? "Hide" : "Show"}
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              The key is stored locally on your device.
            </p>
            <button 
              onClick={handleSaveKey}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors flex justify-center items-center gap-2"
            >
              <Save size={18} /> Save Key
            </button>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Palette className="w-5 h-5 text-brand-500" /> Appearance
          </h3>
          
          <div className="flex items-center justify-between mb-6">
            <span className="text-gray-700 dark:text-gray-200 font-medium flex items-center gap-2">
              {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
              Dark Mode
            </span>
            <button 
              onClick={toggleTheme}
              className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors duration-300 ${isDarkMode ? 'bg-brand-600' : 'bg-gray-300'}`}
            >
              <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform duration-300 ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div>
            <span className="text-gray-700 dark:text-gray-200 font-medium block mb-3">Accent Color</span>
            <div className="flex gap-3 justify-between">
              {colors.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onColorChange(c.id)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    currentColor === c.id 
                      ? 'ring-2 ring-offset-2 ring-brand-500 dark:ring-offset-gray-800 scale-110' 
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  aria-label={`Select ${c.label} theme`}
                >
                  {currentColor === c.id && <Check className="text-white w-5 h-5" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-red-500" /> Data Management
          </h3>
          
          <button 
            onClick={onClearData}
            className="w-full py-3 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-semibold rounded-xl transition-colors flex justify-center items-center gap-2"
          >
            <Trash2 size={18} /> Clear All Fuel Logs
          </button>
        </div>
        
        <div className="text-center text-xs text-gray-400 pb-8">
            v1.1.0 &bull; GasTracker AI
        </div>

      </div>
    </div>
  );
};

export default Settings;