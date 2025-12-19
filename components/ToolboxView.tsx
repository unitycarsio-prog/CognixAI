import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { SparklesIcon, CodeIcon, CopyIcon } from './Icons';
import type { ThemeColors, ModelType } from '../types';

export const ToolboxView: React.FC<{ theme: ThemeColors, model: ModelType }> = ({ theme, model }) => {
    const [activeTool, setActiveTool] = useState<'prompt' | 'summary' | 'math' | 'debug'>('prompt');
    const [input, setInput] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);

    const runTool = async () => {
        if (!input.trim()) return;
        setLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            let instruction = "";
            if (activeTool === 'prompt') instruction = "Refine this prompt for AI engineering excellence. Output only the prompt.";
            if (activeTool === 'summary') instruction = "Summarize this document into 5 key bullet points with high precision.";
            if (activeTool === 'math') instruction = "Solve this logic or math problem step-by-step with clear reasoning.";
            if (activeTool === 'debug') instruction = "Identify the cause of this error and suggest the exact code fix.";

            const response = await ai.models.generateContent({
                model: model,
                contents: `${instruction}\n\nINPUT: "${input}"`,
            });
            setResult(response.text || '');
        } catch (e) {
            setResult('Error processing request.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-white dark:bg-slate-900 p-8 animate-fade-in custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-12">
                <header>
                    <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">Cognix Lab Toolbox</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-lg">Specialized intelligence engines for technical precision.</p>
                </header>

                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {[
                        { id: 'prompt', label: 'Prompt Studio', icon: <SparklesIcon className="w-4 h-4"/> },
                        { id: 'summary', label: 'Summarizer', icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/></svg> },
                        { id: 'math', label: 'Logic/Math', icon: <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 00-1 1v1H8a1 1 0 000 2h1v1a1 1 0 002 0V6h1a1 1 0 100-2h-1V3a1 1 0 00-1-1zM4 11a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z"/></svg> },
                        { id: 'debug', label: 'Debugger', icon: <CodeIcon className="w-4 h-4"/> }
                    ].map(tool => (
                        <button 
                            key={tool.id} 
                            onClick={() => { setActiveTool(tool.id as any); setResult(''); setInput(''); }}
                            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all
                                ${activeTool === tool.id ? `${theme.primary} text-white shadow-lg` : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}
                            `}
                        >
                            {tool.icon} {tool.label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-8">
                    <div className="p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl space-y-6">
                        <textarea 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={`Paste your ${activeTool} content here...`}
                            className="w-full p-6 h-48 rounded-3xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 ring-blue-500/20 text-slate-800 dark:text-slate-200 transition-all text-base leading-relaxed"
                        />
                        <button 
                            onClick={runTool}
                            disabled={loading || !input.trim()}
                            className={`w-full py-4 rounded-3xl font-bold text-white shadow-xl transition-all active:scale-95 ${theme.primary} disabled:opacity-50`}
                        >
                            {loading ? 'Processing Data...' : `Run ${activeTool} engine`}
                        </button>
                    </div>

                    {result && (
                        <div className="p-8 rounded-[2.5rem] bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 animate-fade-in relative">
                            <button onClick={() => navigator.clipboard.writeText(result)} className="absolute top-6 right-6 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-400 hover:text-blue-500 transition-colors">
                                <CopyIcon className="w-4 h-4" />
                            </button>
                            <div className="prose dark:prose-invert max-w-none text-slate-800 dark:text-slate-200">
                                {result.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};