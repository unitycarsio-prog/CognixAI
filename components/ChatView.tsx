import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, ChatPart, UIStyle, ThemeColors, FontSize, ModelType, Friend } from '../types';
import { GoogleGenAI } from "@google/genai";
import { BotIcon, SendIcon, UserIcon, ImageIcon, SearchIcon, SparklesIcon, UsersIcon, CodeIcon, CopyIcon } from './Icons';

interface ChatViewProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  uiStyle: UIStyle;
  theme: ThemeColors;
  fontSize: FontSize;
  systemInstruction: string;
  model: ModelType;
  setActiveModel: (m: ModelType) => void;
  friends?: Friend[];
}

export const ChatView: React.FC<ChatViewProps> = ({ messages, setMessages, theme, systemInstruction, model, setActiveModel, friends = [] }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isCognateDropdownOpen, setIsCognateDropdownOpen] = useState(false);
  const [activeParticipants, setActiveParticipants] = useState<string[]>([]);
  const [showInviteFeedback, setShowInviteFeedback] = useState(false);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading]);

  const handleSendMessage = useCallback(async (textOverride?: string) => {
    const textInput = (textOverride || input).trim();
    if ((!textInput && !selectedImage) || isLoading) return;
  
    const userMessageParts: ChatPart[] = [];
    if (selectedImage) userMessageParts.push({ inlineData: { mimeType: selectedImage.mimeType, data: selectedImage.data } });
    
    const participantPrefix = activeParticipants.length > 0 
        ? `[Cluster Sync: ${activeParticipants.map(id => friends.find(f => f.id === id)?.name).join(', ')}] ` 
        : '';
    
    if (textInput) userMessageParts.push({ text: participantPrefix + textInput });
      
    const userMessage: ChatMessage = { id: `msg-${Date.now()}`, role: 'user', parts: userMessageParts };
    const modelPlaceholderId = `msg-${Date.now() + 1}`;
    const modelPlaceholder: ChatMessage = { id: modelPlaceholderId, role: 'model', parts: [{ text: '' }], isSearching: webSearchEnabled };
    
    setMessages(prev => [...prev, userMessage, modelPlaceholder]);
    setInput(''); 
    setSelectedImage(null);
    setIsLoading(true);
  
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const isImageRequest = /generate (an )?image|create (an )?image|draw|paint/i.test(textInput);
      const targetModel = isImageRequest ? 'gemini-2.5-flash-image' : (
        model === 'ciorea-coding' || model === 'clora-workflow' || model === 'gemini-3-pro-preview' 
        ? 'gemini-3-pro-preview' 
        : 'gemini-3-flash-preview'
      );

      const history = messages.map(msg => ({
        role: msg.role,
        parts: msg.parts.map(p => {
            if (p.text) return { text: p.text };
            if (p.inlineData) return { inlineData: p.inlineData };
            return null;
        }).filter(Boolean) as any[]
      }));
      
      const response = await ai.models.generateContent({
          model: targetModel,
          contents: [...history, { role: 'user', parts: userMessageParts as any }],
          config: { 
            systemInstruction: systemInstruction,
            tools: !isImageRequest && webSearchEnabled ? [{ googleSearch: {} }] : [] 
          },
      });

      let responseParts: ChatPart[] = [];
      for (const part of response.candidates[0].content.parts) {
        if (part.text) {
          responseParts.push({ text: part.text });
        } else if (part.inlineData) {
          responseParts.push({ inlineData: { mimeType: part.inlineData.mimeType, data: part.inlineData.data } });
        }
      }

      setMessages(prev => prev.map(m => m.id === modelPlaceholderId ? { 
        ...m, 
        parts: responseParts, 
        isSearching: false 
      } : m));

    } catch (error) {
      setMessages(prev => prev.map(m => m.id === modelPlaceholderId ? { ...m, parts: [{ text: `Neural Uplink Error: Protocol synchronization failed. Please re-initialize.` }], isSearching: false } : m));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, selectedImage, systemInstruction, model, webSearchEnabled, setMessages, activeParticipants, friends]);

  const toggleParticipant = (friendId: string) => {
    if (activeParticipants.length >= 10 && !activeParticipants.includes(friendId)) return;
    setActiveParticipants(prev => prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]);
  };

  const modelOptions = [
    { id: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro', desc: 'Superior Reasoning' },
    { id: 'clora-workflow', label: 'Clora Engine', desc: 'Process Automation' },
    { id: 'cognix-arc-1.0', label: 'Cognix Arc 1.0', desc: 'Baseline Logic' },
    { id: 'gemini-3-flash-preview', label: 'Flash 3.0', desc: 'Instant Response' },
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 relative">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-12 pb-44 sm:pb-52 pt-8 custom-scrollbar scroll-smooth">
        {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh] text-center animate-fade-in py-10">
                 <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-[0_20px_60px_rgba(37,99,235,0.4)] mb-12 group transition-all hover:scale-110 duration-700 relative">
                     <BotIcon className="w-14 h-14" />
                     <div className="absolute -inset-2 bg-blue-400/20 blur-xl rounded-full animate-pulse-soft"></div>
                 </div>
                 <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter">CognixAI V3.0 Pro</h2>
                 <p className="text-slate-400 dark:text-slate-500 mb-14 max-w-md font-medium leading-relaxed px-4">
                    Neural initialization complete. Ask anything to access the state-of-the-art intelligence core.
                 </p>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full px-4">
                     {[
                        { t: "Creative Vision", q: "Help me visualize a creative concept for a sustainable smart city." },
                        { t: "System Architect", q: "Architect a complex logic flow for a fintech processing node." },
                        { t: "Deep Search", q: "Analyze the current global shift in decentralized computing." },
                        { t: "Logic Engine", q: "Refactor this TypeScript algorithm for maximum neural efficiency." }
                     ].map((item, i) => (
                        <button key={i} onClick={() => handleSendMessage(item.q)} className="text-left p-5 sm:p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-all bg-white dark:bg-slate-900 shadow-sm group">
                            <span className="font-black text-slate-800 dark:text-white text-xs sm:text-sm block mb-1 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{item.t}</span>
                            <span className="text-[10px] sm:text-xs text-slate-400 font-medium italic line-clamp-1 opacity-70">{item.q}</span>
                        </button>
                     ))}
                 </div>
            </div>
        ) : (
            <div className="max-w-4xl mx-auto space-y-10 pb-12">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-4 sm:gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fade-in-up`}>
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300
                            ${msg.role === 'user' ? 'bg-slate-50 dark:bg-slate-800 text-slate-400' : 'bg-blue-600 text-white shadow-[0_12px_24px_rgba(37,99,235,0.25)]'}
                        `}>
                             {msg.role === 'user' ? <UserIcon className="w-5 h-5 sm:w-6 sm:h-6"/> : <BotIcon className="w-7 h-7 sm:w-8 sm:h-8"/>}
                        </div>
                        <div className={`flex flex-col gap-3 max-w-[88%] sm:max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                             {msg.parts.map((part, i) => (
                                 <div key={i} className={`p-5 sm:p-6 rounded-[1.8rem] sm:rounded-[2.2rem] text-sm sm:text-base leading-relaxed shadow-sm border transition-all duration-500 ${msg.role === 'user' ? 'bg-blue-600 text-white border-blue-600 rounded-tr-none font-medium' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-100 dark:border-slate-700 rounded-tl-none'}`}>
                                     {part.inlineData && (
                                       <div className="mb-4 sm:mb-5 group relative overflow-hidden rounded-2xl shadow-xl border border-white/10">
                                          <img src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} className="max-h-[500px] w-full object-contain transition-transform duration-700 group-hover:scale-105 bg-slate-100 dark:bg-slate-900" alt="Generated Node"/>
                                          <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[9px] font-black uppercase text-white tracking-widest">Cognix V3.0 RENDER</div>
                                       </div>
                                     )}
                                     <div className="whitespace-pre-wrap prose prose-sm sm:prose-base dark:prose-invert max-w-none font-medium tracking-tight text-slate-700 dark:text-slate-200">{part.text}</div>
                                 </div>
                             ))}
                        </div>
                    </div>
                ))}
                {isLoading && (
                  <div className="flex gap-4 sm:gap-6 items-center animate-pulse">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg"><BotIcon className="w-7 h-7 sm:w-8 sm:h-8"/></div>
                    <div className="bg-slate-50 dark:bg-slate-800 px-5 py-3 rounded-2xl text-[9px] sm:text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] shadow-sm flex items-center gap-3">
                       Processing
                       <div className="flex gap-1">
                          <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce"></span>
                          <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                          <span className="w-1 h-1 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                       </div>
                    </div>
                  </div>
                )}
            </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-6 sm:pb-12 pt-16 bg-gradient-to-t from-white dark:from-slate-900 via-white/95 dark:via-slate-900/95 to-transparent pointer-events-none z-40">
          <div className="max-w-3xl mx-auto pointer-events-auto">
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl rounded-[2.2rem] sm:rounded-[2.8rem] shadow-[0_30px_70px_rgba(0,0,0,0.18)] border border-slate-200/60 dark:border-slate-700/50 overflow-visible transition-all duration-500 focus-within:shadow-[0_40px_100px_rgba(37,99,235,0.2)] focus-within:border-blue-500/50 group">
                   <div className="flex items-center gap-2 px-6 sm:px-10 py-3 sm:py-3.5 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50/40 dark:bg-slate-900/30 overflow-x-auto no-scrollbar whitespace-nowrap">
                       <div className="relative shrink-0">
                            <button onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)} className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 flex items-center gap-1.5 transition-all">
                                {modelOptions.find(o => o.id === model)?.label}
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5"><path d="M19 9l-7 7-7-7"/></svg>
                            </button>
                            {isModelDropdownOpen && (
                                <div className="absolute bottom-full left-0 mb-4 w-52 bg-white dark:bg-slate-800 rounded-[1.8rem] shadow-2xl border border-slate-100 dark:border-slate-700 z-50 p-2 animate-fade-in-up">
                                    {modelOptions.map(m => (
                                        <button key={m.id} onClick={() => { setActiveModel(m.id as any); setIsModelDropdownOpen(false); }} className={`w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl text-[10px] font-black transition-all ${model === m.id ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-500'}`}>
                                            <div className="flex flex-col">
                                              <span>{m.label}</span>
                                              <span className="text-[8px] opacity-40 uppercase tracking-widest mt-0.5">{m.desc}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                       </div>
                       
                       <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-2 sm:mx-4 opacity-50 shrink-0"></div>
                       
                       <button onClick={() => setWebSearchEnabled(!webSearchEnabled)} className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shrink-0 ${webSearchEnabled ? 'text-blue-600' : 'text-slate-400'}`}>
                           <div className={`w-2 h-2 rounded-full ${webSearchEnabled ? 'bg-blue-600 shadow-[0_0_12px_#2563EB]' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                           Neural Search
                       </button>

                       <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-2 sm:mx-4 opacity-50 shrink-0"></div>

                       <div className="relative shrink-0">
                           <button onClick={() => setIsCognateDropdownOpen(!isCognateDropdownOpen)} className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeParticipants.length > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                               <UsersIcon className="w-4 h-4" />
                               {activeParticipants.length > 0 ? `${activeParticipants.length} Links` : 'Sync Node'}
                           </button>
                           {isCognateDropdownOpen && (
                               <div className="absolute bottom-full left-0 mb-4 w-56 bg-white dark:bg-slate-800 rounded-[1.8rem] shadow-2xl border border-slate-100 dark:border-slate-700 z-50 p-2 animate-fade-in-up">
                                   <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-700 mb-2">
                                       <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Node Participants</span>
                                   </div>
                                   <div className="max-h-52 overflow-y-auto custom-scrollbar px-1">
                                       {friends.map(f => (
                                           <button key={f.id} onClick={() => toggleParticipant(f.id)} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[10px] font-black transition-all ${activeParticipants.includes(f.id) ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50'}`}>
                                               <span>{f.name}</span>
                                               {activeParticipants.includes(f.id) && <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>}
                                           </button>
                                       ))}
                                       {friends.length === 0 && <p className="text-[10px] text-slate-400 italic px-4 py-2">No nodes synced.</p>}
                                   </div>
                               </div>
                           )}
                       </div>
                   </div>

                   <div className="p-4 sm:p-5 flex items-end gap-3 sm:gap-5 px-5 sm:px-8 pb-5 sm:pb-8">
                        <button onClick={() => fileInputRef.current?.click()} className="p-3 sm:p-4 rounded-[1.2rem] sm:rounded-3xl bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 transition-all shadow-inner active:scale-90 shrink-0 group/uplink">
                            <ImageIcon className="w-6 h-6 sm:w-7 sm:h-7 transition-transform group-hover/uplink:-translate-y-0.5"/>
                            <input type="file" ref={fileInputRef} onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => setSelectedImage({ data: (reader.result as string).split(',')[1], mimeType: file.type });
                                    reader.readAsDataURL(file);
                                }
                            }} accept="image/*" className="hidden" />
                        </button>
                        <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
                            placeholder="Ask Cognix anything..."
                            className="flex-1 bg-transparent border-none outline-none resize-none py-3 sm:py-4 text-base sm:text-lg text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 max-h-40 min-h-[48px] font-semibold tracking-tight"
                            rows={1} />
                        <button onClick={() => handleSendMessage()} disabled={isLoading || (!input && !selectedImage)} className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 text-white rounded-[1.2rem] sm:rounded-[1.8rem] shadow-[0_15px_30px_rgba(37,99,235,0.45)] disabled:opacity-20 disabled:shadow-none active:scale-90 transition-all flex items-center justify-center shrink-0 hover:bg-blue-700 hover:-translate-y-1 relative overflow-hidden group/send">
                             <SendIcon className="w-7 h-7 sm:w-9 sm:h-9 relative z-10 transition-transform group-hover/send:translate-x-0.5 group-hover/send:-translate-y-0.5"/>
                             <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/send:translate-y-0 transition-transform duration-300"></div>
                        </button>
                   </div>
                   {selectedImage && (
                      <div className="px-6 sm:px-10 pb-5 sm:pb-6 flex items-center gap-4 animate-fade-in-up">
                          <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl border-2 border-blue-600 group/img">
                              <img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} className="w-full h-full object-cover" alt="Selected Node"/>
                              <button onClick={() => setSelectedImage(null)} className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-black text-sm opacity-0 group-hover/img:opacity-100 transition-all">✕</button>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Protocol Handshake Synced</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{selectedImage.mimeType.split('/')[1]} stream active</span>
                          </div>
                      </div>
                   )}
              </div>
          </div>
      </div>
    </div>
  );
};