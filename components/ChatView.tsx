import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, ChatPart, ModelType, ChatSession, MemoryFact } from '../types';
import { GoogleGenAI } from "@google/genai";
import { SendIcon, ImageIcon, BotIcon, UserIcon, UsersIcon, SparklesIcon, BoltIcon, BrainIcon } from './Icons';

interface ChatViewProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  systemInstruction: string;
  model: ModelType;
  setActiveModel: (m: ModelType) => void;
  participants: string[];
  onAddParticipant: (name: string) => void;
  currentChat?: ChatSession;
  isSidebarCollapsed?: boolean;
  memories?: MemoryFact[];
}

export const ChatView: React.FC<ChatViewProps> = ({ 
  messages, setMessages, systemInstruction, model, setActiveModel, participants, onAddParticipant, currentChat, isSidebarCollapsed, memories = []
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const generateShareLink = () => {
    const data = {
      title: currentChat?.title || 'Shared Pulse',
      messages: messages.slice(-15) 
    };
    try {
        const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
        const url = `${window.location.origin}${window.location.pathname}?handshake=${b64}`;
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    } catch(e) { console.error("Sharing sequence failed", e); }
  };

  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim();
    if ((!trimmedInput && !selectedImage) || isLoading) return;

    const parts: ChatPart[] = [];
    if (selectedImage) parts.push({ inlineData: { mimeType: selectedImage.mimeType, data: selectedImage.data } });
    if (trimmedInput) parts.push({ text: trimmedInput });

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', parts };
    const botMsgId = (Date.now() + 1).toString();
    const botPlaceholder: ChatMessage = { id: botMsgId, role: 'model', parts: [{ text: '' }], isSearching: isSearchEnabled };

    setMessages(prev => [...prev, userMsg, botPlaceholder]);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    if (textareaRef.current) { textareaRef.current.style.height = 'auto'; }

    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key missing");
      const ai = new GoogleGenAI({ apiKey });
      
      const vaultContext = memories.length > 0 
        ? "\n\nPERSONAL CONTEXT (MEMORY VAULT):\n" + memories.map(m => `- ${m.content}`).join('\n')
        : "";

      let finalInstruction = systemInstruction + vaultContext + 
        "\n\nSTRICT FORMATTING RULE: Do not use Markdown asterisks (*) for bolding or lists. Use plain text or ALL CAPS for emphasis. NEVER respond with '**bold**' or '***italic***' syntax. Keep responses completely star-free and clean.";

      let targetModel = model;
      let config: any = { systemInstruction: finalInstruction };

      if (model === 'gemini-3-pro-preview') {
        config.thinkingConfig = { thinkingBudget: 24000 };
      }

      if (/draw|image|generate|create/i.test(trimmedInput)) {
        targetModel = 'gemini-2.5-flash-image';
      }

      const history = messages.slice(-10).map(m => ({
        role: m.role,
        parts: m.parts.map(p => p.text ? { text: p.text } : { inlineData: p.inlineData })
      }));

      const res = await ai.models.generateContent({
        model: targetModel,
        contents: [...history, { role: 'user', parts: parts as any }],
        config: { ...config, tools: isSearchEnabled ? [{ googleSearch: {} }] : [] }
      });

      const resParts: ChatPart[] = res.candidates?.[0]?.content?.parts.map(p => {
        if (p.text) return { text: p.text };
        if (p.inlineData) return { inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data } };
        return { text: "" };
      }).filter(p => p.text !== "" || p.inlineData) || [{ text: "No output generated." }];

      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, parts: resParts, isSearching: false } : m));
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, parts: [{ text: "Neural link timeout. Please check your API key quota or retry." }], isSearching: false } : m));
    } finally {
      setIsLoading(false);
    }
  }, [input, selectedImage, isLoading, messages, systemInstruction, model, isSearchEnabled, setMessages, memories]);

  const modelOptions = [
    { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro', desc: 'Advanced reasoning for complex problem solving', icon: <SparklesIcon className="w-5 h-5"/>, tag: 'High Fidelity' },
    { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', desc: 'Fast and versatile for everyday creativity', icon: <BoltIcon className="w-5 h-5"/>, tag: 'Standard' },
    { id: 'gemini-flash-lite-latest', label: 'Gemini Flash Lite', desc: 'Lightweight and efficient for rapid responses', icon: <BrainIcon className="w-5 h-5"/>, tag: 'Efficient' }
  ];

  const activeModelData = modelOptions.find(m => m.id === model) || modelOptions[1];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#020617] relative overflow-hidden transition-colors duration-300">
      
      <div 
        ref={containerRef} 
        className={`flex-1 overflow-y-auto px-4 sm:px-12 md:px-24 lg:px-48 scroll-smooth transition-all custom-scrollbar ${
          hasMessages ? 'pb-40 pt-6' : 'flex flex-col items-center justify-center min-h-[90dvh] pb-64 px-6'
        }`}
      >
        {!hasMessages ? (
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center animate-slide-up text-center select-none pointer-events-none mb-10">
             <BotIcon className="w-24 h-24 mb-6" />
             <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tighter mb-2 leading-tight">Uplink Ready.</h2>
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Cognix Intelligence Node 11.0</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-8 w-full pb-10">
            {messages.map((m, idx) => (
              <div key={m.id} className={`flex gap-3 sm:gap-4 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-slide-up`}>
                <div className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-xl flex items-center justify-center shadow-sm border ${m.role === 'user' ? 'bg-black border-black text-white' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                   {m.role === 'user' ? <UserIcon className="w-4 h-4"/> : <BotIcon className="w-full h-full p-1.5"/>}
                </div>
                <div className={`flex flex-col gap-1.5 max-w-[90%] sm:max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {m.parts.map((p, i) => (
                    <div key={i} className={`px-5 py-4 text-[15px] font-medium leading-relaxed ${m.role === 'user' ? 'bg-black text-white rounded-2xl rounded-tr-sm shadow-md' : 'bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm shadow-sm'}`}>
                      {p.inlineData && <img src={`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`} className="max-h-[350px] w-full object-contain mb-3 rounded-xl shadow-xl border dark:border-slate-700" alt="Neural Asset" />}
                      {p.text ? <div className="whitespace-pre-wrap">{p.text}</div> : (idx === messages.length - 1 && isLoading && m.role === 'model' && <div className="flex gap-1.5 py-2"><div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div><div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div></div>)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`fixed left-0 right-0 p-3 sm:p-5 z-[60] pointer-events-none transition-all duration-300 ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-[280px]'} ${hasMessages ? 'bottom-0' : 'bottom-8 sm:bottom-16'}`}>
        <div className="max-w-xl mx-auto pointer-events-auto">
          <div className="relative bg-white dark:bg-[#0d111c] border border-slate-200 dark:border-slate-700 rounded-[2.2rem] p-2 sm:p-3 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
            {selectedImage && <div className="px-3 py-2 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 mb-2"><div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-600"><img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} className="w-full h-full object-cover" /><button onClick={() => setSelectedImage(null)} className="absolute top-0 right-0 bg-red-600 text-white w-5 h-5 flex items-center justify-center rounded-bl-lg text-[10px] font-bold shadow-md">×</button></div><span className="text-[10px] font-black uppercase text-slate-400">Contextual Asset Loaded</span></div>}
            <div className="flex items-center gap-2">
                <button onClick={() => fileRef.current?.click()} className="w-10 h-10 shrink-0 flex items-center justify-center text-slate-400 hover:text-black dark:hover:text-white rounded-xl transition-all"><ImageIcon className="w-6 h-6" /><input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setSelectedImage({ data: (r.result as string).split(',')[1], mimeType: f.type }); r.readAsDataURL(f); } }} /></button>
                <textarea ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} placeholder="Message Cognix..." className="flex-1 bg-transparent border-none outline-none resize-none py-2.5 text-[16px] text-slate-900 dark:text-white placeholder-slate-400 font-medium max-h-[120px] min-h-[44px] custom-scrollbar" rows={1} />
                <button onClick={handleSend} disabled={isLoading || (!input.trim() && !selectedImage)} className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-xl disabled:opacity-20 active:scale-95 transition-all"><SendIcon className="w-5 h-5" /></button>
            </div>
            <div className="flex items-center justify-between mt-1 px-3">
                <button onClick={() => setShowModelMenu(true)} className="flex items-center gap-1.5 py-1.5 px-3 -ml-2 text-slate-900 dark:text-slate-100 font-black text-[10px] uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">{activeModelData.label} ▾</button>
                <div className="flex items-center gap-5">
                    <button onClick={() => setIsSearchEnabled(!isSearchEnabled)} className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.2em] transition-all ${isSearchEnabled ? 'text-blue-600' : 'text-slate-400'}`}><span className={`w-1.5 h-1.5 rounded-full ${isSearchEnabled ? 'bg-blue-600' : 'bg-slate-400'}`}></span> LIVE SEARCH</button>
                    <button onClick={generateShareLink} className={`flex items-center gap-1.5 text-[9px] font-black transition-all ${copiedLink ? 'text-green-600' : 'text-slate-400 hover:text-blue-600'}`}>
                      <UsersIcon className="w-4 h-4" />
                      <span className="uppercase tracking-[0.2em]">{copiedLink ? 'COPIED' : 'ADD FRIEND'}</span>
                    </button>
                </div>
            </div>
          </div>
        </div>
      </div>

      {showModelMenu && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in" onClick={() => setShowModelMenu(false)}>
          <div className="bg-white dark:bg-[#0f172a] w-full max-w-[380px] rounded-t-[2.5rem] sm:rounded-3xl p-3 shadow-2xl animate-slide-up-pop border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="space-y-1.5">
               {modelOptions.map((opt) => (
                 <button 
                  key={opt.id} 
                  onClick={() => { setActiveModel(opt.id as ModelType); setShowModelMenu(false); }} 
                  className={`w-full flex items-start gap-4 p-4 rounded-2xl transition-all text-left group border ${model === opt.id ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border-transparent'}`}
                 >
                    <div className={`p-2.5 rounded-xl transition-all ${model === opt.id ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/40' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                      {opt.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[15px] font-black tracking-tight ${model === opt.id ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{opt.label}</span>
                        {opt.tag && <span className="px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">{opt.tag}</span>}
                      </div>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-snug">{opt.desc}</p>
                    </div>
                 </button>
               ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};