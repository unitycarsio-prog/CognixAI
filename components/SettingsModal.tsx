import React from 'react';
import { TrashIcon, SparklesIcon, UserIcon } from './Icons';
import type { UIStyle, AccentColor, FontSize } from '../types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    uiStyle: UIStyle;
    setUiStyle: (style: UIStyle) => void;
    accentColor: AccentColor;
    setAccentColor: (color: AccentColor) => void;
    fontSize: FontSize;
    setFontSize: (size: FontSize) => void;
    isDarkMode: boolean;
    setIsDarkMode: (isDark: boolean) => void;
    onClearHistory: () => void;
    systemInstruction: string;
    setSystemInstruction: (val: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
    isOpen, onClose, accentColor, setAccentColor, isDarkMode, setIsDarkMode, onClearHistory, systemInstruction, setSystemInstruction
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={onClose}>
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.3)] overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-8 flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <UserIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">User Preferences</h2>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Node Configuration</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all text-xl font-light">&times;</button>
                </div>

                <div className="p-8 space-y-10 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    <section>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-2">Visual Environment</h3>
                        <div className="flex gap-4">
                            <button onClick={() => setIsDarkMode(false)} className={`flex-1 py-4 px-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${!isDarkMode ? 'border-blue-600 bg-blue-50/50 shadow-md' : 'border-slate-100 dark:border-slate-800 hover:border-blue-200 opacity-60'}`}>
                                <div className="w-6 h-6 rounded-full bg-white border border-slate-200 shadow-sm"></div>
                                <span className="text-xs font-bold uppercase tracking-widest">Aura Light</span>
                            </button>
                            <button onClick={() => setIsDarkMode(true)} className={`flex-1 py-4 px-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${isDarkMode ? 'border-blue-600 bg-blue-900/20 shadow-md' : 'border-slate-100 dark:border-slate-800 hover:border-blue-800/50 opacity-60'}`}>
                                <div className="w-6 h-6 rounded-full bg-slate-950 border border-slate-800 shadow-sm"></div>
                                <span className="text-xs font-bold uppercase tracking-widest">Aura Dark</span>
                            </button>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-2">Core System Directives</h3>
                        <div className="relative">
                            <textarea 
                                value={systemInstruction}
                                onChange={(e) => setSystemInstruction(e.target.value)}
                                className="w-full p-5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[1.8rem] text-sm outline-none focus:border-blue-500 transition-all min-h-[140px] resize-none font-medium leading-relaxed"
                                placeholder="Establish personality parameters..."
                            />
                            <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
                                <SparklesIcon className="w-8 h-8 text-blue-600" />
                            </div>
                        </div>
                    </section>

                    <section className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                         <button onClick={onClearHistory} className="flex items-center gap-2.5 text-red-500 text-xs font-bold uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/10 px-5 py-3 rounded-2xl transition-all active:scale-95">
                             <TrashIcon className="w-4 h-4"/> Purge Local History
                         </button>
                         <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Engine v3.0.5 r4</span>
                    </section>
                </div>
            </div>
        </div>
    );
};