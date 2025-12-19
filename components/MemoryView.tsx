import React, { useState, useEffect } from 'react';
import type { ThemeColors, MemoryFact } from '../types';
import { TrashIcon, PencilIcon, SparklesIcon } from './Icons';

export const MemoryView: React.FC<{ theme: ThemeColors }> = ({ theme }) => {
    const [memories, setMemories] = useState<MemoryFact[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newFact, setNewFact] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('nexzi_vault');
        if (saved) setMemories(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('nexzi_vault', JSON.stringify(memories));
    }, [memories]);

    const addMemory = () => {
        if (!newFact.trim()) return;
        const fact: MemoryFact = {
            id: Date.now().toString(),
            category: 'preference',
            content: newFact,
            timestamp: new Date().toLocaleDateString()
        };
        setMemories([fact, ...memories]);
        setNewFact('');
        setIsAdding(false);
    };

    const updateMemory = (id: string, content: string) => {
        setMemories(prev => prev.map(m => m.id === id ? { ...m, content } : m));
        setEditingId(null);
    };

    const deleteMemory = (id: string) => setMemories(prev => prev.filter(m => m.id !== id));

    return (
        <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 sm:p-12 animate-fade-in custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-12">
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">Vault.</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Manage the core persistent facts learned by Nexzi.</p>
                    </div>
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="px-6 py-3 bg-blue-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                    >
                        Inject Fact
                    </button>
                </header>

                {isAdding && (
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-slate-800 animate-fade-in-up">
                         <textarea 
                            value={newFact}
                            onChange={(e) => setNewFact(e.target.value)}
                            placeholder="Describe a fact for Nexzi to remember..."
                            className="w-full p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border-none outline-none focus:ring-2 ring-blue-500/20 text-sm h-32 resize-none"
                         />
                         <div className="flex justify-end gap-3 mt-4">
                            <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-xs font-bold text-slate-400 uppercase">Cancel</button>
                            <button onClick={addMemory} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest">Store</button>
                         </div>
                    </div>
                )}

                <div className="space-y-4 pb-12">
                    {memories.length === 0 && !isAdding ? (
                        <div className="text-center py-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem]">
                            <p className="text-slate-400 font-medium italic">Vault is currently empty.</p>
                        </div>
                    ) : (
                        memories.map(memory => (
                            <div key={memory.id} className="group flex items-start gap-6 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500 transition-all shadow-sm">
                                <div className="flex-1">
                                    {editingId === memory.id ? (
                                        <textarea 
                                            defaultValue={memory.content}
                                            onBlur={(e) => updateMemory(memory.id, e.target.value)}
                                            autoFocus
                                            className="w-full bg-transparent text-slate-700 dark:text-slate-200 text-sm outline-none resize-none"
                                        />
                                    ) : (
                                        <p className="text-slate-700 dark:text-slate-200 text-sm sm:text-base font-medium leading-relaxed">{memory.content}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-3">
                                        <span className="text-[9px] font-black uppercase text-blue-600 tracking-widest">Stored {memory.timestamp}</span>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => setEditingId(memory.id)} className="p-2 text-slate-400 hover:text-blue-500"><PencilIcon className="w-4 h-4"/></button>
                                    <button onClick={() => deleteMemory(memory.id)} className="p-2 text-slate-400 hover:text-red-500"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};