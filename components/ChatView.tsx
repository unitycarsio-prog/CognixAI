import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, ChatPart, ModelType, ChatSession, MemoryFact } from '../types';
import { ai } from '../services/gemini';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { BotIcon } from './Icons';
import { 
  Send, 
  Plus, 
  Bot, 
  User, 
  Search, 
  Sparkles, 
  Zap, 
  Shield, 
  Code, 
  Cpu, 
  ChevronDown,
  Paperclip,
  X,
  Globe,
  ExternalLink
} from 'lucide-react';

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

const MODEL_MAP: Record<ModelType, string> = {
  'flash': 'gemini-3-flash-preview',
  'pro': 'gemini-3.1-pro-preview',
  'lite': 'gemini-3.1-flash-lite',
  'image': 'gemini-2.5-flash-image',
  'coding': 'gemini-3.1-pro-preview'
};

interface ModelConfig {
  id: ModelType;
  name: string;
  badge: string;
  desc: string;
  icon: React.ReactNode;
  instruction: string;
}

const MODELS_CONFIG: ModelConfig[] = [
  {
    id: 'flash',
    name: 'FLASHRV2',
    badge: 'DEFAULT',
    desc: 'Fast and reliable for daily tasks',
    icon: <Zap size={16} />,
    instruction: "You are CognixRv2, a high-performance assistant developed by Shashwat Ranjan Jha. Be fast, reliable, and concise. Ideal for daily tasks and general inquiries."
  },
  {
    id: 'pro',
    name: 'Cognix Pro',
    badge: 'ADVANCED',
    desc: 'Deep reasoning and complex logic',
    icon: <Cpu size={16} />,
    instruction: "You are the primary Cognix Pro reasoning engine, engineered and trained by Shashwat Ranjan Jha. Provide detailed, expert-level logic and step-by-step thinking for complex problems."
  },
  {
    id: 'lite',
    name: 'LITECORE',
    badge: 'LITE',
    desc: 'Lightweight and ultra-fast',
    icon: <Shield size={16} />,
    instruction: "You are Cognix Lite, a streamlined intelligence module built by Shashwat Ranjan Jha. Provide ultra-fast, brief, and efficient responses."
  },
  {
    id: 'coding',
    name: 'CODESTORM',
    badge: 'TECH',
    desc: 'Specialize in code and logic',
    icon: <Code size={16} />,
    instruction: "You are the Cognix Technical Specialist, an elite coding intelligence developed by Shashwat Ranjan Jha. Focus heavily on clean, efficient code, software architecture, and logical debugging."
  }
];

export const ChatView: React.FC<ChatViewProps> = ({ 
  messages, setMessages, systemInstruction, model, setActiveModel, currentChat, memories = []
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [showModelMenu, setShowModelMenu] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowModelMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim();
    if ((!trimmedInput && !selectedImage) || isLoading) return;

    const parts: ChatPart[] = [];
    if (selectedImage) parts.push({ inlineData: { mimeType: selectedImage.mimeType, data: selectedImage.data } });
    if (trimmedInput) parts.push({ text: trimmedInput });

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', parts };
    const botMsgId = (Date.now() + 1).toString();
    const botPlaceholder: ChatMessage = { id: botMsgId, role: 'model', parts: [{ text: '' }] };

    setMessages(prev => [...prev, userMsg, botPlaceholder]);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({
        role: m.role,
        parts: m.parts.map(p => p.text ? { text: p.text } : { inlineData: p.inlineData })
      }));

      const tools: any[] = [];
      if (isSearchEnabled) {
        tools.push({ googleSearch: {} });
      }

      const activeConfig = MODELS_CONFIG.find(c => c.id === model) || MODELS_CONFIG[0];

      const res = await ai.models.generateContent({
        model: MODEL_MAP[model] || 'gemini-3-flash-preview',
        contents: [...history, { role: 'user', parts: parts as any }],
        config: { 
          systemInstruction: systemInstruction + "\n\n" + activeConfig.instruction,
          tools: tools.length > 0 ? tools : undefined
        }
      });

      const resText = res.text || "Neural link stable but no data returned.";
      const groundingChunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const sources = groundingChunks
        .filter((chunk: any) => chunk.web)
        .map((chunk: any) => ({ uri: chunk.web.uri, title: chunk.web.title }));

      setMessages(prev => prev.map(m => m.id === botMsgId ? { 
        ...m, 
        parts: [{ 
          text: resText,
          searchResults: sources.length > 0 ? sources : undefined
        }] 
      } : m));
    } catch (e: any) {
      console.error("Chat error:", e);
      setMessages(prev => prev.map(m => m.id === botMsgId ? { ...m, parts: [{ text: "Neural link timeout. " + (e.message || "Please retry.") }] } : m));
    } finally {
      setIsLoading(false);
    }
  }, [input, selectedImage, isLoading, messages, systemInstruction, setMessages, model, isSearchEnabled]);

  const activeModelConfig = MODELS_CONFIG.find(c => c.id === model) || MODELS_CONFIG[0];

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-cognix-950 relative technical-grid">
      <div 
        ref={containerRef} 
        className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-12 pb-32 pt-10 scroll-smooth"
      >
        {!hasMessages ? (
          <div className="h-full flex flex-col items-center justify-center select-none animate-fade-in text-center p-6">
             <div className="mb-8">
                <BotIcon className="w-20 h-20 shadow-xl rounded-full" />
             </div>
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">How can I help you today?</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium leading-relaxed">
              Experience the power of professional AI. Start a conversation to explore insights, code, and more.
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-10">
            {messages.map((m) => (
              <motion.div 
                key={m.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`flex gap-6 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start`}
              >
                <div className={`shrink-0 transition-all ${m.role === 'user' ? 'w-10 h-10 rounded-2xl bg-slate-900 dark:bg-violet-600 shadow-lg shadow-violet-500/20 flex items-center justify-center' : 'w-8 h-8 rounded-lg bg-violet-600/10 flex items-center justify-center'}`}>
                   {m.role === 'user' ? <User size={20} className="text-white"/> : <Sparkles size={14} className="text-violet-500" />}
                </div>
                <div className={`flex flex-col gap-2 max-w-[90%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {m.parts.map((p, i) => (
                    <div key={i} className={`markdown-body group relative ${m.role === 'user' ? 'bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-2xl rounded-tr-none px-6 py-4 font-medium' : 'bg-transparent text-black dark:text-white py-1 leading-relaxed'}`}>
                      {p.text && (
                        <div className={m.role === 'model' ? 'text-sm font-medium' : ''}>
                          <ReactMarkdown>{p.text}</ReactMarkdown>
                        </div>
                      )}
                      {p.inlineData && (
                        <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg">
                          <img src={`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`} className="max-w-full h-auto" referrerPolicy="no-referrer" />
                        </div>
                      )}
                      
                      {p.searchResults && p.searchResults.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Globe size={12} className="text-violet-500" /> Neural Grounding Verified
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {p.searchResults.map((source: any, idx: number) => (
                                <a 
                                  key={idx} 
                                  href={source.uri} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-all flex items-center gap-2 shadow-sm"
                                >
                                  <span className="truncate max-w-[140px] uppercase tracking-tighter">{source.title || "Reference"}</span>
                                  <ExternalLink size={10} />
                                </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
            {isLoading && messages[messages.length-1]?.role === 'user' && (
              <div className="flex gap-6">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-white dark:bg-cognix-900 border border-slate-100 dark:border-cognix-800 flex items-center justify-center">
                  <div className="neural-wave">
                    <div></div>
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                </div>
                <div className="flex items-center gap-2 py-4">
                  <span className="text-[10px] font-mono text-violet-500 font-bold animate-pulse tracking-[0.3em] uppercase">Synthesizing Logic...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 px-4 sm:px-6 pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <div className="relative group/box">
            <div className="absolute -inset-[1px] bg-gradient-to-r from-violet-600 via-fuchsia-400 to-violet-600 rounded-[1.5rem] blur-[2px] opacity-0 group-focus-within/box:opacity-100 transition duration-500 animate-pulse"></div>
            <div className="relative bg-white/95 dark:bg-slate-950/90 backdrop-blur-3xl border border-slate-200/40 dark:border-slate-800/40 rounded-[1.5rem] p-1.5 shadow-[0_8px_40px_rgb(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgb(0,0,0,0.4)] flex flex-col gap-1.5">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1">
                    <div className="relative" ref={menuRef}>
                      <button 
                        onClick={() => setShowModelMenu(!showModelMenu)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/20 dark:border-slate-700/20 rounded-full text-[8px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-all active:scale-95"
                      >
                        <span className="text-violet-500">{activeModelConfig.icon}</span>
                        <span className="hidden xs:inline">{activeModelConfig.name}</span>
                        <ChevronDown size={8} className={`transition-transform duration-300 ${showModelMenu ? 'rotate-180' : ''}`} />
                      </button>
                      
                      <AnimatePresence>
                        {showModelMenu && (
                          <motion.div 
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute bottom-full mb-3 left-0 w-[260px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl py-2 z-50 overflow-hidden"
                          >
                             {MODELS_CONFIG.map((m) => (
                               <button 
                                 key={m.id}
                                 onClick={() => { setActiveModel(m.id); setShowModelMenu(false); }}
                                 className={`w-full text-left px-5 py-3 flex items-start gap-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 ${model === m.id ? 'bg-violet-50/50 dark:bg-violet-500/5' : ''}`}
                               >
                                 <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center transition-all ${model === m.id ? 'bg-violet-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                    {m.icon}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                       <span className={`text-[11px] font-bold tracking-tight ${model === m.id ? 'text-violet-600' : 'text-slate-900 dark:text-white'}`}>{m.name}</span>
                                       {model === m.id && <Sparkles size={10} className="text-violet-500" />}
                                    </div>
                                    <p className="text-[9px] text-slate-500 leading-tight truncate">{m.desc}</p>
                                 </div>
                               </button>
                             ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1"></div>

                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setIsSearchEnabled(!isSearchEnabled)}
                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-all relative ${isSearchEnabled ? 'text-violet-600 font-bold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                        title={`Live Web Search ${isSearchEnabled ? 'ON' : 'OFF'}`}
                      >
                        <Globe size={16} />
                        {isSearchEnabled && <motion.div layoutId="search-glow" className="absolute inset-0 bg-violet-500/10 rounded-full animate-pulse" />}
                      </button>
                      <button 
                          onClick={() => fileRef.current?.click()} 
                          className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-all rounded-full"
                      >
                          <Paperclip size={16} />
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
                  </div>

                  {isSearchEnabled && (
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-1.5 px-2 py-0.5 bg-violet-50/50 dark:bg-violet-500/10 border border-violet-100/50 dark:border-violet-500/20 rounded-full"
                    >
                      <div className="w-1 h-1 rounded-full bg-violet-500 animate-pulse"></div>
                      <span className="text-[8px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">Neural Search Active</span>
                    </motion.div>
                  )}
                </div>

                <div className="flex items-start gap-2 px-2.5 pb-0.5">
                  <div className="flex-1 min-w-0">
                    <textarea 
                      ref={textareaRef}
                      value={input} 
                      onChange={e => {
                        setInput(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                      }} 
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                      placeholder="Neural query..." 
                      className="w-full bg-transparent border-none outline-none resize-none pt-1.5 pb-2 text-slate-900 dark:text-white placeholder-slate-400/50 font-bold max-h-[200px] text-xs leading-relaxed" 
                      rows={1} 
                    />
                  </div>
                  <button 
                    onClick={handleSend}
                    disabled={isLoading || (!input.trim() && !selectedImage)}
                    className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-xl transition-all ${input.trim() || selectedImage ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20 active:scale-90' : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed opacity-50'}`}
                  >
                    <Send size={14} className={input.trim() ? 'translate-x-0.5' : ''} />
                  </button>
                </div>
            </div>
            
            <AnimatePresence>
              {selectedImage && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="mt-2"
                >
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-blue-500 shadow-md group">
                    <img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button 
                      onClick={() => setSelectedImage(null)} 
                      className="absolute top-1 right-1 w-5 h-5 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-sm transition-opacity"
                    >
                      <X size={12} />
                    </button>
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
