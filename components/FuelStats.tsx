import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from 'recharts';
import { FuelLog } from '../types';
import { calculateMPG } from '../utils';
import { TrendingUp, Wallet } from 'lucide-react';

interface FuelStatsProps {
  logs: FuelLog[];
}

const FuelStats: React.FC<FuelStatsProps> = ({ logs }) => {
  const chartData = useMemo(() => {
    // Sort chronological ASC
    const sorted = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return sorted.map((log, index) => {
      const prevLog = index > 0 ? sorted[index - 1] : null;
      const mpg = prevLog ? calculateMPG(log, prevLog) : null;
      
      return {
        date: new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        mpg: mpg ? parseFloat(mpg.toFixed(1)) : null,
        cost: log.totalCost,
        price: log.pricePerGallon
      };
    }).filter(d => d.mpg !== null); // Remove first entry which has no MPG
  }, [logs]);

  if (logs.length < 2) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        Need at least 2 entries to calculate stats and visualize trends.
      </div>
    );
  }

  const avgMpg = chartData.reduce((acc, curr) => acc + (curr.mpg || 0), 0) / chartData.length;
  const totalSpent = logs.reduce((acc, curr) => acc + curr.totalCost, 0);

  return (
    <div className="max-w-md mx-auto p-4 space-y-6 pb-24">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-brand-500 text-white p-4 rounded-2xl shadow-lg shadow-brand-500/20">
          <p className="text-brand-100 text-sm font-medium flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" /> Avg MPG
          </p>
          <p className="text-3xl font-bold mt-1">{avgMpg.toFixed(1)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium flex items-center gap-1.5">
            <Wallet className="w-4 h-4" /> Total Spent
          </p>
          <p className="text-3xl font-bold mt-1 text-gray-800 dark:text-white">${totalSpent.toFixed(0)}</p>
        </div>
      </div>

      {/* MPG Chart */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-64">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">MPG Trend</h3>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorMpg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
                dataKey="date" 
                tick={{fontSize: 12, fill: '#9ca3af'}} 
                axisLine={false}
                tickLine={false}
            />
            <YAxis 
                hide 
                domain={['auto', 'auto']}
            />
            <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Area 
                type="monotone" 
                dataKey="mpg" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorMpg)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Gas Price Chart */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-64">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">Price per Gallon ($)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
                dataKey="date" 
                tick={{fontSize: 12, fill: '#9ca3af'}} 
                axisLine={false}
                tickLine={false}
            />
            <YAxis 
                hide 
                domain={['auto', 'auto']}
            />
            <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            />
            <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{r: 4, fill: '#3b82f6'}}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default FuelStats;