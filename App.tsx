
import React, { useState, useEffect, useMemo } from 'react';
import { ChatView } from './components/ChatView';
import { LiveView } from './components/LiveView';
import { ImageView } from './components/ImageView';
import { Sidebar } from './components/Sidebar';
import { AboutModal } from './components/AboutModal';
import { BotIcon, SunIcon, MoonIcon, MenuIcon, HelpCircleIcon } from './components/Icons';
import type { ChatMessage, ChatSession } from './types';

type Mode = 'chat' | 'live' | 'image';
type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) return savedTheme;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [chatHistory, setChatHistory] = useState<ChatSession[]>(() => {
    try {
      const savedHistory = localStorage.getItem('chatHistoryV2');
      if (savedHistory) {
        return JSON.parse(savedHistory);
      }
    } catch (error) {
      console.error("Failed to parse chat history from localStorage", error);
    }
    return [];
  });

  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (chatHistory.length > 0) {
      if (!activeChatId || !chatHistory.find(c => c.id === activeChatId)) {
        setActiveChatId(chatHistory[0].id);
      }
    } else {
      handleNewChat();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Also save an empty array to clear it out.
    localStorage.setItem('chatHistoryV2', JSON.stringify(chatHistory));
  }, [chatHistory]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };
  
  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const handleNewChat = () => {
    const newChat: ChatSession = {
      id: `chat-${Date.now()}`,
      title: 'New Chat',
      messages: [],
    };
    setChatHistory(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setMode('chat');
    if (!isSidebarOpen) setIsSidebarOpen(true);
    return newChat;
  };

  const handleDeleteChat = (id: string) => {
    const updatedHistory = chatHistory.filter(chat => chat.id !== id);
    setChatHistory(updatedHistory);
    
    if (activeChatId === id) {
      if (updatedHistory.length > 0) {
        setActiveChatId(updatedHistory[0].id);
      } else {
        handleNewChat();
      }
    }
  };

  const handleRenameChat = (id: string, newTitle: string) => {
    setChatHistory(prev => 
        prev.map(chat => chat.id === id ? { ...chat, title: newTitle } : chat)
    );
  };

  const handleClearAllHistory = () => {
    if (window.confirm('Are you sure you want to delete all chat history? This action cannot be undone.')) {
        setChatHistory([]);
        localStorage.removeItem('chatHistoryV2');
        const newChat = handleNewChat();
        setActiveChatId(newChat.id);
        setIsAboutModalOpen(false);
    }
  };

  const activeChatMessages = useMemo(() => {
    return chatHistory.find(c => c.id === activeChatId)?.messages ?? [];
  }, [chatHistory, activeChatId]);

  const setMessagesForActiveChat = (updater: React.SetStateAction<ChatMessage[]>) => {
    setChatHistory(prevHistory => 
      prevHistory.map(chat => {
        if (chat.id === activeChatId) {
          const newMessages = typeof updater === 'function' ? updater(chat.messages) : updater;
          
          const shouldUpdateTitle = chat.title === 'New Chat' && newMessages.length > 0 && newMessages[0].role === 'user';
          const newTitle = shouldUpdateTitle
            ? (newMessages[0].parts.find(p => p.text)?.text || 'Untitled Chat').substring(0, 40)
            : chat.title;

          return { ...chat, title: newTitle, messages: newMessages };
        }
        return chat;
      })
    );
  };

  const renderContent = () => {
    switch (mode) {
      case 'chat':
        return (
          <ChatView 
            key={activeChatId}
            messages={activeChatMessages} 
            setMessages={setMessagesForActiveChat} 
          />
        );
      case 'live':
        return <LiveView />;
      case 'image':
        return <ImageView />;
      default:
        return null;
    }
  }

  const sidebarProps = {
    chatHistory,
    activeChatId,
    onSelectChat: (id: string) => {
        setActiveChatId(id);
        if (isMobile) setIsSidebarOpen(false);
    },
    onNewChat: () => {
        const newChat = handleNewChat();
        setActiveChatId(newChat.id);
        if (isMobile) setIsSidebarOpen(false);
    },
    onDeleteChat: handleDeleteChat,
    onRenameChat: handleRenameChat,
  };


  return (
    <>
      <AboutModal 
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
        onClearHistory={handleClearAllHistory}
      />
      <div className="flex h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans transition-colors duration-300 overflow-hidden">
        {isMobile ? (
          <>
            {isSidebarOpen && mode === 'chat' && (
              <>
                <div 
                  className="fixed inset-0 bg-black/60 z-30 animate-fade-in"
                  onClick={toggleSidebar}
                ></div>
                <div className="fixed top-0 left-0 h-full w-64 z-40 animate-slide-in-left">
                  <Sidebar {...sidebarProps} />
                </div>
              </>
            )}
          </>
        ) : (
          <div className={`shrink-0 transition-all duration-300 ease-in-out ${isSidebarOpen && mode === 'chat' ? 'w-64' : 'w-0'} overflow-hidden`}>
            <Sidebar {...sidebarProps} />
          </div>
        )}

        <div className="flex flex-col flex-1 min-w-0">
          <header className="bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-2 sm:p-4 shadow-sm flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
                  {mode === 'chat' && (
                      <button 
                          onClick={toggleSidebar}
                          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          aria-label="Toggle sidebar"
                      >
                          <MenuIcon className="w-6 h-6" />
                      </button>
                  )}
                  <div className="flex items-center space-x-3">
                      <BotIcon className="w-8 h-8 text-cyan-500 shrink-0" />
                      <div className="min-w-0">
                          <h1 className="text-lg sm:text-xl font-bold tracking-wider text-gray-900 dark:text-white">Cognix AI</h1>
                          {mode === 'chat' && activeChatId && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {chatHistory.find(c => c.id === activeChatId)?.title}
                              </p>
                          )}
                      </div>
                  </div>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                  <nav className="flex items-center bg-gray-200 dark:bg-gray-700/50 rounded-lg p-1">
                  <button
                      onClick={() => setMode('chat')}
                      className={`px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-medium rounded-md transition-colors duration-200 ${
                      mode === 'chat'
                          ? 'bg-cyan-500 text-white shadow'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-gray-600/50'
                      }`}
                  >
                      Chat
                  </button>
                  <button
                      onClick={() => setMode('image')}
                      className={`px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-medium rounded-md transition-colors duration-200 ${
                      mode === 'image'
                          ? 'bg-cyan-500 text-white shadow'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-gray-600/50'
                      }`}
                  >
                      Image
                  </button>
                  <button
                      onClick={() => setMode('live')}
                      className={`px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm font-medium rounded-md transition-colors duration-200 ${
                      mode === 'live'
                          ? 'bg-cyan-500 text-white shadow'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-gray-600/50'
                      }`}
                  >
                      Live
                  </button>
                  </nav>
                  <button
                      onClick={() => setIsAboutModalOpen(true)}
                      className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      aria-label="About Cognix AI"
                  >
                      <HelpCircleIcon className="w-5 h-5" />
                  </button>
                  <button
                      onClick={toggleTheme}
                      className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      aria-label="Toggle theme"
                  >
                      {theme === 'light' ? <MoonIcon className="w-5 h-5 fill-current" /> : <SunIcon className="w-5 h-5" />}
                  </button>
              </div>
          </header>
          <main className="flex-1 overflow-hidden">
              {renderContent()}
          </main>
        </div>
      </div>
    </>
  );
};

export default App;