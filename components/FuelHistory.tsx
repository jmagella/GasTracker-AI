import React from 'react';
import { Download, Trash2, MapPin } from 'lucide-react';
import { FuelLog } from '../types';
import { exportToCSV, calculateMPG } from '../utils';

interface FuelHistoryProps {
  logs: FuelLog[];
  onDelete: (id: string) => void;
}

const FuelHistory: React.FC<FuelHistoryProps> = ({ logs, onDelete }) => {
  // Sort logs by date descending
  const sortedLogs = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">History ({logs.length})</h2>
        <button
          onClick={() => exportToCSV(logs)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 text-brand-600 dark:text-brand-400 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          CSV
        </button>
      </div>

      {sortedLogs.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-600 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
          <p>No logs yet.</p>
          <p className="text-sm mt-1">Add your first fuel stop!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedLogs.map((log, index) => {
             // To calculate MPG, we need the *next* log in this sorted list (which is chronologically previous)
             // Actually, mpg is distance/gallons. Distance is (current.odo - previous.odo).
             // So for 'log', we need the one that happened *before* it. 
             // Since sortedLogs is DESC, the 'previous' log is sortedLogs[index + 1].
             const prevLog = sortedLogs[index + 1];
             const mpg = prevLog ? calculateMPG(log, prevLog) : null;

             return (
              <div key={log.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-start group">
                <div className="space-y-1">
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
                    <span>{new Date(log.date).toLocaleDateString()} &bull; {log.gallons} gal @ ${log.pricePerGallon.toFixed(3)}</span>
                    <span>Odo: {log.odometer.toLocaleString()}</span>
                    {log.location && (
                      <span className="flex items-center gap-1 mt-1 text-brand-600 dark:text-brand-400">
                        <MapPin className="w-3 h-3" /> {log.location}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if(window.confirm('Delete this entry?')) onDelete(log.id);
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FuelHistory;
