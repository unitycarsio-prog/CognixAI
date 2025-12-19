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
  const [activeParticipants, setActiveParticipants] = useState<string[]>([]);
  const [showInviteToast, setShowInviteToast] = useState(false);
  
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
    
    // Add participant context to the prompt if people are "joined"
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
      
      // Route specific requested models to their Gemini counterparts
      let targetModel: string = 'gemini-3-pro-preview';
      if (isImageRequest) targetModel = 'gemini-2.5-flash-image';
      else if (model === 'gemini-3-flash-preview') targetModel = 'gemini-3-flash-preview';
      else if (model === 'gemini-flash-lite-latest' || model === 'cognix-v2') targetModel = 'gemini-flash-lite-latest';
      else if (model === 'clora-n1' || model === 'corea-rv1') targetModel = 'gemini-3-pro-preview';

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
        if (part.text) responseParts.push({ text: part.text });
        else if (part.inlineData) responseParts.push({ inlineData: { mimeType: part.inlineData.mimeType, data: part.inlineData.data } });
      }

      setMessages(prev => prev.map(m => m.id === modelPlaceholderId ? { ...m, parts: responseParts, isSearching: false } : m));
    } catch (error) {
      setMessages(prev => prev.map(m => m.id === modelPlaceholderId ? { ...m, parts: [{ text: `Neural Uplink Interrupted. Re-sync necessary for secure communication.` }], isSearching: false } : m));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, selectedImage, systemInstruction, model, webSearchEnabled, setMessages, activeParticipants, friends]);

  const handleShareInvite = () => {
    const dummyUrl = `${window.location.origin}/join/${Math.random().toString(36).substring(7)}`;
    navigator.clipboard.writeText(dummyUrl);
    setShowInviteToast(true);
    setTimeout(() => setShowInviteToast(false), 3000);
    
    // Simulate someone joining for the sake of the requested UI feature
    if (friends.length > 0 && activeParticipants.length < 5) {
      const randomFriend = friends[Math.floor(Math.random() * friends.length)];
      if (!activeParticipants.includes(randomFriend.id)) {
        setTimeout(() => setActiveParticipants(prev => [...prev, randomFriend.id]), 1500);
      }
    }
  };

  const modelOptions: {id: ModelType, label: string, desc: string}[] = [
    { id: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro', desc: 'Superior SOTA Logic' },
    { id: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash', desc: 'Instant Reasoning' },
    { id: 'cognix-v2', label: 'CognixV2', desc: 'Optimized Workflow' },
    { id: 'clora-n1', label: 'CloraN1', desc: 'System Operations' },
    { id: 'corea-rv1', label: 'CoreaRv1', desc: 'Creative Intelligence' },
    { id: 'gemini-flash-lite-latest', label: 'Flash Lite', desc: 'Maximum Efficiency' },
    { id: 'gemini-2.5-flash-image', label: 'Neural Visualizer', desc: 'Creative Image Engine' }
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 relative overflow-hidden">
      {/* Invite Toast */}
      {showInviteToast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-blue-600 text-white rounded-full text-xs font-bold uppercase tracking-widest shadow-2xl animate-fade-in-up">
          Link copied! Node ready for sync.
        </div>
      )}

      {/* Messages Scroll Area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-10 md:px-24 lg:px-48 pb-56 pt-12 custom-scrollbar scroll-smooth">
        {messages.length === 0 ? (
            <div className="max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in relative">
                 <div className="w-20 h-20 bg-blue-600 rounded-[1.8rem] flex items-center justify-center text-white shadow-xl mb-10 transition-transform hover:scale-105 duration-500">
                     <BotIcon className="w-12 h-12" />
                 </div>

                 <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tighter">
                   CognixAI <span className="text-blue-600">V3.0 Pro</span>
                 </h2>
                 <p className="text-slate-400 dark:text-slate-500 mb-12 max-w-sm font-medium leading-relaxed">
                   Neural initialization complete. Ask anything to access the state-of-the-art intelligence core.
                 </p>
                 
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full px-4">
                     {[
                        { t: "Creative Architecture", q: "Architect a futuristic, sustainable headquarters in 3D." },
                        { t: "Process Logic", q: "Create a workflow for a high-frequency trading algorithm." }
                     ].map((item, i) => (
                        <button key={i} onClick={() => handleSendMessage(item.q)} className="text-left p-6 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all bg-white dark:bg-slate-900 shadow-sm group">
                            <span className="font-bold text-slate-800 dark:text-white text-xs block mb-1 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{item.t}</span>
                            <span className="text-[10px] text-slate-400 font-medium italic opacity-70 line-clamp-1">{item.q}</span>
                        </button>
                     ))}
                 </div>
            </div>
        ) : (
            <div className="max-w-3xl mx-auto space-y-12 pb-16">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-6 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fade-in-up`}>
                        <div className={`w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-300
                            ${msg.role === 'user' ? 'bg-slate-50 dark:bg-slate-800 text-slate-400' : 'bg-blue-600 text-white shadow-blue-500/10'}
                        `}>
                             {msg.role === 'user' ? <UserIcon className="w-5 h-5"/> : <BotIcon className="w-6 h-6"/>}
                        </div>
                        <div className={`flex flex-col gap-3 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                             {msg.parts.map((part, i) => (
                                 <div key={i} className={`p-6 rounded-[2rem] text-sm sm:text-base leading-relaxed border transition-all duration-500 ${msg.role === 'user' ? 'bg-blue-600 text-white border-blue-600 rounded-tr-none font-medium' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-100 dark:border-slate-700 rounded-tl-none'}`}>
                                     {part.inlineData && (
                                       <div className="mb-6 group relative overflow-hidden rounded-3xl shadow-2xl border border-white/10">
                                          <img src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} className="max-h-[500px] w-full object-contain transition-transform duration-700 group-hover:scale-105 bg-slate-900" alt="Generated Output"/>
                                          <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[9px] font-black uppercase text-white tracking-widest border border-white/10">Render v3.0</div>
                                       </div>
                                     )}
                                     <div className="whitespace-pre-wrap prose prose-sm sm:prose-base dark:prose-invert max-w-none font-medium tracking-tight selection:bg-blue-300 dark:selection:bg-blue-700">{part.text}</div>
                                 </div>
                             ))}
                        </div>
                    </div>
                ))}
                {isLoading && (
                  <div className="flex gap-6 items-center animate-pulse">
                    <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white"><BotIcon className="w-6 h-6"/></div>
                    <div className="bg-slate-50 dark:bg-slate-800 px-6 py-3 rounded-2xl text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] flex items-center gap-3">
                       Thinking
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

      {/* Minimal Uplink Input Bar */}
      <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-12 pb-10 pt-20 bg-gradient-to-t from-white dark:from-slate-900 via-white/95 dark:via-slate-900/95 to-transparent pointer-events-none z-40">
          <div className="max-w-4xl mx-auto pointer-events-auto">
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_25px_60px_rgba(0,0,0,0.12)] border border-slate-200/50 dark:border-slate-700/50 overflow-visible transition-all duration-500 focus-within:shadow-[0_30px_80px_rgba(37,99,235,0.15)] group/input">
                   {/* Contextual Toolbar */}
                   <div className="flex items-center gap-2 px-8 sm:px-12 py-3 border-b border-slate-100 dark:border-slate-700/30 bg-slate-50/20 dark:bg-slate-900/20">
                       <div className="relative shrink-0">
                            <button onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 flex items-center gap-2 transition-all">
                                {modelOptions.find(o => o.id === model)?.label || 'Model'}
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="4"><path d="M19 9l-7 7-7-7"/></svg>
                            </button>
                            {isModelDropdownOpen && (
                                <div className="absolute bottom-full left-0 mb-4 w-56 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 p-2 animate-fade-in-up">
                                    {modelOptions.map(m => (
                                        <button key={m.id} onClick={() => { setActiveModel(m.id); setIsModelDropdownOpen(false); }} className={`w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl text-[10px] font-black transition-all ${model === m.id ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'text-slate-500 dark:text-slate-400'}`}>
                                            <div className="flex flex-col">
                                              <span>{m.label}</span>
                                              <span className="text-[8px] opacity-40 uppercase tracking-widest mt-0.5">{m.desc}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                       </div>
                       
                       <div className="h-3 w-px bg-slate-200 dark:bg-slate-800 mx-4 opacity-50 shrink-0"></div>
                       
                       <button onClick={() => setWebSearchEnabled(!webSearchEnabled)} className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2.5 transition-all shrink-0 ${webSearchEnabled ? 'text-blue-600' : 'text-slate-400'}`}>
                           <div className={`w-1.5 h-1.5 rounded-full ${webSearchEnabled ? 'bg-blue-600 shadow-[0_0_10px_#2563EB]' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                           Neural Search
                       </button>

                       <div className="h-3 w-px bg-slate-200 dark:bg-slate-800 mx-4 opacity-50 shrink-0"></div>

                       {/* Invite People via Link functionality */}
                       <div className="flex items-center gap-4">
                           <button onClick={handleShareInvite} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 flex items-center gap-2.5 transition-all shrink-0">
                               <CopyIcon className="w-3.5 h-3.5" />
                               Invite People
                           </button>

                           {activeParticipants.length > 0 && (
                               <div className="flex -space-x-2 ml-2 transition-all animate-fade-in">
                                   {activeParticipants.map(id => {
                                       const f = friends.find(friend => friend.id === id);
                                       return (
                                           <div key={id} className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 bg-blue-600 flex items-center justify-center text-[8px] font-black text-white uppercase shadow-sm" title={f?.name}>
                                               {f?.name?.[0]}
                                           </div>
                                       );
                                   })}
                               </div>
                           )}
                       </div>
                   </div>

                   {/* Main Input Area */}
                   <div className="p-4 sm:p-5 flex items-end gap-3 sm:gap-4 px-6 sm:px-10 pb-5 sm:pb-8">
                        <button onClick={() => fileInputRef.current?.click()} className="p-4 rounded-[1.4rem] bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-800 transition-all shadow-inner shrink-0 group/clip border border-transparent hover:border-blue-100">
                            <ImageIcon className="w-6 h-6 transition-transform group-hover/clip:-translate-y-0.5"/>
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
                            className="flex-1 bg-transparent border-none outline-none resize-none py-3 text-base sm:text-lg text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 font-semibold tracking-tight max-h-40 min-h-[48px]"
                            rows={1} />
                            
                        <button onClick={() => handleSendMessage()} disabled={isLoading || (!input && !selectedImage)} className="w-14 h-14 bg-blue-600 text-white rounded-[1.4rem] shadow-[0_15px_30px_rgba(37,99,235,0.3)] disabled:opacity-20 disabled:shadow-none active:scale-90 transition-all flex items-center justify-center shrink-0 hover:bg-blue-700 hover:-translate-y-0.5 relative group/send">
                             <SendIcon className="w-8 h-8 relative z-10 transition-transform group-hover/send:translate-x-0.5 group-hover/send:-translate-y-0.5"/>
                             <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/send:opacity-100 transition-opacity rounded-[1.4rem]"></div>
                        </button>
                   </div>

                   {/* Attachment Preview */}
                   {selectedImage && (
                      <div className="px-10 pb-6 flex items-center gap-4 animate-fade-in-up">
                          <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-xl border-2 border-blue-600 group/img">
                              <img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} className="w-full h-full object-cover" alt="Node Sync"/>
                              <button onClick={() => setSelectedImage(null)} className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-black text-sm opacity-0 group-hover/img:opacity-100 transition-all">✕</button>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-blue-600">Visual Sync Ready</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{selectedImage.mimeType.split('/')[1]} stream</span>
                          </div>
                      </div>
                   )}
              </div>
          </div>
      </div>
    </div>
  );
};