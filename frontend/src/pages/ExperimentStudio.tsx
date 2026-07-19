import React from 'react';
import { Activity, Database, TrendingUp, Cpu, Server, Beaker } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const mockChartData = [
  { name: 'Epoch 1', f1: 0.65, loss: 0.8 },
  { name: 'Epoch 2', f1: 0.72, loss: 0.6 },
  { name: 'Epoch 3', f1: 0.78, loss: 0.45 },
  { name: 'Epoch 4', f1: 0.85, loss: 0.3 },
  { name: 'Epoch 5', f1: 0.89, loss: 0.2 },
  { name: 'Epoch 6', f1: 0.92, loss: 0.15 },
  { name: 'Epoch 7', f1: 0.95, loss: 0.1 },
];

const ExperimentStudio: React.FC = () => {
  const { data: experimentsData, isLoading } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => api.get('/experiments/'),
  });

  const experiments = experimentsData?.data?.experiments || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-8 max-w-7xl mx-auto space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Experiment Studio
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Monitor ML models, hyperparameter sweeps, and evaluation metrics in real-time.
          </p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled
          title="Logging runs from the UI isn't wired up yet."
          className="px-6 py-3 bg-slate-300 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl font-semibold text-sm flex items-center gap-2 cursor-not-allowed"
        >
          <Activity className="w-5 h-5" /> Log New Run
        </motion.button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800"
        >
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-indigo-500" /> Model Performance
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Sample</span>
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">F1 Score vs Loss over Epochs (example run — per-epoch metrics aren't tracked yet)</p>
            </div>
            <div className="flex gap-2">
              <span className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                <div className="w-3 h-3 rounded-full bg-indigo-500"></div> F1 Score
              </span>
              <span className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                <div className="w-3 h-3 rounded-full bg-rose-400"></div> Loss
              </span>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dx={-10} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dx={10} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 2, strokeDasharray: '4 4' }}
                />
                <Line yAxisId="left" type="monotone" dataKey="f1" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="loss" stroke="#fb7185" strokeWidth={3} dot={{ r: 4, fill: '#fb7185', strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* System Metrics Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
        >
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-2">
              <Server className="w-5 h-5 text-emerald-500" /> Resource Usage
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">Sample</span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Example GPU/CPU allocation — live telemetry isn't connected yet</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2 font-medium">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2"><Cpu className="w-4 h-4"/> GPU Memory</span>
                <span className="text-emerald-600">82%</span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '82%' }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                ></motion.div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2 font-medium">
                <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2"><Database className="w-4 h-4"/> System RAM</span>
                <span className="text-indigo-600">45%</span>
              </div>
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '45%' }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                  className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full"
                ></motion.div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <button
              disabled
              title="Advanced metrics view isn't built yet."
              className="w-full py-3 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-600 rounded-xl font-medium text-sm cursor-not-allowed"
            >
              View Advanced Metrics
            </button>
          </div>
        </motion.div>
      </div>

      {/* Experiments Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden"
      >
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
          <h2 className="font-bold text-xl text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Beaker className="w-5 h-5 text-violet-500" /> Recent Runs
          </h2>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 rounded-full text-xs font-semibold">
              Active: {experiments.filter((e: any) => e.status === 'running').length}
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 rounded-full text-xs font-semibold">
              Completed: {experiments.filter((e: any) => !e.status || e.status === 'completed').length}
            </span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p>Loading experiments...</p>
            </div>
          ) : experiments.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <Database className="w-12 h-12 text-slate-300 mb-4" />
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">No experiments yet</h3>
              <p className="text-slate-500 max-w-sm mt-2">Log your first model training run to see metrics and comparisons here.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-8 py-4 font-semibold">Model ID</th>
                  <th className="px-8 py-4 font-semibold">Dataset</th>
                  <th className="px-8 py-4 font-semibold">Status</th>
                  <th className="px-8 py-4 font-semibold">Metrics</th>
                  <th className="px-8 py-4 font-semibold text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {experiments.map((exp: any, idx: number) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * idx }}
                    key={exp.id ?? idx} 
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    <td className="px-8 py-5">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{exp.model_name}</div>
                      {/* Show the run's real id when the backend provides one; a
                          random string here would change on every render and
                          isn't a real identifier for the run. */}
                      {exp.id != null && (
                        <div className="text-xs text-slate-400 mt-1">ID: {exp.id}</div>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {exp.dataset || 'standard-v1'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      {(() => {
                        const status = exp.status ?? 'completed';
                        const styles: Record<string, { dot: string; text: string; label: string }> = {
                          completed: { dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', label: 'Completed' },
                          running: { dot: 'bg-blue-500 animate-pulse', text: 'text-blue-700 dark:text-blue-400', label: 'Running' },
                          failed: { dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400', label: 'Failed' },
                        };
                        const s = styles[status] ?? { dot: 'bg-slate-400', text: 'text-slate-600 dark:text-slate-400', label: status };
                        return (
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${s.dot}`}></div>
                            <span className={`${s.text} font-medium`}>{s.label}</span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex gap-2">
                        {exp.metrics && Object.keys(exp.metrics).length > 0 ? (
                          Object.entries(exp.metrics).slice(0, 2).map(([k, v]: any) => (
                            <div key={k} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono text-slate-600 dark:text-slate-300">
                              {k}: <span className="font-semibold text-slate-900 dark:text-white">{typeof v === 'number' ? v.toFixed(3) : v}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400 italic">No metrics recorded</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right text-slate-500 dark:text-slate-400">
                      {exp.created_at
                        ? new Date(exp.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ExperimentStudio;