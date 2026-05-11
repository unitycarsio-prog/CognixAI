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
    <div className="h-full bg-white dark:bg-cognix-950 p-6 md:p-12 overflow-y-auto no-scrollbar technical-grid">
      <div className="max-w-4xl mx-auto space-y-12 pb-24">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Database size={18} />
              </div>
              <h2 className="text-sm font-mono font-bold text-blue-500 uppercase tracking-[0.3em]">Persistent Data Layer</h2>
            </div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Cognix Memory</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Stored facts and neural patterns that personalize your pulses.</p>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter facts..."
                  className="pl-10 pr-4 py-2 bg-slate-50 dark:bg-cognix-900 border border-slate-200 dark:border-cognix-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all w-48 focus:w-64"
                />
             </div>
             <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-xs uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-slate-900/10 dark:shadow-white/5"
            >
              <Plus size={16} />
              <span>Inject Fact</span>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="p-6 bg-slate-50 dark:bg-cognix-900 rounded-3xl border border-slate-100 dark:border-cognix-800 space-y-4">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                 <Shield size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Security Protocol</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Encrypted</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">All stored neural facts are AES-encrypted and strictly client-side.</p>
              </div>
           </div>
           <div className="p-6 bg-slate-50 dark:bg-cognix-900 rounded-3xl border border-slate-100 dark:border-cognix-800 space-y-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                 <Cpu size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Context Integration</p>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{memories.length} Nodes</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">Active facts injected into neural processing streams.</p>
              </div>
           </div>
           <div className="p-6 bg-slate-900 text-white rounded-3xl border border-slate-800 space-y-4 shadow-xl shadow-slate-900/20">
              <div className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center">
                 <User size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lead Architect</p>
                <h3 className="text-xl font-bold">Shashwat Ranjan Jha</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">The visionary developer and engineer behind the Cognix Pro neural architecture.</p>
              </div>
           </div>
        </div>

        <AnimatePresence>
          {isAdding && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="p-8 bg-white dark:bg-cognix-900 border-2 border-blue-500 rounded-[2.5rem] shadow-2xl relative"
            >
              <button 
                onClick={() => setIsAdding(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Store Neural Fact</h3>
              <textarea 
                value={newFact}
                onChange={(e) => setNewFact(e.target.value)}
                placeholder="What should Cognix remember about you? (e.g., 'I prefer Python for coding', 'My favorite design style is minimal')"
                className="w-full h-32 p-6 bg-slate-50 dark:bg-cognix-950 border border-slate-200 dark:border-cognix-800 rounded-2xl text-sm font-medium outline-none focus:border-blue-500 transition-all resize-none mb-6"
              />
              <div className="flex gap-4">
                <button 
                  onClick={handleAddFact}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-blue-700 transition-all"
                >
                  Confirm Memory Sync
                </button>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-8 py-4 bg-slate-100 dark:bg-cognix-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-cognix-700 transition-all"
                >
                  Abort
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-4">
          {filteredMemories.map((fact, idx) => (
            <motion.div 
              key={fact.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group flex items-center justify-between p-6 bg-white dark:bg-cognix-900 border border-slate-100 dark:border-cognix-800 rounded-2xl hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all"
            >
              <div className="flex items-center gap-6">
                 <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                 <div className="flex flex-col">
                   <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{fact.content}</p>
                   <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase tracking-widest">
                     SYNCHRONIZED {new Date(fact.timestamp).toLocaleDateString()} • CONFIDENCE 100%
                   </p>
                 </div>
              </div>
              <button 
                onClick={() => handleDeleteFact(fact.id)}
                className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            </motion.div>
          ))}
          
          {filteredMemories.length === 0 && (
            <div className="py-32 text-center opacity-40">
               <Database size={48} className="mx-auto mb-6 text-slate-300" />
               <p className="text-sm font-bold uppercase tracking-[0.3em] text-slate-400">Memory Core Empty</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
