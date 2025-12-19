import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import type { ThemeColors, ModelType, Deployment } from '../types';
// Fixed: Removed DownloadIcon and BotIcon which were not exported by Icons.tsx or were unused in this file.
import { CodeIcon, SparklesIcon, CopyIcon, TrashIcon } from './Icons';

export const CodingView: React.FC<{ theme: ThemeColors, model: ModelType }> = ({ theme, model }) => {
    const [prompt, setPrompt] = useState('');
    const [code, setCode] = useState('<!DOCTYPE html>\n<html>\n<head>\n<script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body class="bg-slate-900 text-white flex items-center justify-center min-h-screen font-sans">\n  <div class="text-center p-8 border border-white/10 rounded-3xl bg-white/5 backdrop-blur-xl shadow-2xl">\n    <h1 class="text-5xl font-black mb-4 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Cognix DevStudio</h1>\n    <p class="text-slate-400">Ready for persistent deployment.</p>\n  </div>\n</body>\n</html>');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showCode, setShowCode] = useState(false);
    const [deployments, setDeployments] = useState<Deployment[]>([]);
    const [activeDeploymentId, setActiveDeploymentId] = useState<string | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('cognix_deployments');
        if (saved) setDeployments(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('cognix_deployments', JSON.stringify(deployments));
    }, [deployments]);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        try {
            // Fixed: Initializing GoogleGenAI right before the API call to ensure use of latest configuration.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: `ACT AS A SENIOR FRONTEND ENGINEER. Build a high-fidelity, single-file responsive website. 
                USE: Tailwind CSS (via CDN), Google Fonts.
                REQUIREMENT: "${prompt}".
                OUTPUT: Raw HTML only. Start with <!DOCTYPE html>. No commentary.`,
            });
            const extractedCode = response.text || '';
            setCode(extractedCode);
            setActiveDeploymentId(null);
        } catch (e) {
            setCode(`<h1>Build Failed</h1><p>${e}</p>`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePublish = () => {
        const newDeployment: Deployment = {
            id: Date.now().toString(),
            title: prompt.slice(0, 30) || 'Untitled Deployment',
            code: code,
            timestamp: Date.now()
        };
        setDeployments(prev => [newDeployment, ...prev]);
        setActiveDeploymentId(newDeployment.id);
        
        const blob = new Blob([code], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
    };

    const deleteDeployment = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeployments(prev => prev.filter(d => d.id !== id));
        if (activeDeploymentId === id) setActiveDeploymentId(null);
    };

    const viewDeployment = (d: Deployment) => {
        setCode(d.code);
        setActiveDeploymentId(d.id);
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 overflow-hidden">
            <div className="w-full md:w-[380px] flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <CodeIcon className="w-5 h-5 text-blue-600" /> DevStudio
                    </h2>
                    <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full uppercase">Persistent</span>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Describe Requirements</label>
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe the application architecture..."
                            className="w-full p-4 h-32 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 outline-none focus:border-blue-500 text-sm transition-all resize-none shadow-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={handleGenerate}
                            disabled={isGenerating || !prompt.trim()}
                            className={`col-span-2 py-3.5 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95 ${theme.primary} disabled:opacity-50`}
                        >
                            {isGenerating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <SparklesIcon className="w-4 h-4" />}
                            {isGenerating ? 'Synthesizing...' : 'Architect Interface'}
                        </button>
                        
                        <button onClick={() => setShowCode(!showCode)} className="py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-slate-200 transition-all">
                            {showCode ? 'Preview' : 'View Code'}
                        </button>

                        <button onClick={handlePublish} disabled={isGenerating || code.length < 50} className="py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-md">
                            Deploy Live
                        </button>
                    </div>

                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-1">Persistent Deployments</h4>
                        <div className="space-y-2">
                            {deployments.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic px-1">No sites deployed yet.</p>
                            ) : (
                                deployments.map(d => (
                                    <div key={d.id} onClick={() => viewDeployment(d)} className={`group p-3 rounded-xl border transition-all cursor-pointer relative ${activeDeploymentId === d.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : 'bg-slate-50 dark:bg-slate-800/50 border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}>
                                        <div className="flex justify-between items-start pr-8">
                                            <p className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{d.title}</p>
                                        </div>
                                        <p className="text-[8px] text-slate-400 mt-1 uppercase font-bold tracking-widest">{new Date(d.timestamp).toLocaleDateString()}</p>
                                        <button onClick={(e) => deleteDeployment(d.id, e)} className="absolute right-2 top-3 p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                            <TrashIcon className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 p-4 md:p-6 overflow-hidden relative">
                {showCode ? (
                    <div className="flex-1 bg-slate-950 rounded-2xl shadow-2xl border border-white/5 overflow-hidden flex flex-col">
                        <div className="h-10 bg-slate-900 border-b border-white/5 flex items-center justify-between px-5">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Source Pulse</span>
                            <button onClick={() => navigator.clipboard.writeText(code)} className="p-1.5 text-slate-500 hover:text-white transition-colors"><CopyIcon className="w-3.5 h-3.5"/></button>
                        </div>
                        <textarea value={code} onChange={(e) => setCode(e.target.value)} className="flex-1 bg-transparent p-6 font-mono text-xs text-blue-400 outline-none resize-none custom-scrollbar" />
                    </div>
                ) : (
                    <div className="flex-1 bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative">
                        <iframe srcDoc={code} title="Web Preview" className="w-full h-full border-none" />
                        {isGenerating && (
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
                                <div className="text-center">
                                    <div className="flex gap-2 justify-center mb-4">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                                    </div>
                                    <p className="text-white font-black tracking-[0.2em] uppercase text-[10px]">Assembling Component Architecture</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
