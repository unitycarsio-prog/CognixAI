import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, ChatPart, ModelType, ChatSession } from '../types';
import { GoogleGenAI } from "@google/genai";
import { SendIcon, ImageIcon, BotIcon, UserIcon, UsersIcon, CopyIcon } from './Icons';

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
}

export const ChatView: React.FC<ChatViewProps> = ({ 
  messages, setMessages, systemInstruction, model, setActiveModel, participants, onAddParticipant, currentChat, isSidebarCollapsed 
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
      title: currentChat?.title || 'Shared Session',
      messages: messages.slice(-20) 
    };
    const b64 = btoa(JSON.stringify(data));
    const url = `${window.location.origin}${window.location.pathname}?handshake=${b64}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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
      const isImgRequest = /draw|image|create image|generate image/i.test(trimmedInput);
      
      let targetModel = model;
      // Personality & Global Formatting Rule: No stars/asterisks
      let finalInstruction = systemInstruction + " IMPORTANT: DO NOT use markdown bolding with asterisks (e.g., *** or **). Use plain text or other symbols. Avoid '***' symbols entirely in your response.";

      let config: any = { systemInstruction: finalInstruction };

      // Config based on User Request: Clora (Pro) takes time/reasoning, CognixV2 (Flash) is fast.
      if (model === 'gemini-3-pro-preview') {
        // This is now "Clora" (High Fidelity)
        config.thinkingConfig = { thinkingBudget: 32768 };
        config.systemInstruction += " You are Clora, the high-fidelity reasoning engine. Be deep, analytical, and professional.";
      } else if (model === 'gemini-3-flash-preview') {
        // This is now "CognixV2" (Fast Pulse)
        config.systemInstruction += " You are CognixV2, a fast and friendly pulse engine. Use relevant emojis to make chat fun and engaging.";
      }

      if (isImgRequest) targetModel = 'gemini-2.5-flash-image';

      const history = messages.slice(-10).map(m => ({
        role: m.role,
        parts: m.parts.map(p => p.text ? { text: p.text } : { inlineData: p.inlineData })
      }));

      const res = await ai.models.generateContent({
        model: targetModel,
        contents: [...history, { role: 'user', parts: parts as any }],
        config: { ...config, tools: isSearchEnabled && !isImgRequest ? [{ googleSearch: {} }] : [] }
      });

      const resParts: ChatPart[] = res.candidates?.[0]?.content?.parts.map(p => {
        if (p.text) return { text: p.text };
        if (p.inlineData) return { inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data } };
        return { text: "" };
      }).filter(p => p.text !== "" || p.inlineData) || [{ text: "No output generated." }];

      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, parts: resParts, isSearching: false } : m));
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, parts: [{ text: "Neural link lost. Retrying..." }], isSearching: false } : m));
    } finally {
      setIsLoading(false);
    }
  }, [input, selectedImage, isLoading, messages, systemInstruction, model, isSearchEnabled, setMessages]);

  const modelOptions = [
    { id: 'gemini-3-flash-preview', label: 'CognixV2', desc: 'FAST PULSE' },
    { id: 'gemini-3-pro-preview', label: 'Clora', desc: 'HIGH FIDELITY' },
    { id: 'gemini-flash-lite-latest', label: 'Lite Node', desc: 'MAX EFFICIENCY' }
  ];

  const activeModelData = modelOptions.find(m => m.id === model) || modelOptions[0];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#020617] relative overflow-hidden">
      
      <div 
        ref={containerRef} 
        className={`flex-1 overflow-y-auto px-4 sm:px-12 md:px-24 lg:px-48 scroll-smooth transition-all ${
          hasMessages ? 'pb-40 pt-6' : 'flex flex-col items-center justify-center min-h-[90dvh] pb-64 px-6'
        }`}
      >
        {!hasMessages ? (
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center animate-slide-up text-center select-none pointer-events-none mb-10">
             <h2 className="text-3xl sm:text-5xl font-bold text-black dark:text-white tracking-tight mb-2 leading-tight">Uplink established.</h2>
             <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Created by Shashwat Ranjan Jha</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-8 w-full">
            {messages.map((m, idx) => (
              <div key={m.id} className={`flex gap-3 sm:gap-4 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-slide-up`}>
                <div className={`w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-lg flex items-center justify-center shadow-sm border ${m.role === 'user' ? 'bg-black border-black text-white' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                   {m.role === 'user' ? <UserIcon className="w-4 h-4"/> : <BotIcon className="w-full h-full p-1.5"/>}
                </div>
                <div className={`flex flex-col gap-1.5 max-w-[90%] sm:max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {m.parts.map((p, i) => (
                    <div key={i} className={`px-4 py-3 text-[15px] font-medium leading-relaxed ${m.role === 'user' ? 'bg-black text-white rounded-2xl rounded-tr-sm' : 'bg-slate-100 dark:bg-slate-800/80 text-black dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm'}`}>
                      {p.inlineData && <img src={`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`} className="max-h-[350px] w-full object-contain mb-2 rounded-xl" alt="Asset" />}
                      {p.text ? <div className="whitespace-pre-wrap">{p.text}</div> : (idx === messages.length - 1 && isLoading && m.role === 'model' && <div className="flex gap-1 py-1"><div className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full animate-bounce delay-100"></div><div className="w-1.5 h-1.5 bg-black dark:bg-white rounded-full animate-bounce delay-200"></div></div>)}
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
          <div className="relative bg-white dark:bg-[#0d111c] border border-slate-300 dark:border-slate-700 rounded-[2rem] p-2 sm:p-3 shadow-2xl">
            {selectedImage && <div className="px-3 py-1 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 mb-2"><div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-600"><img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} className="w-full h-full object-cover" /><button onClick={() => setSelectedImage(null)} className="absolute top-0 right-0 bg-red-600 text-white w-5 h-5 flex items-center justify-center rounded-bl-lg text-[10px] font-bold">×</button></div></div>}
            <div className="flex items-center gap-2">
                <button onClick={() => fileRef.current?.click()} className="w-10 h-10 shrink-0 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white rounded-xl transition-all"><ImageIcon className="w-6 h-6" /><input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setSelectedImage({ data: (r.result as string).split(',')[1], mimeType: f.type }); r.readAsDataURL(f); } }} /></button>
                <textarea ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} placeholder="Ask Cognix..." className="flex-1 bg-transparent border-none outline-none resize-none py-2 text-[16px] text-black dark:text-white placeholder-slate-500 font-medium max-h-[120px] min-h-[40px]" rows={1} />
                <button onClick={handleSend} disabled={isLoading || (!input.trim() && !selectedImage)} className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center shadow-lg disabled:opacity-20 active:scale-95"><SendIcon className="w-5 h-5" /></button>
            </div>
            <div className="flex items-center justify-between mt-1 px-3">
                <button onClick={() => setShowModelMenu(true)} className="flex items-center gap-1.5 py-1 text-slate-800 dark:text-slate-200 font-bold text-[10px] uppercase tracking-tight">{activeModelData.label} ▾</button>
                <div className="flex items-center gap-4">
                    <button onClick={() => setIsSearchEnabled(!isSearchEnabled)} className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest ${isSearchEnabled ? 'text-blue-600' : 'text-slate-500'}`}><span className={`w-1.5 h-1.5 rounded-full ${isSearchEnabled ? 'bg-blue-600' : 'bg-slate-400'}`}></span> SEARCH</button>
                    <button onClick={generateShareLink} className={`flex items-center gap-1.5 text-[9px] font-bold transition-all ${copiedLink ? 'text-green-500' : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white'}`}>
                      <UsersIcon className="w-3.5 h-3.5" />
                      <span className="uppercase">{copiedLink ? 'LINK COPIED' : 'INVITE FRIEND'}</span>
                    </button>
                </div>
            </div>
          </div>
        </div>
      </div>

      {showModelMenu && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in" onClick={() => setShowModelMenu(false)}>
          <div className="bg-white dark:bg-[#0b0f1a] w-full max-w-[320px] rounded-t-[2.5rem] sm:rounded-3xl p-6 shadow-2xl animate-slide-up-pop border-t sm:border border-slate-300 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="space-y-1">
               {modelOptions.map((opt) => (
                 <button key={opt.id} onClick={() => { setActiveModel(opt.id as ModelType); setShowModelMenu(false); }} className={`w-full flex flex-col items-start gap-1 p-4 rounded-2xl transition-all text-left ${model === opt.id ? 'bg-slate-100 dark:bg-slate-800 text-black dark:text-white font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-300'}`}>
                    <p className="text-[16px] font-bold tracking-tight leading-none">{opt.label}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 dark:text-slate-500">{opt.desc}</p>
                 </button>
               ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};