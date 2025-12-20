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
  const [activeModel, setActiveModel] = useState<ModelType>('gemini-3-pro-preview');
  const [systemInstruction, setSystemInstruction] = useState("Hey! I'm Cognix, your elite AI companion by Shashwat Ranjan Jha. I provide high-fidelity intelligence focusing on precise reasoning, creative content, and architectural coding.");
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
    
    // Handle Shared Sessions
    const handshake = params.get('handshake');
    if (handshake) {
      try {
        const decoded = JSON.parse(atob(handshake));
        const newId = 'session-' + Date.now();
        const sharedChat: ChatSession = {
          id: newId,
          title: decoded.title || 'Joined Session',
          messages: decoded.messages || [],
          participants: ['You', 'Founder Node']
        };
        setChatHistory(prev => [sharedChat, ...prev]);
        setActiveChatId(newId);
      } catch (e) { console.error("Invalid handshake", e); }
    }

    // Handle Deployed UI Assets
    const deployment = params.get('deployment');
    if (deployment) {
      try {
        const decoded = decodeURIComponent(escape(atob(deployment)));
        setDeploymentHtml(decoded);
      } catch (e) { console.error("Deployment corrupt", e); }
    }

    // Clean URL
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
    <div className="h-full w-full flex bg-white dark:bg-slate-950 transition-colors duration-300 overflow-hidden font-sans">
      {deploymentHtml ? (
        <div className="fixed inset-0 z-[1000] bg-white dark:bg-black">
          <div className="absolute top-4 right-4 z-[1001]">
            <button onClick={() => setDeploymentHtml(null)} className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black rounded-xl font-bold text-xs uppercase">Close Preview</button>
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
        <header className="h-14 sm:h-18 flex items-center justify-between px-4 sm:px-12 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 sm:gap-6">
            <button onClick={() => {
              if (window.innerWidth < 1024) setIsSidebarOpen(true);
              else setIsSidebarCollapsed(!isSidebarCollapsed);
            }} className="p-2 -ml-2 text-black dark:text-white transition-all hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
              <MenuIcon className="w-6 h-6"/>
            </button>
            <div className="flex items-center gap-2 sm:gap-4">
              <BotIcon className="w-8 h-8 sm:w-10 sm:h-10 cursor-pointer" onClick={handleNewChat} />
              <div className="h-5 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1 sm:mx-2"></div>
              <div className="flex flex-col">
                <span className="text-[14px] sm:text-lg font-bold text-black dark:text-white tracking-tight uppercase leading-none">{mode.toUpperCase()}</span>
                <span className="text-[8px] font-bold text-slate-500 uppercase hidden sm:block">Nexus v11</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => setMode(mode === 'live' ? 'chat' : 'live')}
              className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl transition-all shadow-sm border ${mode === 'live' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-slate-100 dark:bg-slate-800 text-black dark:text-white hover:opacity-80'}`}
              title="Live Talk"
            >
              <MicrophoneIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl text-black dark:text-white hover:opacity-80 transition-all shadow-sm border border-slate-200 dark:border-slate-700"
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