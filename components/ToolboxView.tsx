import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { CodeIcon, CopyIcon, ImageIcon, SparklesIcon, SendIcon, BoltIcon } from './Icons';
import type { ThemeColors, ModelType } from '../types';

export const ToolboxView: React.FC<{ theme: ThemeColors, model: ModelType }> = ({ theme, model }) => {
    const [activeTool, setActiveTool] = useState<'summarizer' | 'scanner' | 'writer' | 'enhancer' | 'dev'>('summarizer');
    const [input, setInput] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
    const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<{ data: string, mimeType: string } | null>(null);
    const [devLogs, setDevLogs] = useState<string[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);

    const logActivity = (msg: string) => {
        setDevLogs(prev => [...prev.slice(-4), msg]);
    };

    const runTool = async () => {
        if (!input.trim() && !selectedImage) return;
        setLoading(true);
        if (activeTool !== 'dev') setResult('');
        setPublishedUrl(null);
        setDevLogs([]);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            let instruction = "";
            // FIX: targetModelName is now a string to avoid type errors and use actual Gemini model strings.
            let targetModelName: string = "";

            // FIX: Map the model prop (ModelType) to the corresponding Google GenAI model string as per guidelines.
            switch(model) {
                case 'cognix-rv2': targetModelName = 'gemini-3-flash-preview'; break;
                case 'clora-v1': targetModelName = 'gemini-3-pro-preview'; break;
                case 'clorea-v2.5': targetModelName = 'gemini-flash-lite-latest'; break;
                case 'arctic-x': targetModelName = 'gemini-3-pro-preview'; break;
                case 'visualizer': targetModelName = 'gemini-2.5-flash-image'; break;
                default: targetModelName = 'gemini-3-flash-preview';
            }

            if (activeTool === 'dev') {
                logActivity("Initializing Neural Architecture...");
                setTimeout(() => logActivity("Analyzing UI Requirements..."), 1000);
                setTimeout(() => logActivity("Drafting Component Hierarchy..."), 2000);
                setTimeout(() => logActivity("Injecting Tailwind Stylings..."), 3500);
                setTimeout(() => logActivity("Optimizing Responsive Layout..."), 5000);
            }

            switch(activeTool) {
                case 'summarizer': instruction = "Summarize the following into elite bullet points."; break;
                // FIX: Setting targetModelName to a valid model string literal instead of using targetModel (which was typed as ModelType).
                case 'scanner': instruction = "Analyze this image in high detail."; targetModelName = 'gemini-3-flash-preview'; break;
                case 'writer': instruction = "Write professional engaging content."; break;
                case 'enhancer': instruction = "Engineer a high-fidelity prompt from this input."; break;
                case 'dev': instruction = "ACT AS A SENIOR FRONTEND ENGINEER. Build a modern, mobile-responsive single-file landing page using Tailwind CSS. OUTPUT RAW HTML ONLY starting with <!DOCTYPE html>. No commentary."; break;
            }

            const parts: any[] = [{ text: `${instruction}\n\nINPUT: "${input}"` }];
            if (selectedImage && activeTool === 'scanner') {
                parts.push({ inlineData: { data: selectedImage.data, mimeType: selectedImage.mimeType } });
            }

            const response = await ai.models.generateContent({
                model: targetModelName,
                contents: [{ parts }],
            });
            
            if (activeTool === 'dev') logActivity("Synthesis Complete. Assembler Finalized.");
            setResult(response.text || '');
        } catch (e) {
            setResult('Uplink failed. Try again.');
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = () => {
        if (!result) return;
        try {
            const b64 = btoa(unescape(encodeURIComponent(result)));
            const url = `${window.location.origin}${window.location.pathname}?deployment=${b64}`;
            setPublishedUrl(url);
        } catch(e) { console.error("Publish failed", e); }
    };

    const tools = [
        { id: 'summarizer', label: 'Summarizer', desc: 'CONDENSER' },
        { id: 'scanner', label: 'Scanner', desc: 'VISION' },
        { id: 'writer', label: 'Writer', desc: 'CONTENT' },
        { id: 'enhancer', label: 'Enhancer', desc: 'PROMPT' },
        { id: 'dev', label: 'Dev Studio', desc: 'UI ARCHITECT' }
    ];

    if (activeTool === 'dev') {
        return (
            <div className="h-full bg-white dark:bg-[#020617] flex flex-col animate-fade-in overflow-hidden">
                <header className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setActiveTool('summarizer')} className="text-xs font-bold text-slate-500 hover:text-black dark:hover:text-white uppercase tracking-widest transition-colors">← Back to Lab</button>
                        <h2 className="text-sm font-bold tracking-tight uppercase px-3 py-1 bg-black text-white dark:bg-white dark:text-black rounded-lg">Dev Studio Node</h2>
                    </div>
                    {result && (
                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                            <button onClick={() => setViewMode('preview')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${viewMode === 'preview' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-slate-500'}`}>Preview</button>
                            <button onClick={() => setViewMode('code')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${viewMode === 'code' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-slate-500'}`}>See Code</button>
                        </div>
                    )}
                </header>

                <div className="flex-1 flex overflow-hidden">
                    <div className="w-full sm:w-[400px] border-r border-slate-100 dark:border-slate-800 flex flex-col p-6 space-y-4">
                        <textarea 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Describe your UI vision..."
                            className="flex-1 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-medium outline-none resize-none focus:border-black dark:focus:border-white transition-all"
                        />
                        
                        {loading && devLogs.length > 0 && (
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Activity Feed</p>
                                <div className="space-y-1">
                                    {devLogs.map((log, i) => (
                                        <p key={i} className={`text-[10px] font-mono ${i === devLogs.length - 1 ? 'text-blue-500 font-bold' : 'text-slate-500 opacity-60'}`}>{`> ${log}`}</p>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={runTool}
                            disabled={loading || !input.trim()}
                            className="w-full py-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 disabled:opacity-30 transition-all"
                        >
                            {loading ? 'Synthesizing...' : 'Build UI Asset'}
                        </button>
                    </div>

                    <div className="flex-1 bg-slate-50 dark:bg-[#01040a] relative flex flex-col overflow-hidden">
                        {!result ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-50">
                                <CodeIcon className="w-12 h-12 mb-4" />
                                <p className="text-xs font-bold uppercase tracking-widest">Architectural Node Ready</p>
                            </div>
                        ) : viewMode === 'preview' ? (
                            <div className="flex-1 flex flex-col">
                                <div className="flex items-center justify-between px-6 py-2 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Live Workspace</span>
                                    <button onClick={handlePublish} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors">Publish Deployment</button>
                                </div>
                                {publishedUrl && (
                                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 flex items-center justify-between gap-4 animate-slide-up">
                                        <p className="text-[9px] font-mono truncate text-blue-800 dark:text-blue-300">DEPLOYED: {publishedUrl}</p>
                                        <button onClick={() => { navigator.clipboard.writeText(publishedUrl); setPublishedUrl(null); }} className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[9px] font-bold uppercase hover:bg-blue-700 transition-colors">Copy Link</button>
                                    </div>
                                )}
                                <iframe srcDoc={result} className="flex-1 w-full border-none bg-white" title="UI Preview" />
                            </div>
                        ) : (
                            <div className="flex-1 p-6 overflow-hidden flex flex-col">
                                <div className="flex justify-between mb-4">
                                     <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Raw Source</span>
                                     <button onClick={() => navigator.clipboard.writeText(result)} className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:scale-105 transition-all active:scale-95"><CopyIcon className="w-4 h-4"/></button>
                                </div>
                                <pre className="flex-1 p-6 bg-slate-900 text-slate-100 rounded-2xl text-xs overflow-auto custom-scrollbar font-mono leading-relaxed">
                                    {result}
                                </pre>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-white dark:bg-[#020617] p-4 sm:p-10 animate-fade-in custom-scrollbar">
            <div className="max-w-6xl mx-auto space-y-10 pb-20">
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-black dark:text-white tracking-tight uppercase leading-none mb-2">Cognix Lab</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-widest">Neural Prototyping Terminal</p>
                    </div>
                    {/* Visual Badge/Badge Visualization */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="relative w-8 h-8">
                            <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping"></div>
                            <div className="relative flex items-center justify-center w-full h-full bg-blue-600 rounded-xl shadow-lg shadow-blue-500/30">
                                <BoltIcon className="w-4 h-4 text-white" />
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-black dark:text-white uppercase leading-none">Lab Active</p>
                            <p className="text-[8px] font-bold text-blue-500 uppercase tracking-widest mt-1">Uplink 11.2</p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {tools.map(tool => (
                        <button 
                            key={tool.id} 
                            onClick={() => { setActiveTool(tool.id as any); setResult(''); setInput(''); setSelectedImage(null); }}
                            className={`flex flex-col items-start gap-1 p-4 rounded-xl border-2 transition-all text-left
                                ${activeTool === tool.id 
                                    ? 'border-black bg-slate-50 dark:bg-slate-800 shadow-sm' 
                                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300'}
                            `}
                        >
                            <p className={`text-[13px] font-bold tracking-tight leading-none ${activeTool === tool.id ? 'text-black dark:text-white' : 'text-slate-800 dark:text-slate-300'}`}>
                                {tool.label}
                            </p>
                            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                                {tool.desc}
                            </p>
                        </button>
                    ))}
                </div>

                <div className="max-w-xl mx-auto space-y-6">
                    <div className="p-6 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 transition-all focus-within:border-black dark:focus-within:border-white">
                        {activeTool === 'scanner' && (
                            <div className="mb-4">
                                <button onClick={() => fileRef.current?.click()} className="w-full py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group hover:bg-slate-50 dark:hover:bg-slate-950">
                                    {selectedImage ? <img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} className="w-20 h-20 rounded-xl object-cover shadow-lg border-2 border-white dark:border-slate-700" alt="Scan Asset" /> : <ImageIcon className="w-8 h-8 text-slate-400" />}
                                    <span className="text-[9px] font-bold uppercase tracking-widest">Inject Asset</span>
                                    <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) {
                                            const r = new FileReader();
                                            r.onloadend = () => setSelectedImage({ data: (r.result as string).split(',')[1], mimeType: f.type });
                                            r.readAsDataURL(f);
                                        }
                                    }} />
                                </button>
                            </div>
                        )}
                        <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Provide context..." className="w-full p-4 h-32 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-black dark:text-white text-sm font-medium focus:border-black dark:focus:border-white transition-all resize-none" />
                        <button onClick={runTool} disabled={loading || (!input.trim() && !selectedImage)} className="w-full py-4 rounded-2xl font-bold text-[10px] uppercase tracking-[0.3em] text-white bg-black dark:bg-white dark:text-black hover:opacity-90 disabled:opacity-20 active:scale-95 transition-all shadow-md">
                            {loading ? 'Synthesizing...' : `Execute ${activeTool.toUpperCase()}`}
                        </button>
                    </div>
                    {result && (
                        <div className="p-8 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-slide-up relative shadow-sm overflow-hidden">
                            <button onClick={() => navigator.clipboard.writeText(result)} className="absolute top-4 right-4 p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-all active:scale-90 hover:text-blue-600"><CopyIcon className="w-4 h-4" /></button>
                            <div className="max-w-none text-black dark:text-white font-medium leading-relaxed text-sm whitespace-pre-wrap">{result}</div>
                        </div>
                    )}
                </div>
            </div>
            <p className="text-center py-10 text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] select-none">Persistent Intelligence Layer 11.2</p>
        </div>
    );
};
