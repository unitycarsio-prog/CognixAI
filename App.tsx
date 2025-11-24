
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChatView } from './components/ChatView';
import { LiveView } from './components/LiveView';
import { Sidebar } from './components/Sidebar';
import { MenuIcon, SunIcon, MoonIcon, HelpCircleIcon } from './components/Icons';
import { AboutModal } from './components/AboutModal';
import { ai } from './services/gemini';
import type { ChatMessage, ChatSession, Mode } from './types';

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile toggle
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true); // Desktop toggle
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  
  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Load saved state
  useEffect(() => {
    const savedHistory = localStorage.getItem('cognix_chat_history');
    if (savedHistory) setChatHistory(JSON.parse(savedHistory));
    
    const savedTheme = localStorage.getItem('cognix_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('cognix_chat_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('cognix_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('cognix_theme', 'light');
    }
  }, [isDarkMode]);

  const currentChat = useMemo(() => 
    chatHistory.find(c => c.id === activeChatId), 
    [chatHistory, activeChatId]
  );

  // Load messages when active chat changes
  useEffect(() => {
    if (currentChat) {
      setMessages(currentChat.messages);
    } else {
      setMessages([]);
    }
  }, [currentChat?.id]); // Only trigger if ID changes to avoid circular loops

  const generateSmartTitle = async (chatId: string, text: string) => {
    try {
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: `Generate a brief, creative, and relevant title (2-5 words) for a conversation starting with: "${text}". If the input is a simple greeting like "hi" or "hello", use a generic friendly title like "Friendly Chat" or "New Conversation". Do not use quotes.` }] }]
      });
      const title = result.text?.trim();
      if (title) {
        setChatHistory(prev => prev.map(session => 
          session.id === chatId ? { ...session, title } : session
        ));
      }
    } catch (error) {
      // Silently fail
    }
  };

  // Sync messages to history (Fixes Duplicate Chat Issue)
  useEffect(() => {
    // If we have messages but no active ID, it means we started a new chat
    if (messages.length > 0 && !activeChatId) {
       // Check if the first message is empty (placeholder initialization) to avoid creating sessions for empty states
       if (messages[0].parts[0]?.text) {
          const newId = Date.now().toString();
          const firstUserText = messages[0].parts.find(p => p.text)?.text || 'New Chat';
          
          const newSession: ChatSession = {
            id: newId,
            title: firstUserText.slice(0, 30) + (firstUserText.length > 30 ? '...' : ''), // Fallback title
            messages: messages
          };
          
          setChatHistory(prev => [newSession, ...prev]);
          setActiveChatId(newId);
          generateSmartTitle(newId, firstUserText);
       }
    } else if (activeChatId && messages.length > 0) {
       // Update existing session
       // Optimization: only update if messages actually differ from current history to prevent loops?
       // React state setter is mostly efficient enough.
       setChatHistory(prev => prev.map(session => 
         session.id === activeChatId ? { ...session, messages } : session
       ));
    }
  }, [messages, activeChatId]);

  const handleUpdateMessages = (newMessages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setMessages(prev => {
      return typeof newMessages === 'function' ? newMessages(prev) : newMessages;
    });
  };

  const handleNewChat = () => {
    setActiveChatId(null);
    setMessages([]);
    setMode('chat');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleDeleteChat = (id: string) => {
    setChatHistory(h => h.filter(c => c.id !== id));
    if (activeChatId === id) {
      setActiveChatId(null);
      setMessages([]);
    }
  };

  const handleRenameChat = (id: string, newTitle: string) => {
    setChatHistory(h => h.map(c => c.id === id ? { ...c, title: newTitle } : c));
  };

  const toggleSidebar = () => {
    if (window.innerWidth >= 768) {
      setIsDesktopSidebarOpen(!isDesktopSidebarOpen);
    } else {
      setIsSidebarOpen(!isSidebarOpen);
    }
  };

  const getHeaderTitle = () => {
    switch (mode) {
      case 'live': return 'Live Conversation';
      default: return currentChat?.title || 'New Chat';
    }
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-100 dark:selection:bg-blue-900/30">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50 bg-gray-50/90 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out shadow-2xl md:shadow-none overflow-hidden
        ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0 w-72'}
        ${isDesktopSidebarOpen ? 'md:w-72' : 'md:w-0 md:border-none'}
      `}>
        <div className="w-72 h-full">
            <Sidebar 
            chatHistory={chatHistory}
            activeChatId={activeChatId}
            mode={mode}
            onSetMode={(m) => { setMode(m); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
            onSelectChat={(id) => { setActiveChatId(id); setMode('chat'); if(window.innerWidth < 768) setIsSidebarOpen(false); }}
            onNewChat={handleNewChat}
            onDeleteChat={handleDeleteChat}
            onRenameChat={handleRenameChat}
            />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative w-full bg-white dark:bg-gray-950 min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 z-30 transition-all duration-300 border-b border-transparent">
          <div className="flex items-center gap-3 overflow-hidden">
            <button 
              onClick={toggleSidebar}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
              title={isDesktopSidebarOpen ? "Hide Dashboard" : "Show Dashboard"}
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <h1 className="font-semibold text-lg text-gray-800 dark:text-gray-100 truncate tracking-tight">
              {getHeaderTitle()}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsAboutOpen(true)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              title="About"
            >
              <HelpCircleIcon className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
              title="Toggle Theme"
            >
              {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* View Container */}
        <main className="flex-1 relative overflow-hidden flex flex-col">
          {mode === 'chat' && (
            <ChatView 
              messages={messages} 
              setMessages={handleUpdateMessages} 
            />
          )}
          {mode === 'live' && <LiveView />}
        </main>
      </div>

      <AboutModal 
        isOpen={isAboutOpen} 
        onClose={() => setIsAboutOpen(false)}
        onClearHistory={() => { setChatHistory([]); setMessages([]); setActiveChatId(null); setIsAboutOpen(false); }}
      />
    </div>
  );
}

export default App;
