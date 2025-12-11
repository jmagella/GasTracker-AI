import React, { useState, useRef } from 'react';
import { Download, Upload, Trash2, MapPin, Edit2, X, Save, Sun, Cloud, CloudRain, Snowflake, CloudLightning, Thermometer } from 'lucide-react';
import { FuelLog } from '../types';
import { exportToCSV, calculateMPG, parseCSV } from '../utils';

interface FuelHistoryProps {
  logs: FuelLog[];
  onDelete: (id: string) => void;
  onUpdate: (log: FuelLog) => void;
  onImport: (logs: Omit<FuelLog, 'id'>[]) => void;
}

const WeatherIcon = ({ code, className }: { code: number; className?: string }) => {
  // WMO Weather interpretation codes (WW)
  // 0: Clear sky
  if (code === 0) return <Sun className={className} />;
  // 1, 2, 3: Mainly clear, partly cloudy, and overcast
  if (code >= 1 && code <= 3) return <Cloud className={className} />;
  // 45, 48: Fog
  if (code === 45 || code === 48) return <Cloud className={className} />; // Using Cloud for Fog fallback
  // 51-67: Drizzle and Rain
  if (code >= 51 && code <= 67) return <CloudRain className={className} />;
  // 71-77: Snow
  if (code >= 71 && code <= 77) return <Snowflake className={className} />;
  // 80-82: Rain showers
  if (code >= 80 && code <= 82) return <CloudRain className={className} />;
  // 95-99: Thunderstorm
  if (code >= 95 && code <= 99) return <CloudLightning className={className} />;
  
  return <Cloud className={className} />; // Default
};

const EditModal = ({ log, onClose, onSave }: { log: FuelLog, onClose: () => void, onSave: (l: FuelLog) => void }) => {
  // Convert ISO date to local date string for input[type="datetime-local"]
  const getLocalDateTime = (isoString: string) => {
    const date = new Date(isoString);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  };

  const [date, setDate] = useState(getLocalDateTime(log.date));
  const [odometer, setOdometer] = useState(log.odometer.toString());
  const [gallons, setGallons] = useState(log.gallons.toString());
  const [cost, setCost] = useState(log.totalCost.toString());
  const [price, setPrice] = useState(log.pricePerGallon.toString());
  const [location, setLocation] = useState(log.location || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...log,
      date: new Date(date).toISOString(),
      odometer: parseFloat(odometer),
      gallons: parseFloat(gallons),
      totalCost: parseFloat(cost),
      pricePerGallon: parseFloat(price),
      location: location
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-800 dark:text-white">Edit Entry</h3>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Date</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Odometer</label>
              <input
                type="number"
                value={odometer}
                onChange={(e) => setOdometer(e.target.value)}
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Gallons</label>
              <input
                type="number"
                step="0.001"
                value={gallons}
                onChange={(e) => setGallons(e.target.value)}
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Total Cost</label>
              <input
                type="number"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Price/Gal</label>
              <input
                type="number"
                step="0.001"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 uppercase">Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white"
            />
          </div>

          <button 
            type="submit"
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 transition-all flex justify-center items-center gap-2 mt-2"
          >
            <Save size={18} /> Save Changes
          </button>
        </form>
      </div>
    </div>
  );
};

const FuelHistory: React.FC<FuelHistoryProps> = ({ logs, onDelete, onUpdate, onImport }) => {
  const [editingLog, setEditingLog] = useState<FuelLog | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sort logs by date descending, then by odometer descending to ensure stability
  const sortedLogs = [...logs].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    if (timeA !== timeB) return timeB - timeA;
    return b.odometer - a.odometer;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const importedLogs = parseCSV(text);
        if (importedLogs.length > 0) {
          onImport(importedLogs);
          alert(`Successfully imported ${importedLogs.length} entries.`);
        } else {
          alert('No valid entries found in CSV.');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to parse CSV file.');
      }
    };
    reader.readAsText(file);
    // Reset
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">History ({logs.length})</h2>
          <div className="flex gap-2">
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
              title="Import CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => exportToCSV(logs)}
              className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30 text-sm font-medium rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4" />
              CSV
            </button>
          </div>
        </div>

        {sortedLogs.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-600 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            <p>No logs yet.</p>
            <p className="text-sm mt-1">Add your first fuel stop!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedLogs.map((log, index) => {
               const prevLog = sortedLogs[index + 1];
               const mpg = prevLog ? calculateMPG(log, prevLog) : null;
               const dateObj = new Date(log.date);

               return (
                <div key={log.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center group relative overflow-hidden">
                  
                  {/* Left Side: BIG MPG and Details */}
                  <div className="flex flex-col flex-1 min-w-0 pr-4">
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className={`text-4xl font-black tracking-tight ${mpg ? 'text-brand-600 dark:text-brand-400' : 'text-gray-300 dark:text-gray-700'}`}>
                        {mpg ? mpg.toFixed(1) : '-'}
                      </span>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">MPG</span>
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-0.5 truncate">
                       <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-medium">
                         <span>{dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                         <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                         <span>{dateObj.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
                       </div>
                       
                       <div className="flex items-center gap-2 truncate">
                         {log.location && (
                            <span className="flex items-center gap-1 text-brand-600 dark:text-brand-400 truncate max-w-[120px]">
                              <MapPin className="w-3 h-3 shrink-0" /> <span className="truncate">{log.location}</span>
                            </span>
                          )}
                          {log.weatherTemp !== undefined && (
                             <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 px-1.5 py-0.5 rounded shrink-0">
                               {log.weatherCode !== undefined ? (
                                 <WeatherIcon code={log.weatherCode} className="w-3 h-3" />
                               ) : (
                                 <Thermometer className="w-3 h-3" />
                               )}
                               <span>{log.weatherTemp}°F</span>
                             </div>
                          )}
                       </div>
                    </div>
                  </div>

                  {/* Right Side: Cost and Actions */}
                  <div className="flex flex-col items-end gap-3">
                    <span className="text-xl font-bold text-gray-800 dark:text-white">
                      ${log.totalCost.toFixed(2)}
                    </span>
                    
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingLog(log)}
                        className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-lg transition-all"
                        aria-label="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if(window.confirm('Delete this entry?')) onDelete(log.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingLog && (
        <EditModal 
          log={editingLog} 
          onClose={() => setEditingLog(null)} 
          onSave={(updated) => {
            onUpdate(updated);
            setEditingLog(null);
          }} 
        />
      )}
    </>
  );
};

export default FuelHistory;