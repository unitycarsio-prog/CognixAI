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
        <div className="h-full overflow-y-auto bg-white dark:bg-cognix-950 p-6 md:p-12 animate-fade-in no-scrollbar technical-grid">
            <div className="max-w-5xl mx-auto space-y-12 pb-32">
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <Zap size={18} />
                          </div>
                          <h2 className="text-sm font-mono font-bold text-blue-500 uppercase tracking-[0.3em]">Processing Lab 11.2</h2>
                        </div>
                        <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Cognix Lab</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Specialized modules for neural processing and synthesis.</p>
                    </div>
                </header>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {tools.map(tool => (
                        <button 
                            key={tool.id} 
                            onClick={() => { setActiveTool(tool.id as any); setResult(''); setInput(''); setSelectedImage(null); }}
                            className={`flex flex-col items-center gap-4 p-6 rounded-3xl border-2 transition-all group
                                ${activeTool === tool.id 
                                    ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-900/10 shadow-lg shadow-blue-500/5' 
                                    : 'bg-white dark:bg-cognix-900 border-slate-100 dark:border-cognix-800 hover:border-slate-300 dark:hover:border-slate-600'}
                            `}
                        >
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${activeTool === tool.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-cognix-800 text-slate-400 group-hover:text-blue-500'}`}>
                                {tool.icon}
                            </div>
                            <div className="text-center">
                              <p className={`text-[12px] font-bold tracking-tight leading-none ${activeTool === tool.id ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}>
                                  {tool.label}
                              </p>
                              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1.5 opacity-60">
                                  {tool.desc}
                              </p>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="max-w-2xl mx-auto space-y-8">
                    <div className="p-8 rounded-[3rem] border border-slate-200 dark:border-cognix-800 bg-white dark:bg-cognix-900 shadow-2xl space-y-6 transition-all focus-within:ring-4 focus-within:ring-blue-500/5">
                        {activeTool === 'scanner' && (
                            <div className="mb-4">
                                <button onClick={() => fileRef.current?.click()} className="w-full py-12 border-2 border-dashed border-slate-200 dark:border-cognix-800 rounded-[2rem] flex flex-col items-center justify-center gap-4 transition-all group hover:bg-slate-50 dark:hover:bg-cognix-950 overflow-hidden relative">
                                    {selectedImage ? (
                                      <div className="relative group">
                                         <img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} className="w-32 h-32 rounded-2xl object-cover shadow-2xl border-4 border-white dark:border-cognix-800" alt="Inject" />
                                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-[10px] uppercase rounded-2xl">Change</div>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-cognix-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-blue-500 transition-colors">
                                          <ImageIcon size={24} />
                                        </div>
                                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Inject Vision Node</span>
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
                        <textarea 
                            value={input} 
                            onChange={(e) => setInput(e.target.value)} 
                            placeholder={`Enter content for ${activeTool.toLowerCase()}...`} 
                            className="w-full p-6 h-40 rounded-3xl bg-slate-50 dark:bg-cognix-950 border border-slate-200 dark:border-cognix-800 outline-none text-slate-900 dark:text-white text-sm font-medium focus:border-blue-500 transition-all resize-none shadow-inner" 
                        />
                        <button 
                          onClick={runTool} 
                          disabled={loading || (!input.trim() && !selectedImage)} 
                          className="w-full py-5 rounded-3xl font-bold text-xs uppercase tracking-[0.4em] text-white bg-slate-900 dark:bg-blue-600 hover:scale-[1.01] active:scale-95 disabled:opacity-30 transition-all shadow-xl shadow-blue-500/10"
                        >
                            {loading ? 'Processing Neural Stream...' : `Execute ${activeTool.toUpperCase()}`}
                        </button>
                    </div>

                    <AnimatePresence>
                      {result && (
                          <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-10 rounded-[3rem] bg-slate-50 dark:bg-cognix-900 border border-slate-200 dark:border-cognix-800 shadow-sm relative group"
                          >
                              <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                   <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Neural Output</span>
                                </div>
                                <button onClick={handleCopy} className="p-2 text-slate-400 hover:text-blue-500 transition-all">
                                   {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                </button>
                              </div>
                              <div className="text-slate-900 dark:text-slate-100 font-medium leading-relaxed text-sm whitespace-pre-wrap selection:bg-blue-500/20">{result}</div>
                          </motion.div>
                      )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
