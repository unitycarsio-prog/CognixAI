import React, { useState } from 'react';
import type { MemoryFact, ThemeColors } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Database, Plus, Trash2, Shield, Search, Cpu, Sparkles, X, User } from 'lucide-react';

interface MemoryViewProps {
  memories: MemoryFact[];
  setMemories: React.Dispatch<React.SetStateAction<MemoryFact[]>>;
  theme: ThemeColors;
}

export const MemoryView: React.FC<MemoryViewProps> = ({ memories, setMemories, theme }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newFact, setNewFact] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddFact = () => {
    if (!newFact.trim()) return;
    const fact: MemoryFact = {
      id: Date.now().toString(),
      content: newFact,
      category: 'general',
      confidence: 1.0,
      timestamp: Date.now()
    };
    setMemories([fact, ...memories]);
    setNewFact('');
    setIsAdding(false);
  };

  const handleDeleteFact = (id: string) => {
    setMemories(memories.filter(m => m.id !== id));
  };

  const filteredMemories = memories.filter(m => 
    m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

    return (
        <div className="h-full bg-white dark:bg-[#020617] p-6 md:p-12 overflow-y-auto no-scrollbar relative">
            <div className="max-w-5xl mx-auto space-y-16 pb-40">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-10">
                    <div>
                        <div className="flex items-center gap-4 mb-6">
                           <div className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-3">
                              <Database size={14} className="text-blue-500" />
                              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.3em]">Persistent Data Layer v4.0</span>
                           </div>
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 dark:text-white tracking-tighter italic serif">Memory Core.</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-4 max-w-md font-medium text-lg leading-relaxed">
                            Personalized neural patterns and fact nodes stored within your local encrypted instance.
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                         <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                              type="text" 
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Query memory..."
                              className="pl-12 pr-6 py-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all w-48 focus:w-64 italic serif uppercase tracking-widest"
                            />
                         </div>
                         <button 
                          onClick={() => setIsAdding(true)}
                          className="w-full sm:w-14 h-14 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-2xl"
                        >
                          <Plus size={24} />
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm hover:shadow-2xl transition-all">
                      <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-2xl flex items-center justify-center shadow-inner">
                         <Shield size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Protocol: AES-256</p>
                        <h3 className="text-2xl font-bold tracking-tighter text-slate-900 dark:text-white italic serif">Encrypted.</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 leading-relaxed font-medium">Local-only data storage ensures your neural footprints remain private.</p>
                      </div>
                   </div>
                   <div className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm hover:shadow-2xl transition-all">
                      <div className="w-14 h-14 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-2xl flex items-center justify-center shadow-inner">
                         <Cpu size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Active Indices</p>
                        <h3 className="text-2xl font-bold tracking-tighter text-slate-900 dark:text-white italic serif">{memories.length} Sequences.</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-3 leading-relaxed font-medium">Neural facts injected directly into the LLM synthesis pipeline.</p>
                      </div>
                   </div>
                   <div className="p-8 bg-slate-950 text-white rounded-[2.5rem] border border-slate-800 space-y-6 shadow-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                         <Database size={100} />
                      </div>
                      <div className="w-14 h-14 bg-white/10 border border-white/20 text-white rounded-2xl flex items-center justify-center shadow-lg relative z-10">
                         <User size={24} />
                      </div>
                      <div className="relative z-10">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">System Module</p>
                        <h3 className="text-2xl font-bold tracking-tighter italic serif">Cognix Core.</h3>
                        <p className="text-sm text-slate-400 mt-3 leading-relaxed font-medium">The foundational memory architecture powering Cognix Pro.</p>
                      </div>
                   </div>
                </div>

                <AnimatePresence>
                  {isAdding && (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-12 bg-white dark:bg-slate-900 border-2 border-blue-600 rounded-[3.5rem] shadow-2xl relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-8 opacity-5">
                         <Sparkles size={160} />
                      </div>
                      <button 
                        onClick={() => setIsAdding(false)}
                        className="absolute top-8 right-8 p-3 text-slate-400 hover:text-red-500 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all"
                      >
                        <X size={20} />
                      </button>
                      <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-8 tracking-tight italic serif">Inject Fact Node.</h3>
                      <div className="space-y-4">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] ml-6">Fact Payload</label>
                        <textarea 
                          value={newFact}
                          onChange={(e) => setNewFact(e.target.value)}
                          placeholder="User prefers specialized Python logic for back-end synthesis..."
                          className="w-full h-40 p-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] text-lg font-medium outline-none focus:ring-4 focus:ring-blue-500/5 transition-all resize-none italic serif"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-6 mt-10">
                        <button 
                          onClick={handleAddFact}
                          className="flex-1 py-6 bg-blue-600 text-white rounded-[2rem] font-bold text-xs uppercase tracking-[0.4em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20"
                        >
                          Commit to Core
                        </button>
                        <button 
                          onClick={() => setIsAdding(false)}
                          className="px-12 py-6 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 rounded-[2rem] font-bold text-xs uppercase tracking-[0.4em] hover:bg-slate-100 transition-all"
                        >
                          Abort
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-6">
                  <div className="flex items-center gap-4 px-6 md:px-10">
                     <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.4em]">Propagated Memory Blocks</span>
                     <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-900"></div>
                  </div>
                  {filteredMemories.map((fact, idx) => (
                    <motion.div 
                      key={fact.id}
                      initial={{ opacity: 0, x: -30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.05 }}
                      className="group flex items-center justify-between p-10 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-[3rem] hover:border-blue-500/40 hover:shadow-2xl transition-all"
                    >
                      <div className="flex items-center gap-10 flex-1">
                         <div className="relative">
                            <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-blue-500 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                               <Database size={24} />
                            </div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-white dark:border-slate-900 rounded-full shadow-lg"></div>
                         </div>
                         <div className="flex flex-col flex-1">
                           <p className="text-xl font-medium text-slate-800 dark:text-slate-100 italic serif leading-relaxed">"{fact.content}"</p>
                           <div className="flex items-center gap-4 mt-3">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                SEQUENCE_{fact.id.slice(-8)}
                              </span>
                              <div className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {new Date(fact.timestamp).toLocaleDateString()} • RELAY_STABLE
                              </span>
                           </div>
                         </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteFact(fact.id)}
                        className="p-4 text-slate-300 hover:text-red-500 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={24} />
                      </button>
                    </motion.div>
                  ))}
                  
                  {filteredMemories.length === 0 && (
                    <div className="py-40 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-900 rounded-[4rem]">
                       <div className="w-24 h-24 rounded-[2rem] bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-200 dark:text-slate-800 mb-8 shadow-inner">
                          <Database size={48} />
                       </div>
                       <p className="text-sm font-bold uppercase tracking-[0.5em] text-slate-300 dark:text-slate-700">Storage Cluster Devoid of Logic</p>
                    </div>
                  )}
                </div>
            </div>
        </div>
    );
};
