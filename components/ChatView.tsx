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
    name: 'PRONEXUS',
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
          <div className="max-w-3xl mx-auto space-y-10">
            {messages.map((m) => (
              <motion.div 
                key={m.id} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`flex gap-6 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start`}
              >
                <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all ${m.role === 'user' ? 'bg-slate-900 dark:bg-blue-600' : 'bg-white dark:bg-cognix-900 border border-slate-100 dark:border-cognix-800 shadow-sm'}`}>
                   {m.role === 'user' ? <User size={20} className="text-white"/> : <Bot size={24} className="text-blue-500 dark:text-blue-400"/>}
                </div>
                <div className={`flex flex-col gap-2 max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {m.parts.map((p, i) => (
                    <div key={i} className={`markdown-body ${m.role === 'user' ? 'bg-slate-100 dark:bg-cognix-900 text-slate-800 dark:text-slate-200 rounded-2xl px-6 py-4 font-medium' : 'text-slate-900 dark:text-slate-100 leading-relaxed pt-1'}`}>
                      {p.text && <ReactMarkdown>{p.text}</ReactMarkdown>}
                      {p.inlineData && (
                        <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-cognix-800 shadow-lg">
                          <img src={`data:${p.inlineData.mimeType};base64,${p.inlineData.data}`} className="max-w-full h-auto" />
                        </div>
                      )}
                      
                      {p.searchResults && p.searchResults.length > 0 && (
                        <div className="mt-4 flex flex-col gap-2">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Globe size={12} /> Grounded references
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {p.searchResults.map((source: any, idx: number) => (
                                <a 
                                  key={idx} 
                                  href={source.uri} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-slate-50 dark:bg-cognix-900 border border-slate-200 dark:border-cognix-800 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-2 shadow-sm"
                                >
                                  <span className="truncate max-w-[150px]">{source.title || "Source"}</span>
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
                  <span className="text-[10px] font-mono text-blue-500 font-bold animate-pulse tracking-[0.3em] uppercase">Synthesizing Logic...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="absolute bottom-8 left-0 right-0 px-4 pointer-events-none">
        <div className="max-w-3xl mx-auto pointer-events-auto">
          <div className="bg-white dark:bg-cognix-900 border border-slate-200 dark:border-cognix-800 rounded-[2.5rem] p-2 shadow-2xl focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
            
            <div className="flex items-center gap-4 px-4 py-2 border-b border-slate-100 dark:border-cognix-800/50 mb-1">
               <div className="relative" ref={menuRef}>
                 <button 
                  onClick={() => setShowModelMenu(!showModelMenu)}
                  className="flex items-center gap-3 px-3 py-1.5 bg-slate-50 dark:bg-cognix-950 border border-slate-200 dark:border-cognix-800 rounded-xl text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest hover:border-blue-500 transition-all"
                 >
                    <div className="text-blue-500">{activeModelConfig.icon}</div>
                    <span>{activeModelConfig.name}</span>
                    <ChevronDown size={12} className={`transition-transform ${showModelMenu ? 'rotate-180' : ''}`} />
                 </button>
                 
                 <AnimatePresence>
                   {showModelMenu && (
                     <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full mb-4 left-0 w-[280px] bg-white dark:bg-cognix-900 border border-slate-200 dark:border-cognix-800 rounded-3xl shadow-2xl py-3 z-50 overflow-hidden"
                     >
                        {MODELS_CONFIG.map((m) => (
                          <button 
                            key={m.id}
                            onClick={() => { setActiveModel(m.id); setShowModelMenu(false); }}
                            className={`w-full text-left px-5 py-3 flex items-start gap-4 transition-all hover:bg-slate-50 dark:hover:bg-cognix-950 ${model === m.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                          >
                            <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all ${model === m.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-100 dark:bg-cognix-800 text-slate-400'}`}>
                               {m.icon}
                            </div>
                            <div className="flex-1">
                               <div className="flex items-center justify-between mb-0.5">
                                  <span className={`text-xs font-bold ${model === m.id ? 'text-blue-600' : 'text-slate-900 dark:text-white'}`}>{m.name}</span>
                                  <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-cognix-800 text-slate-500 rounded text-[7px] font-black tracking-widest">{m.badge}</span>
                               </div>
                               <p className="text-[10px] text-slate-500 leading-tight">{m.desc}</p>
                            </div>
                          </button>
                        ))}
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>

               <button 
                onClick={() => setIsSearchEnabled(!isSearchEnabled)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${isSearchEnabled ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
               >
                  <Search size={12} />
                  <span>Real-time Search {isSearchEnabled ? 'ON' : 'OFF'}</span>
               </button>
            </div>

            <div className="flex items-end gap-2 px-2 pb-2">
                <button 
                    onClick={() => fileRef.current?.click()} 
                    className="w-12 h-12 shrink-0 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all bg-slate-50 dark:bg-cognix-950 rounded-full border border-slate-200 dark:border-cognix-800"
                >
                    <Paperclip size={20} />
                    <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const r = new FileReader();
                        r.onloadend = () => setSelectedImage({ data: (r.result as string).split(',')[1], mimeType: f.type });
                        r.readAsDataURL(f);
                      }
                    }} />
                </button>
                <div className="flex-1 relative">
                  <textarea 
                    ref={textareaRef}
                    value={input} 
                    onChange={e => {
                      setInput(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                    }} 
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                    placeholder="Ask Cognix anything..." 
                    className="w-full bg-transparent border-none outline-none resize-none py-3 px-2 text-base text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium max-h-[200px]" 
                    rows={1} 
                  />
                </div>
                <button 
                  onClick={handleSend}
                  disabled={isLoading || (!input.trim() && !selectedImage)}
                  className={`w-12 h-12 shrink-0 flex items-center justify-center rounded-full transition-all shadow-lg ${input.trim() || selectedImage ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105' : 'bg-slate-100 dark:bg-cognix-800 text-slate-400 cursor-not-allowed opacity-50'} active:scale-95`}
                >
                  <Send size={20} />
                </button>
            </div>
            
            <AnimatePresence>
              {selectedImage && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="px-4 pb-4"
                >
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-xl group">
                    <img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setSelectedImage(null)} 
                      className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-sm transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="mt-4 text-center">
            <p className="text-[9px] font-mono text-slate-400 uppercase tracking-[0.3em]">
               Neural Processing Protocol Secured • Cognix OSS 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
