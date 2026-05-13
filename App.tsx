import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChatView } from './components/ChatView';
import { Sidebar } from './components/Sidebar';
import { ToolboxView } from './components/ToolboxView';
import { MemoryView } from './components/MemoryView';
import { SettingsModal } from './components/SettingsModal';
import { BotIcon } from './components/Icons';
import { Menu, User, Bell, Search, Sparkles, Moon, Sun } from 'lucide-react';
import type { ChatMessage, ChatSession, Mode, ThemeColors, ModelType, MemoryFact } from './types';

const THEME: ThemeColors = {
    primary: 'bg-[#1E293B]',
    primaryHover: 'hover:bg-[#0F172A]',
    text: 'text-slate-900',
    textDark: 'text-white',
    bgSoft: 'bg-slate-50',
    darkBgSoft: 'dark:bg-[#0F172A]',
    border: 'border-slate-200',
    ring: 'focus:ring-slate-400/20',
    gradient: 'bg-slate-900'
};

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  
  const [activeModel, setActiveModel] = useState<ModelType>('pro');
  const [systemInstruction, setSystemInstruction] = useState("I am Cognix Pro, a high-performance neural assistant. I specialize in deep reasoning, precise technical execution, and elegant problem-solving. Use professional, concise language. My architecture is private and secure.");
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [memories, setMemories] = useState<MemoryFact[]>([]);

  const currentChat = useMemo(() => chatHistory.find(c => c.id === activeChatId), [chatHistory, activeChatId]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('cognix_v8_history');
    if (savedHistory) setChatHistory(JSON.parse(savedHistory));
  }, []);

  useEffect(() => {
    localStorage.setItem('cognix_v8_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleUpdateMessages = (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setMessages(prev => {
      const next = updater(prev);
      if (activeChatId) {
        setChatHistory(h => h.map(c => c.id === activeChatId ? { ...c, messages: next } : h.find(cx => cx.id === activeChatId) ? h.map(cx => cx.id === activeChatId ? {...cx, messages: next} : cx) : c) as any);
        // More robust history update
        setChatHistory(h => {
             const existingIdx = h.findIndex(c => c.id === activeChatId);
             if (existingIdx !== -1) {
                const newH = [...h];
                newH[existingIdx] = { ...newH[existingIdx], messages: next };
                return newH;
             }
             return h;
        });
      } else if (next.length > 0) {
        const newId = Date.now().toString();
        const firstUserMsg = next.find(m => m.role === 'user');
        const titleText = firstUserMsg?.parts.find(p => p.text)?.text || 'New Synthesis';
        const newChat: ChatSession = { id: newId, title: titleText.slice(0, 30), messages: next, participants: ['You'] };
        setChatHistory([newChat, ...chatHistory]);
        setActiveChatId(newId);
      }
      return next;
    });
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setMode('chat');
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  return (
    <div className="h-full w-full flex bg-white dark:bg-cognix-950 font-sans text-slate-900 transition-colors duration-300 overflow-hidden">
      <Sidebar 
        chatHistory={chatHistory} 
        activeChatId={activeChatId} 
        mode={mode}
        onSetMode={setMode}
        onSelectChat={(id) => { 
            setActiveChatId(id); 
            const chat = chatHistory.find(c => c.id === id);
            if(chat) setMessages(chat.messages);
            setMode('chat'); 
        }}
        onNewChat={handleNewChat}
        onDeleteChat={() => {}}
        isSidebarOpen={isSidebarOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col h-full relative overflow-hidden">
        <header className="h-[64px] flex items-center justify-between px-6 md:px-10 border-b border-slate-100 dark:border-slate-800/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shrink-0 z-40">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-500 hover:text-violet-500 lg:hidden">
              <Menu size={24}/>
            </button>
            <div className="flex items-center gap-8">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-none mb-1 opacity-60">Neural Workspace</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                   {mode === 'chat' ? 'Cognix Nexus' : mode.charAt(0).toUpperCase() + mode.slice(1).replace('box', ' Modules')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button 
                onClick={toggleDarkMode}
                className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-violet-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="h-5 w-[1px] bg-slate-100 dark:bg-slate-800 mx-1 hidden sm:block"></div>
            <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-2.5 pl-2.5 pr-3.5 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all group border border-transparent hover:border-slate-200 dark:hover:border-slate-800">
              <div className="w-7 h-7 rounded-lg bg-slate-950 text-white flex items-center justify-center shadow-lg shadow-violet-500/10">
                 <User size={16} />
              </div>
              <div className="flex flex-col items-start hidden md:flex">
                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Admin</span>
                 <span className="text-[11px] font-bold text-slate-900 dark:text-white">Workspace</span>
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 relative overflow-hidden bg-white dark:bg-cognix-950">
           <AnimatePresence mode="wait">
             {mode === 'chat' && (
                <motion.div 
                  key="chat"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <ChatView 
                    messages={messages} 
                    setMessages={(val) => {
                      if (typeof val === 'function') handleUpdateMessages(val as any);
                      else handleUpdateMessages(() => val as any);
                    }} 
                    systemInstruction={systemInstruction} 
                    model={activeModel} 
                    setActiveModel={setActiveModel} 
                    participants={['You']}
                    onAddParticipant={() => {}}
                    currentChat={currentChat}
                    isSidebarCollapsed={isSidebarCollapsed}
                    memories={memories}
                  />
                </motion.div>
             )}
             {mode === 'toolbox' && (
                <motion.div
                  key="toolbox"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="h-full"
                >
                  <ToolboxView theme={THEME} model={activeModel} />
                </motion.div>
             )}
             {mode === 'memory' && (
                 <motion.div
                   key="memory"
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   exit={{ opacity: 0, y: -10 }}
                   transition={{ duration: 0.2 }}
                   className="h-full"
                 >
                   <MemoryView 
                    memories={memories} 
                    setMemories={setMemories} 
                    theme={THEME} 
                   />
                 </motion.div>
             )}
           </AnimatePresence>
        </main>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        systemInstruction={systemInstruction} 
        setSystemInstruction={setSystemInstruction}
        memories={memories}
        setMemories={setMemories}
        onClearHistory={() => {
            setChatHistory([]);
            setMessages([]);
            setActiveChatId(null);
            localStorage.removeItem('cognix_v8_history');
        }}
      />
    </div>
  );
}

export default App;
