import React, { useState } from 'react';
import { TrashIcon, UserIcon, PencilIcon } from './Icons';
import type { MemoryFact } from '../types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    isDarkMode: boolean;
    setIsDarkMode: (isDark: boolean) => void;
    onClearHistory: () => void;
    systemInstruction: string;
    setSystemInstruction: (val: string) => void;
    memories: MemoryFact[];
    setMemories: React.Dispatch<React.SetStateAction<MemoryFact[]>>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, onClose, isDarkMode, setIsDarkMode, onClearHistory, systemInstruction, setSystemInstruction, memories, setMemories
}) => {
    const [tab, setTab] = useState<'prefs' | 'vault'>('prefs');
    const [editingId, setEditingId] = useState<string | null>(null);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4" onClick={onClose}>
            <div className="w-full max-w-lg bg-white dark:bg-[#0b0f1a] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-900 animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="p-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-900">
                    <div className="flex gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-full mr-12">
                         <button onClick={() => setTab('prefs')} className={`flex-1 py-2 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${tab === 'prefs' ? 'bg-white dark:bg-slate-800 text-black dark:text-white shadow-sm' : 'text-slate-500'}`}>Settings</button>
                         <button onClick={() => setTab('vault')} className={`flex-1 py-2 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${tab === 'vault' ? 'bg-white dark:bg-slate-800 text-black dark:text-white shadow-sm' : 'text-slate-500'}`}>Memory Vault</button>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-black dark:hover:text-white transition-all">&times;</button>
                </div>

                <div className="p-6 space-y-8 overflow-y-auto max-h-[75vh] scrollbar-hide">
                    {tab === 'prefs' ? (
                        <>
                            <section>
                                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Appearance</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => setIsDarkMode(false)} className={`flex-1 py-3 px-4 rounded-xl border transition-all text-xs font-bold ${!isDarkMode ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black shadow-lg' : 'border-slate-100 dark:border-slate-800 text-slate-500'}`}>Light</button>
                                    <button onClick={() => setIsDarkMode(true)} className={`flex-1 py-3 px-4 rounded-xl border transition-all text-xs font-bold ${isDarkMode ? 'border-white bg-white text-black shadow-lg' : 'border-slate-100 dark:border-slate-800 text-slate-500'}`}>Dark</button>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Brain Directives</h3>
                                <textarea 
                                    value={systemInstruction}
                                    onChange={(e) => setSystemInstruction(e.target.value)}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-black dark:text-white outline-none min-h-[120px] resize-none font-medium leading-relaxed"
                                    placeholder="Set persistent system prompt..."
                                />
                            </section>

                            <section className="p-6 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                                <h3 className="text-[10px] font-bold text-black dark:text-white uppercase tracking-widest">Founder & Vision</h3>
                                <div className="space-y-2">
                                     <p className="text-sm font-bold text-black dark:text-white">Shashwat Ranjan Jha</p>
                                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Founder of Nexzi</p>
                                     <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-2 italic">
                                        "CognixAI is a high-fidelity intelligence layer designed to democratize elite neural tools through minimalist, private-first interaction."
                                     </p>
                                </div>
                            </section>

                            <section className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-900">
                                 <button onClick={onClearHistory} className="flex items-center gap-2 text-red-600 text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-950/20 px-4 py-2 rounded-xl transition-all">
                                     <TrashIcon className="w-4 h-4"/> Purge Data
                                 </button>
                                 <span className="text-[10px] font-bold text-slate-400">Stable Node v11</span>
                            </section>
                        </>
                    ) : (
                        <div className="space-y-6">
                            <header className="flex items-center justify-between">
                                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Persistent Facts</h3>
                                <button 
                                    onClick={() => {
                                        const fact = prompt("What should Cognix remember?");
                                        if (fact) setMemories([{ id: Date.now().toString(), content: fact, category: 'personal', timestamp: new Date().toLocaleDateString() }, ...memories]);
                                    }}
                                    className="text-[10px] font-bold text-black dark:text-white bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:scale-105 transition-all"
                                >
                                    + New Fact
                                </button>
                            </header>
                            
                            <div className="space-y-3">
                                {memories.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl opacity-40">
                                        <p className="text-xs italic font-medium">Vault is currently empty</p>
                                    </div>
                                ) : (
                                    memories.map(m => (
                                        <div key={m.id} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 group relative">
                                            {editingId === m.id ? (
                                                <input 
                                                    autoFocus
                                                    defaultValue={m.content}
                                                    onBlur={(e) => {
                                                        setMemories(prev => prev.map(fact => fact.id === m.id ? { ...fact, content: e.target.value } : fact));
                                                        setEditingId(null);
                                                    }}
                                                    className="w-full bg-transparent text-sm font-medium outline-none"
                                                />
                                            ) : (
                                                <p className="text-sm font-medium pr-12 leading-relaxed">{m.content}</p>
                                            )}
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setEditingId(m.id)} className="p-2 text-slate-400 hover:text-black dark:hover:text-white"><PencilIcon className="w-3 h-3"/></button>
                                                <button onClick={() => setMemories(prev => prev.filter(f => f.id !== m.id))} className="p-2 text-slate-400 hover:text-red-600"><TrashIcon className="w-3 h-3"/></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};