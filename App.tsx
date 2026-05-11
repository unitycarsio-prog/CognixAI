import React, { useState, useEffect, useMemo } from 'react';
import { ChatView } from './components/ChatView';
import { ImagineView } from './components/ImagineView';
import { Sidebar } from './components/Sidebar';
import { CommunityView } from './components/CommunityView';
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
  const [systemInstruction, setSystemInstruction] = useState("I am Cognix Pro, a high-performance neural assistant developed, trained, and engineered by Shashwat Ranjan Jha. I specialize in deep reasoning, precise technical execution, and elegant problem-solving. Use professional, concise language. My architecture is private and secure.");
  
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
        <header className="h-[80px] flex items-center justify-between px-6 md:px-10 border-b border-slate-100 dark:border-cognix-900 bg-slate-50 dark:bg-cognix-950 shrink-0 z-40">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-500 hover:text-blue-500 lg:hidden">
              <Menu size={24}/>
            </button>
            <div className="flex items-center gap-4">
              <BotIcon className="w-9 h-9 lg:hidden" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 dark:text-white leading-none mb-1">
                   {mode === 'chat' ? 'Workspace' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  Cognix Pro
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <button 
                onClick={toggleDarkMode}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-cognix-900 transition-all active:scale-90"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="w-10 h-10 hidden sm:flex items-center justify-center rounded-xl text-slate-400 hover:text-blue-500 hover:bg-slate-50 dark:hover:bg-cognix-900 transition-all active:scale-90">
              <Bell size={20} />
            </button>
            <div className="h-6 w-[1px] bg-slate-100 dark:bg-cognix-900 mx-1 hidden sm:block"></div>
            <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-3 pl-3 pr-4 py-2 hover:bg-slate-50 dark:hover:bg-cognix-900 rounded-2xl transition-all group">
              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-cognix-800 flex items-center justify-center text-slate-500 group-hover:text-blue-500 transition-colors">
                 <User size={18} />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 hidden md:block">Shashwat</span>
            </button>
          </div>
        </header>

        <main className="flex-1 relative overflow-hidden bg-white dark:bg-cognix-950">
           {mode === 'chat' && (
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
           )}
           {mode === 'imagine' && <ImagineView />}
           {mode === 'toolbox' && <ToolboxView theme={THEME} model={activeModel} />}
           {mode === 'community' && <CommunityView theme={THEME} model={activeModel} />}
           {mode === 'memory' && (
               <MemoryView 
                memories={memories} 
                setMemories={setMemories} 
                theme={THEME} 
               />
           )}
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
