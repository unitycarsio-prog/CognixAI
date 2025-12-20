import React, { useState, useEffect, useMemo } from 'react';
import { ChatView } from './components/ChatView';
import { LiveView } from './components/LiveView';
import { Sidebar } from './components/Sidebar';
import { CommunityView } from './components/CommunityView';
import { ToolboxView } from './components/ToolboxView';
import { MenuIcon, BotIcon, UserIcon, MicrophoneIcon } from './components/Icons';
import { SettingsModal } from './components/SettingsModal';
import type { ChatMessage, ChatSession, Mode, ThemeColors, ModelType, MemoryFact } from './types';

const THEME: ThemeColors = {
    primary: 'bg-black dark:bg-white',
    primaryHover: 'hover:opacity-90',
    text: 'text-black dark:text-white',
    textDark: 'text-white dark:text-black',
    bgSoft: 'bg-slate-50',
    darkBgSoft: 'dark:bg-slate-900',
    border: 'border-slate-200 dark:border-slate-800',
    ring: 'focus:ring-black dark:focus:ring-white',
    gradient: 'bg-black dark:bg-white'
};

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeModel, setActiveModel] = useState<ModelType>('gemini-3-flash-preview');
  const [systemInstruction, setSystemInstruction] = useState("Hey! I'm Cognix, your elite AI companion. I focus on precision and creative intelligence.");
  const [deploymentHtml, setDeploymentHtml] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [memories, setMemories] = useState<MemoryFact[]>([]);

  const currentChat = useMemo(() => chatHistory.find(c => c.id === activeChatId), [chatHistory, activeChatId]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('cognix_v8_history');
    if (savedHistory) setChatHistory(JSON.parse(savedHistory));
    
    const savedVault = localStorage.getItem('nexzi_vault');
    if (savedVault) setMemories(JSON.parse(savedVault));

    const themeSaved = localStorage.getItem('cognix_theme');
    if (themeSaved === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }

    const params = new URLSearchParams(window.location.search);
    
    // Neural Handshake (Session Sharing)
    const handshake = params.get('handshake');
    if (handshake) {
      try {
        const decodedStr = decodeURIComponent(escape(atob(handshake)));
        const decoded = JSON.parse(decodedStr);
        const newId = 'collective-' + Date.now();
        const sharedChat: ChatSession = {
          id: newId,
          title: decoded.title || 'Shared Pulse',
          messages: decoded.messages || [],
          participants: ['You', 'Handshake Node']
        };
        setChatHistory(prev => [sharedChat, ...prev]);
        setActiveChatId(newId);
        setMode('chat');
      } catch (e) { console.error("Neural link handshake failed", e); }
    }

    // UI Deployment Loader
    const deployment = params.get('deployment');
    if (deployment) {
      try {
        const decoded = decodeURIComponent(escape(atob(deployment)));
        setDeploymentHtml(decoded);
      } catch (e) { console.error("Deployment asset failed to load", e); }
    }

    if (handshake || deployment) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cognix_v8_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    localStorage.setItem('nexzi_vault', JSON.stringify(memories));
  }, [memories]);

  useEffect(() => { 
    setMessages(currentChat ? currentChat.messages : []); 
  }, [currentChat?.id]);

  const handleUpdateMessages = (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
    setMessages(prev => {
      const next = updater(prev);
      if (activeChatId) {
        setChatHistory(h => h.map(c => c.id === activeChatId ? { ...c, messages: next } : c));
      } else if (next.length > 0) {
        const newId = Date.now().toString();
        const firstUserMsg = next.find(m => m.role === 'user');
        const titleText = firstUserMsg?.parts.find(p => p.text)?.text;
        const title = titleText ? titleText.slice(0, 40) : 'New Pulse';
        setChatHistory([{ id: newId, title: title || 'New Pulse', messages: next, participants: ['You'] }, ...chatHistory]);
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

  const toggleDarkMode = (dark: boolean) => {
    setIsDarkMode(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cognix_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('cognix_theme', 'light');
    }
  };

  return (
    <div className="h-full w-full flex bg-white dark:bg-slate-950 transition-colors duration-500 overflow-hidden font-sans">
      {deploymentHtml ? (
        <div className="fixed inset-0 z-[1000] bg-white dark:bg-black">
          <div className="absolute top-6 right-6 z-[1001]">
            <button onClick={() => setDeploymentHtml(null)} className="px-6 py-3 bg-black text-white dark:bg-white dark:text-black rounded-2xl font-black text-[10px] uppercase shadow-2xl transition-all active:scale-95">De-Infect Preview</button>
          </div>
          <iframe srcDoc={deploymentHtml} className="w-full h-full border-none" />
        </div>
      ) : null}

      <Sidebar 
        chatHistory={chatHistory} 
        activeChatId={activeChatId} 
        mode={mode}
        onSetMode={setMode}
        onSelectChat={(id) => { setActiveChatId(id); setMode('chat'); }}
        onNewChat={handleNewChat}
        onDeleteChat={(id) => { 
          setChatHistory(h => h.filter(c => c.id !== id)); 
          if(activeChatId === id) handleNewChat(); 
        }}
        isSidebarOpen={isSidebarOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className={`flex-1 flex flex-col h-full relative overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'lg:pl-0' : ''}`}>
        <header className="h-14 sm:h-20 flex items-center justify-between px-4 sm:px-12 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border-b border-slate-100 dark:border-slate-800 transition-colors">
          <div className="flex items-center gap-4 sm:gap-8">
            <button onClick={() => {
              if (window.innerWidth < 1024) setIsSidebarOpen(true);
              else setIsSidebarCollapsed(!isSidebarCollapsed);
            }} className="p-2.5 -ml-2 text-slate-900 dark:text-white transition-all hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl active:scale-90">
              <MenuIcon className="w-6 h-6"/>
            </button>
            <div className="flex items-center gap-3 sm:gap-5">
              <BotIcon className="w-9 h-9 sm:w-11 sm:h-11 cursor-pointer transition-transform hover:scale-105" onClick={handleNewChat} />
              <div className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1"></div>
              <div className="flex flex-col">
                <span className="text-[15px] sm:text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none italic">{mode.toUpperCase()}</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mt-1">Uplink 11.0</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <button 
              onClick={() => setMode(mode === 'live' ? 'chat' : 'live')}
              className={`w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl transition-all shadow-sm border ${mode === 'live' ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white animate-pulse' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-700 hover:text-black dark:hover:text-white'}`}
              title="Voice Protocol"
            >
              <MicrophoneIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-slate-400 hover:text-black dark:hover:text-white transition-all shadow-sm border border-slate-200 dark:border-slate-700"
            >
              <UserIcon className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 relative overflow-hidden h-full">
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
           {mode === 'live' && <LiveView />}
           {mode === 'toolbox' && <ToolboxView theme={THEME} model={activeModel} />}
           {mode === 'community' && <CommunityView theme={THEME} model={activeModel} />}
        </main>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        isDarkMode={isDarkMode}
        setIsDarkMode={toggleDarkMode}
        systemInstruction={systemInstruction} 
        setSystemInstruction={setSystemInstruction}
        memories={memories}
        setMemories={setMemories}
        onClearHistory={() => { 
          setChatHistory([]); 
          setMessages([]); 
          setActiveChatId(null); 
          setIsSettingsOpen(false); 
          localStorage.removeItem('cognix_v8_history');
        }}
      />
    </div>
  );
}

export default App;