import React, { useState } from 'react';
import { Search, MapPin, GraduationCap, Users, Bookmark, BookOpen, Activity } from 'lucide-react';
import { api } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const AdmissionsHub: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'universities' | 'professors'>('universities');
  const [error, setError] = useState<string | null>(null);
  const [savedIndexes, setSavedIndexes] = useState<Set<number>>(new Set());
  const toggleSaved = (idx: number) => {
    setSavedIndexes(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'universities') {
        const response = await api.post('/admissions/universities', { query });
        setResults(response.data?.universities || []);
      } else {
        const response = await api.post('/admissions/professors', { query });
        setResults(response.data?.professors || []);
      }
    } catch (err) {
      console.error('Search failed:', err);
      // Don't silently swap in hardcoded Stanford/MIT/etc. results — that
      // misleads the person into thinking a real search happened. Show a
      // genuine error state instead so they know to retry.
      setResults([]);
      const message = err instanceof Error ? err.message : String(err);
      setError(message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-8 max-w-7xl mx-auto space-y-8"
    >
      <header className="mb-10 text-center max-w-3xl mx-auto">
        <motion.div initial={{ y: -20 }} animate={{ y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 mb-4">
            Admissions Navigator
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Discover top-tier programs, connect with leading researchers, and track your graduate school applications all in one place.
          </p>
        </motion.div>
      </header>

      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-slate-800 overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
        
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button 
            className={`flex-1 py-5 text-sm font-semibold transition flex items-center justify-center gap-2 relative ${activeTab === 'universities' ? 'text-blue-600 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            onClick={() => { setActiveTab('universities'); setResults([]); setQuery(''); }}
          >
            <GraduationCap className="w-5 h-5" /> University Finder
            {activeTab === 'universities' && (
              <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-600 dark:bg-cyan-400" />
            )}
          </button>
          <button 
            className={`flex-1 py-5 text-sm font-semibold transition flex items-center justify-center gap-2 relative ${activeTab === 'professors' ? 'text-blue-600 dark:text-cyan-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            onClick={() => { setActiveTab('professors'); setResults([]); setQuery(''); }}
          >
            <Users className="w-5 h-5" /> Professor & Lab Finder
            {activeTab === 'professors' && (
              <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 inset-x-0 h-0.5 bg-blue-600 dark:bg-cyan-400" />
            )}
          </button>
        </div>

        <div className="p-8">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 mb-10 max-w-4xl mx-auto">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 w-5 h-5 transition-colors" />
              <input 
                type="text" 
                placeholder={activeTab === 'universities' ? "Search e.g. 'MS Computer Science in California'..." : "Search e.g. 'Machine Learning Professors at Stanford'..."}
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-base dark:text-white"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={loading} 
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition disabled:opacity-70 shadow-lg shadow-blue-500/30 flex items-center justify-center min-w-[140px]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : 'Search'}
            </motion.button>
          </form>

          {error && (
            <div className="max-w-4xl mx-auto mb-8 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 text-sm text-center">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {results.length > 0 ? (
              <motion.div 
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {results.map((item, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    key={idx} 
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleSaved(idx)}
                        aria-pressed={savedIndexes.has(idx)}
                        aria-label={savedIndexes.has(idx) ? "Remove bookmark" : "Save for later"}
                        className={`p-2 rounded-full backdrop-blur-sm transition-colors ${
                          savedIndexes.has(idx)
                            ? "text-blue-500 bg-blue-50 dark:bg-blue-900/30"
                            : "text-slate-400 hover:text-blue-500 bg-white/80 dark:bg-slate-900/80"
                        }`}
                      >
                        <Bookmark className="w-4 h-4" fill={savedIndexes.has(idx) ? "currentColor" : "none"} />
                      </button>
                    </div>

                    {activeTab === 'universities' ? (
                      <>
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/50 dark:to-cyan-900/50 text-blue-600 dark:text-cyan-400 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-1 leading-tight group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">{item.name}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" /> {item.location || 'Location varies'}
                        </p>
                        
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-4">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.program}</p>
                        </div>

                        <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-100 dark:border-slate-700/50">
                          <span className="text-slate-500">Acceptance Rate</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{item.acceptance_rate}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 text-purple-600 dark:text-pink-400 rounded-2xl flex items-center justify-center mb-5 shadow-sm">
                          <Users className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-1 leading-tight group-hover:text-purple-600 dark:group-hover:text-pink-400 transition-colors">{item.name}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{item.university}</p>
                        
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-4">
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-purple-500" /> {item.lab}
                          </p>
                        </div>

                        <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-100 dark:border-slate-700/50">
                          <span className="text-slate-500">Open Positions</span>
                          <span className={`font-bold px-2.5 py-1 rounded-full text-xs ${item.openings ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                            {item.openings ? 'Accepting Students' : 'No Vacancy'}
                          </span>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            ) : !loading && query && !error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mb-4">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">No results found</h3>
                <p className="text-slate-500 max-w-md mx-auto">Try adjusting your search terms or exploring broader categories.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default AdmissionsHub;
