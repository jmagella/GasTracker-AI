import React, { useState, useRef } from 'react';
import { Download, Upload, Trash2, MapPin, Edit2, X, Save } from 'lucide-react';
import { FuelLog } from '../types';
import { exportToCSV, calculateMPG, parseCSV } from '../utils';

interface FuelHistoryProps {
  logs: FuelLog[];
  onDelete: (id: string) => void;
  onUpdate: (log: FuelLog) => void;
  onImport: (logs: Omit<FuelLog, 'id'>[]) => void;
}

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

  // Sort logs by date descending
  const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
              <Upload className="w-4 h-4" />
            </button>
            <button
              onClick={() => exportToCSV(logs)}
              className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 border border-brand-100 dark:border-brand-900/30 text-sm font-medium rounded-lg hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
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
               // Calculate MPG logic...
               const prevLog = sortedLogs[index + 1];
               const mpg = prevLog ? calculateMPG(log, prevLog) : null;
               
               const dateObj = new Date(log.date);

               return (
                <div key={log.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-start group relative overflow-hidden">
                  <div className="space-y-1 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {mpg ? mpg.toFixed(1) : '-'} <span className="text-xs font-normal text-gray-500">MPG</span>
                      </span>
                      <span className="text-gray-300 dark:text-gray-600">|</span>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        ${log.totalCost.toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-0.5">
                      <span>
                        {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        <span className="mx-1.5 opacity-50">|</span>
                        {dateObj.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </span>
                      <span>{log.gallons} gal @ ${log.pricePerGallon.toFixed(3)} / gal</span>
                      <span>Odo: {log.odometer.toLocaleString()}</span>
                      {log.location && (
                        <span className="flex items-center gap-1 mt-1 text-brand-600 dark:text-brand-400">
                          <MapPin className="w-3 h-3" /> {log.location}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 relative z-10 pl-2">
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