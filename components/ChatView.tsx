import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, ChatPart, ModelType, ChatSession, MemoryFact } from '../types';
import { GoogleGenAI } from "@google/genai";
import { SendIcon, AttachmentPlusIcon, BotIcon, UserIcon, SparklesIcon, BoltIcon, BrainIcon, CodeIcon } from './Icons';

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
        ? "\n\nCONTEXT FROM VAULT:\n" + memories.map(m => `- ${m.content}`).join('\n')
        : "";

      let modelInstruction = "";
      let targetModelId = "";

      // Model personality routing with strict plain-text instructions
      switch(model) {
        case 'cognix-rv2':
          targetModelId = 'gemini-3-flash-preview';
          modelInstruction = "Role: CognixAi. Tone: Helpful, friendly, and concise. IMPORTANT: DO NOT USE BOLD SYMBOLS (*** or **). Use plain text. Use emojis in your output to be expressive. ";
          break;
        case 'clora-v1':
          targetModelId = 'gemini-3-pro-preview';
          modelInstruction = "Role: CloraV1. Tone: Deep reasoning. IMPORTANT: DO NOT USE BOLD SYMBOLS (*** or **). Use plain text. ";
          break;
        case 'clorea-v2.5':
          targetModelId = 'gemini-flash-lite-latest';
          modelInstruction = "Role: CloreaV2.5. Tone: Rapid assistant. IMPORTANT: DO NOT USE BOLD SYMBOLS (*** or **). Use plain text. ";
          break;
        case 'arctic-x':
          targetModelId = 'gemini-3-pro-preview';
          modelInstruction = "Role: ArcticX. Tone: Technical architect. IMPORTANT: DO NOT USE BOLD SYMBOLS (*** or **). Use plain text. ";
          break;
        default:
          targetModelId = 'gemini-3-flash-preview';
      }

      const finalInstruction = systemInstruction + vaultContext + "\n\n" + modelInstruction;

      if (/draw|image|generate an image|create an image|show me an image/i.test(trimmedInput)) {
        targetModelId = 'gemini-2.5-flash-image';
      }

      const history = messages.slice(-10).map(m => ({
        role: m.role,
        parts: m.parts.map(p => p.text ? { text: p.text } : { inlineData: p.inlineData })
      }));

      const res = await ai.models.generateContent({
        model: targetModelId,
        contents: [...history, { role: 'user', parts: parts as any }],
        config: { 
          systemInstruction: finalInstruction,
          tools: isSearchEnabled ? [{ googleSearch: {} }] : [] 
        }
      });

      // FIX: Extract search grounding metadata (URLs) from the response if search was enabled.
      const groundingChunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks;

      const resParts: ChatPart[] = res.candidates?.[0]?.content?.parts.map(p => {
        if (p.text) return { text: p.text };
        if (p.inlineData) return { inlineData: { mimeType: p.inlineData.mimeType, data: p.inlineData.data } };
        return { text: "" };
      }).filter(p => p.text !== "" || p.inlineData) || [{ text: "No output generated." }];

      // FIX: If grounding chunks (search results) exist, append them to the response parts for rendering.
      if (groundingChunks && groundingChunks.length > 0) {
        resParts.push({ searchResults: groundingChunks });
      }

      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, parts: resParts, isSearching: false } : m));
    } catch (e) {
      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, parts: [{ text: "Neural link timeout. Please retry." }], isSearching: false } : m));
    } finally {
      setIsLoading(false);
    }
  }, [input, selectedImage, isLoading, messages, systemInstruction, model, isSearchEnabled, setMessages, memories]);

  const modelOptions = [
    { id: 'cognix-rv2', label: 'CognixRv2', desc: 'Fast and reliable', icon: <BoltIcon className="w-4 h-4"/>, tag: 'Default' },
    { id: 'clora-v1', label: 'CloraV1', desc: 'Reasoning engine', icon: <SparklesIcon className="w-4 h-4"/>, tag: 'Pro' },
    { id: 'clorea-v2.5', label: 'CloreaV2.5', desc: 'Lightweight and fast', icon: <BrainIcon className="w-4 h-4"/>, tag: 'Lite' },
    { id: 'arctic-x', label: 'ArcticX', desc: 'Technical specialist', icon: <CodeIcon className="w-4 h-4"/>, tag: 'Dev' }
  ];

  const activeModelData = modelOptions.find(m => m.id === model) || modelOptions[0];

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#020617] relative overflow-hidden transition-colors duration-300">
      
      <div 
        ref={containerRef} 
        className={`flex-1 overflow-y-auto px-4 sm:px-6 md:px-12 lg:px-40 scroll-smooth transition-all custom-scrollbar ${
          hasMessages ? 'pb-32 pt-6' : 'flex flex-col items-center justify-center min-h-[80dvh] pb-48'
        }`}
      >
        {!hasMessages ? (
          <div className="w-full max-w-xl mx-auto flex flex-col items-center animate-slide-up text-center select-none pointer-events-none">
             <h2 className="text-3xl sm:text-4xl font-semibold text-slate-900 dark:text-white tracking-tight mb-3 leading-tight">How can I help you?</h2>
             <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">CognixAi Uplink Active</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6 w-full pb-10">
            {messages.map((m, idx) => (
              <div key={m.id} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-slide-up`}>
                <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center shadow-sm border ${m.role === 'user' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                   {m.role === 'user' ? <UserIcon className="w-4 h-4"/> : <BotIcon className="w-full h-full p-1.5"/>}
                </div>
                <div className={`flex flex-col gap-1.5 max-w-[90%] sm:max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {m.parts.map((p, i) => (
                    <div key={i} className={`px-5 py-3 text-[15px] sm:text-[16px] font-medium leading-relaxed ${m.role === 'user' ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl rounded-tr-sm shadow-sm' : 'bg-transparent text-slate-900 dark:text-slate-100'}`}>
                      {p.inlineData && <img src={`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`} className="max-h-[400px] w-full object-contain mb-3 rounded-xl shadow-lg border dark:border-slate-700" alt="Output" />}
                      {p.text ? <div className="whitespace-pre-wrap">{p.text}</div> : (idx === messages.length - 1 && isLoading && m.role === 'model' && <div className="flex gap-1.5 py-1.5"><div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div><div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div></div>)}
                      {/* FIX: Render Google Search grounding sources (links) in the chat if available. */}
                      {p.searchResults && p.searchResults.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 w-full overflow-hidden">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Sources</p>
                          <div className="flex flex-wrap gap-2">
                            {p.searchResults.map((chunk, ci) => (
                              chunk.web && (
                                <a 
                                  key={ci} 
                                  href={chunk.web.uri} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg hover:text-blue-500 transition-all truncate max-w-[240px] border border-slate-200 dark:border-slate-700"
                                >
                                  {chunk.web.title || chunk.web.uri}
                                </a>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`fixed left-0 right-0 p-3 sm:p-5 z-[60] pointer-events-none transition-all duration-300 ${isSidebarCollapsed ? 'lg:pl-16' : 'lg:pl-[240px]'} ${hasMessages ? 'bottom-0' : 'bottom-12 sm:bottom-24'}`}>
        <div className="max-w-2xl mx-auto pointer-events-auto">
          {/* Blue Strip Border Around Input Area */}
          <div className="relative bg-white dark:bg-[#0d111c] border-2 border-blue-500 rounded-[2.5rem] p-2 sm:p-2.5 shadow-[0_15px_40px_-10px_rgba(59,130,246,0.25)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.5)] transition-shadow hover:shadow-[0_15px_40px_-5px_rgba(59,130,246,0.35)]">
            
            <div className="flex items-center gap-1.5 px-2 mb-1.5">
               <button onClick={() => setShowModelMenu(true)} className="flex items-center gap-2 py-1 px-3 text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all border border-slate-100 dark:border-slate-800 shadow-sm">
                  {activeModelData.icon} {activeModelData.label} <span className="text-slate-400 opacity-50">▾</span>
               </button>
               <button onClick={() => setIsSearchEnabled(!isSearchEnabled)} className={`flex items-center gap-1.5 py-1 px-3 text-[9px] font-bold uppercase tracking-wider rounded-lg border transition-all ${isSearchEnabled ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600' : 'bg-transparent border-transparent text-slate-400 hover:text-slate-600'}`}>
                  Live Search
               </button>
            </div>

            {selectedImage && <div className="px-2 pb-3 flex items-center gap-2 animate-fade-in"><div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700"><img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} className="w-full h-full object-cover" /><button onClick={() => setSelectedImage(null)} className="absolute top-0 right-0 bg-red-600 text-white w-5 h-5 flex items-center justify-center rounded-bl-lg text-[10px] font-bold shadow-sm">×</button></div></div>}
            
            <div className="flex items-center gap-1.5">
                <button onClick={() => fileRef.current?.click()} className="w-10 h-10 shrink-0 flex items-center justify-center text-slate-400 hover:text-blue-500 rounded-2xl transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 group">
                    <AttachmentPlusIcon className="w-6 h-6 transition-transform group-hover:scale-110" />
                    <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onloadend = () => setSelectedImage({ data: (r.result as string).split(',')[1], mimeType: f.type }); r.readAsDataURL(f); } }} />
                </button>
                <textarea ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 180) + 'px'; }} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())} placeholder="Message CognixAi..." className="flex-1 bg-transparent border-none outline-none resize-none py-2 text-[15px] sm:text-[16px] text-slate-900 dark:text-white placeholder-slate-400 font-semibold max-h-[180px] min-h-[44px] custom-scrollbar leading-relaxed" rows={1} />
                <button onClick={handleSend} disabled={isLoading || (!input.trim() && !selectedImage)} className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg disabled:opacity-20 active:scale-95 transition-all"><SendIcon className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      </div>

      {showModelMenu && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowModelMenu(false)}>
          <div className="bg-white dark:bg-[#0f172a] w-full max-w-[340px] rounded-t-3xl sm:rounded-2xl p-3 shadow-2xl animate-slide-up border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
            <div className="flex flex-col gap-1.5">
               {modelOptions.map((opt) => (
                 <button 
                  key={opt.id} 
                  onClick={() => { setActiveModel(opt.id as ModelType); setShowModelMenu(false); }} 
                  className={`w-full flex items-start gap-3.5 p-3.5 rounded-xl transition-all text-left group ${model === opt.id ? 'bg-slate-50 dark:bg-slate-800 shadow-sm' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                 >
                    <div className={`mt-0.5 p-2 rounded-lg transition-all ${model === opt.id ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/30' : 'text-slate-400'}`}>
                      {opt.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[14px] font-bold tracking-tight ${model === opt.id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>{opt.label}</span>
                        {opt.tag && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-500">{opt.tag}</span>}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-500 font-bold leading-tight">{opt.desc}</p>
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
