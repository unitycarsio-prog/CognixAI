
import React, { useState, useEffect } from 'react';
import { TrashIcon, UserIcon, PencilIcon, SparklesIcon, BrainIcon, CodeIcon, BoltIcon } from './Icons';
import type { MemoryFact } from '../types';

interface NeuralProfile {
    fullName: string;
    behavior: 'Empathetic' | 'Analytical' | 'Witty' | 'Chaotic';
    accentColor: 'blue' | 'violet' | 'emerald' | 'rose' | 'amber';
    neuralFrequency: 'Instant' | 'Balanced' | 'Deep Reflection';
    privacyProtocol: 'Incognito' | 'Logged' | 'Encrypted Only';
    interactionTone: 'Professional' | 'Casual' | 'Robotic' | 'Snarky';
    uiDensity: 'Compact' | 'Spacious';
    animationIntensity: 'Static' | 'Standard' | 'Dynamic';
}

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
    const [profile, setProfile] = useState<NeuralProfile>(() => {
        const saved = localStorage.getItem('cognix_neural_profile');
        return saved ? JSON.parse(saved) : {
            fullName: 'Shashwat Jha',
            behavior: 'Empathetic',
            accentColor: 'blue',
            neuralFrequency: 'Balanced',
            privacyProtocol: 'Logged',
            interactionTone: 'Casual',
            uiDensity: 'Compact',
            animationIntensity: 'Standard'
        };
    });

    useEffect(() => {
        localStorage.setItem('cognix_neural_profile', JSON.stringify(profile));
    }, [profile]);

    if (!isOpen) return null;

    const handleProfileChange = (field: keyof NeuralProfile, value: string) => {
        setProfile(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xl flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4" onClick={onClose}>
            <div className="w-full max-w-xl bg-white dark:bg-[#0b0f1a] rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="p-6 flex justify-between items-center border-b border-slate-100 dark:border-slate-900">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-none">Neural Settings</h2>
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1.5">Configure Intelligence Layer</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-black dark:hover:text-white transition-all text-2xl font-light">&times;</button>
                </div>

                <div className="p-8 space-y-10 overflow-y-auto max-h-[75vh] custom-scrollbar">
                    {/* Visual Profile Summary */}
                    <section className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-${profile.accentColor}-500/20 bg-${profile.accentColor === 'blue' ? 'blue-600' : profile.accentColor === 'violet' ? 'violet-600' : profile.accentColor === 'emerald' ? 'emerald-600' : profile.accentColor === 'rose' ? 'rose-600' : 'amber-600'}`}>
                            {profile.fullName[0]}
                        </div>
                        <div>
                            <input 
                                value={profile.fullName} 
                                onChange={(e) => handleProfileChange('fullName', e.target.value)}
                                className="bg-transparent text-lg font-bold text-slate-900 dark:text-white outline-none border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                            />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Authorized User</p>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <ProfileSelect label="Primary Behavior" value={profile.behavior} options={['Empathetic', 'Analytical', 'Witty', 'Chaotic']} onChange={(v) => handleProfileChange('behavior', v as any)} />
                        <ProfileSelect label="UI Accent Colour" value={profile.accentColor} options={['blue', 'violet', 'emerald', 'rose', 'amber']} onChange={(v) => handleProfileChange('accentColor', v as any)} />
                        <ProfileSelect label="Neural Frequency" value={profile.neuralFrequency} options={['Instant', 'Balanced', 'Deep Reflection']} onChange={(v) => handleProfileChange('neuralFrequency', v as any)} />
                        <ProfileSelect label="Privacy Protocol" value={profile.privacyProtocol} options={['Incognito', 'Logged', 'Encrypted Only']} onChange={(v) => handleProfileChange('privacyProtocol', v as any)} />
                        <ProfileSelect label="Interaction Tone" value={profile.interactionTone} options={['Professional', 'Casual', 'Robotic', 'Snarky']} onChange={(v) => handleProfileChange('interactionTone', v as any)} />
                        <ProfileSelect label="UI Density" value={profile.uiDensity} options={['Compact', 'Spacious']} onChange={(v) => handleProfileChange('uiDensity', v as any)} />
                        <ProfileSelect label="Animation Intensity" value={profile.animationIntensity} options={['Static', 'Standard', 'Dynamic']} onChange={(v) => handleProfileChange('animationIntensity', v as any)} />
                        
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">Interface Theme</label>
                            <div className="flex gap-2">
                                <button onClick={() => setIsDarkMode(false)} className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${!isDarkMode ? 'bg-black text-white border-black dark:bg-white dark:text-black' : 'text-slate-500 border-slate-100 dark:border-slate-800'}`}>Light</button>
                                <button onClick={() => setIsDarkMode(true)} className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${isDarkMode ? 'bg-white text-black border-white' : 'text-slate-500 border-slate-100 dark:border-slate-800'}`}>Dark</button>
                            </div>
                        </div>
                    </div>

                    <section className="pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
                         <button onClick={onClearHistory} className="w-full sm:w-auto flex items-center justify-center gap-2 text-red-600 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-950/20 px-6 py-3 rounded-2xl transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900/50">
                             <TrashIcon className="w-4 h-4"/> Purge Local Memory
                         </button>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-50">Secure Deployment v11.2</p>
                    </section>
                </div>
            </div>
        </div>
    );
};

const ProfileSelect: React.FC<{ label: string, value: string, options: string[], onChange: (v: string) => void }> = ({ label, value, options, onChange }) => (
    <div className="space-y-1.5">
        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-1">{label}</label>
        <div className="relative group">
            <select 
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-[12px] font-bold outline-none hover:border-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer uppercase tracking-tight"
            >
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300 group-hover:text-blue-500 transition-colors">▾</div>
        </div>
    </div>
);
