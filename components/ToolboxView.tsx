import React, { useState, useRef, useCallback } from 'react';
import { ai } from '../services/gemini';
import { 
  Code, 
  Copy, 
  Image as ImageIcon, 
  Sparkles, 
  Send, 
  Zap, 
  Cpu, 
  Terminal, 
  Eye, 
  FileText, 
  Wand2,
  Share2,
  Check,
  ChevronLeft,
  Shield
} from 'lucide-react';
import type { ThemeColors, ModelType } from '../types';
import { motion, AnimatePresence } from 'motion/react';

const MODEL_MAP: Record<ModelType, string> = {
  'flash': 'gemini-3-flash-preview',
  'pro': 'gemini-3.1-pro-preview',
  'lite': 'gemini-3.1-flash-lite',
  'image': 'gemini-2.5-flash-image',
  'coding': 'gemini-3.1-pro-preview'
};

export const ToolboxView: React.FC<{ theme: ThemeColors, model: ModelType }> = ({ theme, model }) => {
    const [activeTool, setActiveTool] = useState<'summarizer' | 'scanner' | 'writer' | 'enhancer' | 'dev' | 'auditor'>('summarizer');
    const [input, setInput] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
    const [mobileDevTab, setMobileDevTab] = useState<'editor' | 'view'>('editor');
    const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<{ data: string, mimeType: string } | null>(null);
    const [devLogs, setDevLogs] = useState<string[]>([]);
    const [copied, setCopied] = useState(false);
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
            let instruction = "";
            let targetModel = MODEL_MAP[model] || 'gemini-3-flash-preview';

            if (activeTool === 'dev') {
                logActivity("Initializing Neural Architecture...");
                setTimeout(() => logActivity("Analyzing UI Requirements..."), 1000);
            }

            switch(activeTool) {
                case 'summarizer': instruction = "Summarize the following into elite bullet points. Use clean formatting."; break;
                case 'scanner': instruction = "Analyze this image in high detail. Describe objects, colors, and potential context."; break;
                case 'writer': instruction = "Write professional engaging content based on this prompt."; break;
                case 'enhancer': instruction = "Engineer a high-fidelity AI prompt from this input. Make it detailed and structured."; break;
                case 'auditor': instruction = "Perform a deep technical audit of this logic/code. Identify flaws, security risks, and optimization paths."; break;
                case 'dev': instruction = "ACT AS A SENIOR FRONTEND ENGINEER. Build a modern, mobile-responsive single-file landing page using Tailwind CSS. OUTPUT RAW HTML ONLY starting with <!DOCTYPE html>. No commentary."; break;
            }

            const parts: any[] = [{ text: `${instruction}\n\nINPUT: "${input}"` }];
            if (selectedImage && activeTool === 'scanner') {
                parts.push({ inlineData: { data: selectedImage.data, mimeType: selectedImage.mimeType } });
            }

            const res = await ai.models.generateContent({
                model: targetModel,
                contents: [{ role: 'user', parts }],
            });
            
            const resText = res.text || "";
            if (activeTool === 'dev') {
                logActivity("Synthesis Complete. Assembler Finalized.");
                setMobileDevTab('view');
            }
            setResult(resText);
        } catch (e) {
            setResult('Neural link failed. Status: Timeout or Quota Reached.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(result);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const tools = [
        { id: 'summarizer', label: 'Summarizer', desc: 'CONDENSER', icon: <FileText size={18} /> },
        { id: 'scanner', label: 'Scanner', desc: 'VISION', icon: <Eye size={18} /> },
        { id: 'writer', label: 'Writer', desc: 'CONTENT', icon: <Wand2 size={18} /> },
        { id: 'auditor', label: 'Auditor', desc: 'LOGIC', icon: <Shield size={18} /> },
        { id: 'dev', label: 'Dev Studio', desc: 'ARCHITECT', icon: <Terminal size={18} /> }
    ];

    if (activeTool === 'dev') {
        return (
            <div className="h-full bg-white dark:bg-cognix-950 flex flex-col animate-fade-in overflow-hidden technical-grid">
                <header className="px-6 py-4 border-b border-slate-100 dark:border-cognix-900 flex items-center justify-between bg-white/80 dark:bg-cognix-950/80 backdrop-blur-md z-10">
                    <div className="flex items-center gap-4">
                        <button 
                          onClick={() => setActiveTool('summarizer')} 
                          className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-blue-500 uppercase tracking-widest transition-colors"
                        >
                          <ChevronLeft size={14} /> Back to Lab
                        </button>
                        <div className="h-4 w-[1px] bg-slate-200 dark:bg-cognix-800"></div>
                        <h2 className="text-sm font-bold tracking-tight uppercase flex items-center gap-2">
                           <Terminal size={16} className="text-blue-500"/>
                           <span className="dark:text-white">Dev Studio Node</span>
                        </h2>
                    </div>
                    <div className="flex sm:hidden bg-slate-100 dark:bg-cognix-900 p-1 rounded-xl">
                        <button onClick={() => setMobileDevTab('editor')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${mobileDevTab === 'editor' ? 'bg-white dark:bg-cognix-800 shadow-sm' : 'text-slate-500'}`}>Editor</button>
                        <button onClick={() => setMobileDevTab('view')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${mobileDevTab === 'view' ? 'bg-white dark:bg-cognix-800 shadow-sm' : 'text-slate-500'}`}>Preview</button>
                    </div>
                    {result && (
                        <div className="hidden sm:flex bg-slate-100 dark:bg-cognix-900 p-1 rounded-xl border border-slate-200 dark:border-cognix-800">
                            <button onClick={() => setViewMode('preview')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${viewMode === 'preview' ? 'bg-white dark:bg-cognix-800 shadow-sm' : 'text-slate-500'}`}>Preview</button>
                            <button onClick={() => setViewMode('code')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${viewMode === 'code' ? 'bg-white dark:bg-cognix-800 shadow-sm' : 'text-slate-500'}`}>Code</button>
                        </div>
                    )}
                </header>

                <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
                    <div className={`${mobileDevTab === 'editor' ? 'flex' : 'hidden'} sm:flex w-full sm:w-[450px] border-r border-slate-100 dark:border-cognix-900 flex-col p-6 space-y-6 overflow-y-auto no-scrollbar bg-white dark:bg-cognix-950`}>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Target Architecture</label>
                          <textarea 
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              placeholder="Describe your UI vision... (Tailwind + HTML)"
                              className="w-full h-48 p-6 bg-slate-50 dark:bg-cognix-900 border border-slate-200 dark:border-cognix-800 rounded-3xl text-sm font-medium outline-none resize-none focus:border-blue-500 transition-all shadow-inner"
                          />
                        </div>
                        
                        <AnimatePresence>
                          {loading && devLogs.length > 0 && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-slate-50 dark:bg-cognix-900/50 p-6 rounded-3xl border border-slate-200 dark:border-cognix-800 shadow-sm"
                              >
                                  <div className="flex items-center gap-2 mb-4">
                                     <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                     <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mesh Processing</p>
                                  </div>
                                  <div className="space-y-2">
                                      {devLogs.map((log, i) => (
                                          <p key={i} className={`text-[10px] font-mono leading-none ${i === devLogs.length - 1 ? 'text-blue-500 font-bold' : 'text-slate-500 opacity-60'}`}>{`> ${log}`}</p>
                                      ))}
                                  </div>
                              </motion.div>
                          )}
                        </AnimatePresence>

                        <button 
                            onClick={runTool}
                            disabled={loading || !input.trim()}
                            className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-3xl font-bold text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-30 transition-all"
                        >
                            {loading ? 'Synthesizing...' : 'Saturate Asset'}
                        </button>
                    </div>

                    <div className={`${mobileDevTab === 'view' ? 'flex' : 'hidden'} sm:flex flex-1 bg-slate-50 dark:bg-cognix-950 relative flex-col overflow-hidden`}>
                        {!result ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10 text-center select-none animate-pulse">
                                <Terminal size={48} className="mb-6 opacity-20" />
                                <p className="text-[10px] font-bold uppercase tracking-[0.4em] leading-loose">Awaiting Blueprint Injection</p>
                            </div>
                        ) : viewMode === 'preview' ? (
                            <div className="flex-1 flex flex-col h-full">
                                <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-cognix-900 border-b border-slate-200 dark:border-cognix-800">
                                    <div className="flex items-center gap-3">
                                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Live Synthesis Preview</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      {publishedUrl && (
                                        <div className="hidden md:flex bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg items-center gap-2 border border-blue-100 dark:border-blue-800">
                                          <span className="text-[10px] font-mono text-blue-600 truncate max-w-[200px]">{publishedUrl}</span>
                                          <button onClick={() => navigator.clipboard.writeText(publishedUrl)} className="text-[10px] font-bold text-blue-600">COPY</button>
                                        </div>
                                      )}
                                      <button onClick={handleCopy} className="text-[10px] font-bold text-slate-500 hover:text-blue-500 uppercase tracking-widest transition-colors flex items-center gap-1">
                                         {copied ? <Check size={12}/> : <Copy size={12}/>} {copied ? 'COPIED' : 'COPY HTML'}
                                      </button>
                                    </div>
                                </div>
                                <iframe srcDoc={result} className="flex-1 w-full border-none bg-white" title="Asset Preview" />
                            </div>
                        ) : (
                            <div className="flex-1 p-6 overflow-hidden flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                     <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rendered Neural Logic</h3>
                                     <button 
                                        onClick={handleCopy}
                                        className="px-4 py-2 bg-white dark:bg-cognix-900 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-cognix-800 hover:border-blue-500 transition-all active:scale-95 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                                      >
                                        {copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'Saturate Clipboard' : 'Copy Logic'}
                                      </button>
                                </div>
                                <div className="flex-1 bg-slate-900 dark:bg-black rounded-3xl p-8 overflow-hidden flex flex-col border border-slate-800 shadow-2xl">
                                  <pre className="flex-1 text-blue-400 text-xs overflow-auto no-scrollbar font-mono leading-relaxed selection:bg-blue-500/30">
                                      {result}
                                  </pre>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto bg-white dark:bg-[#020617] p-6 md:p-12 animate-fade-in no-scrollbar relative">
            <div className="max-w-6xl mx-auto space-y-16 pb-40">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-10">
                    <div>
                        <div className="flex items-center gap-4 mb-6">
                           <div className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.3em]">Cognix Lab 034-Neural</span>
                           </div>
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 dark:text-white tracking-tighter italic serif">Processor.</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-4 max-w-md font-medium text-lg leading-relaxed">
                            Access low-level neural protocols for advanced data synthesis, vision scanning, and asset architecture.
                        </p>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner min-w-[280px]">
                       <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Model</span>
                          <span className="px-2 py-0.5 bg-blue-600 rounded text-[8px] font-black text-white uppercase tracking-tighter">PRO_CORE</span>
                       </div>
                       <div className="flex items-center gap-4 py-2 border-b border-slate-200 dark:border-slate-800 mb-4">
                          <div className="p-3 bg-blue-500/10 rounded-2xl">
                             <Cpu size={24} className="text-blue-500" />
                          </div>
                          <div>
                             <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Cognix NX-7</p>
                             <p className="text-[9px] font-mono text-slate-400 uppercase">Status: Nominal</p>
                          </div>
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                          <div className="h-1 bg-blue-500 rounded-full"></div>
                          <div className="h-1 bg-blue-500/30 rounded-full"></div>
                       </div>
                    </div>
                </header>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
                    {tools.map(tool => (
                        <button 
                            key={tool.id} 
                            onClick={() => { setActiveTool(tool.id as any); setResult(''); setInput(''); setSelectedImage(null); }}
                            className={`flex flex-col items-start gap-6 p-8 rounded-[2.5rem] border transition-all relative overflow-hidden group
                                ${activeTool === tool.id 
                                    ? 'border-blue-600 bg-white dark:bg-slate-900 shadow-2xl shadow-blue-500/10' 
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-500/30 hover:translate-y-[-4px]'}
                            `}
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${activeTool === tool.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'bg-slate-50 dark:bg-slate-950 text-slate-400 group-hover:text-blue-500 shadow-inner'}`}>
                                {tool.icon}
                            </div>
                            <div>
                              <p className={`text-lg font-bold tracking-tight mb-1 italic serif ${activeTool === tool.id ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}>
                                  {tool.label}
                              </p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] opacity-80">
                                  {tool.desc}
                              </p>
                            </div>
                            
                            {activeTool === tool.id && (
                               <div className="absolute top-4 right-4 group">
                                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                               </div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-7 space-y-8">
                        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-10 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-8">
                            {activeTool === 'scanner' && (
                                <div className="mb-4">
                                    <button onClick={() => fileRef.current?.click()} className="w-full py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] flex flex-col items-center justify-center gap-6 transition-all group hover:bg-blue-50/20 dark:hover:bg-blue-900/5 relative overflow-hidden">
                                        {selectedImage ? (
                                          <div className="relative group">
                                             <img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} className="w-48 h-48 rounded-3xl object-cover shadow-2xl border-2 border-white dark:border-slate-800" alt="Inject" />
                                             <div className="absolute inset-0 bg-blue-600/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white font-bold text-xs uppercase rounded-3xl">
                                                <RefreshCw size={24} className="mb-2" /> Replace Node
                                             </div>
                                          </div>
                                        ) : (
                                          <>
                                            <div className="w-16 h-16 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 shadow-inner group-hover:scale-110 transition-all duration-500">
                                              <ImageIcon size={32} />
                                            </div>
                                            <div className="text-center">
                                               <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-500 block mb-1">Inject Visual Sequence</span>
                                               <span className="text-[9px] font-mono text-slate-400 uppercase">Support: PNG, JPG, WEBP</span>
                                            </div>
                                          </>
                                        )}
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
                            <div className="flex flex-col gap-2">
                               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-6">Sequence Payload</label>
                               <textarea 
                                   value={input} 
                                   onChange={(e) => setInput(e.target.value)} 
                                   placeholder={`Enter source for cluster-${activeTool}...`} 
                                   className="w-full p-8 h-48 rounded-[2rem] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 outline-none text-slate-900 dark:text-white text-lg font-medium focus:ring-4 focus:ring-blue-500/5 transition-all resize-none shadow-inner placeholder:italic italic serif" 
                               />
                            </div>
                            <button 
                              onClick={runTool} 
                              disabled={loading || (!input.trim() && !selectedImage)} 
                              className="w-full py-6 rounded-[2rem] font-bold text-xs uppercase tracking-[0.4em] text-white bg-slate-900 dark:bg-blue-600 hover:translate-y-[-2px] active:translate-y-0 disabled:opacity-30 transition-all shadow-2xl shadow-blue-500/20"
                            >
                                {loading ? 'Synthesizing...' : `Initialize Prototol`}
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-12">
                       <AnimatePresence>
                         {result && (
                             <motion.div 
                               initial={{ opacity: 0, y: 30 }}
                               animate={{ opacity: 1, y: 0 }}
                               className="rounded-[3rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
                             >
                                 <div className="flex items-center justify-between px-10 py-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                                   <div className="flex items-center gap-4">
                                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Protocol Synthesis Finalized</span>
                                   </div>
                                   <div className="flex items-center gap-4">
                                      <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-500 transition-all text-[10px] font-bold uppercase tracking-widest">
                                         {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                                         {copied ? 'Captured' : 'Capture Buffer'}
                                      </button>
                                   </div>
                                 </div>
                                 <div className="p-12 text-slate-900 dark:text-slate-100 font-medium leading-relaxed text-lg whitespace-pre-wrap selection:bg-blue-500/20 max-h-[600px] overflow-y-auto no-scrollbar italic serif">
                                    {result}
                                 </div>
                             </motion.div>
                         )}
                       </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};
