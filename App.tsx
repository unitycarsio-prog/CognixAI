
import React, { useState, useEffect, useMemo } from 'react';
import { ChatView } from './components/ChatView';
import { Sidebar } from './components/Sidebar';
import { AboutModal } from './components/AboutModal';
import { BotIcon, SunIcon, MoonIcon, MenuIcon, HelpCircleIcon } from './components/Icons';
import type { ChatMessage, ChatSession, Mode } from './types';
import { LiveView } from './components/LiveView';

type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 768);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mode, setMode] = useState<Mode>('chat');
  
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
    const handleResize = () => {
      const mobileState = window.innerWidth < 768;
      setIsMobile(mobileState);
      if (!mobileState) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (chatHistory.length > 0) {
      if (!activeChatId || !chatHistory.find(c => c.id === activeChatId)) {
        setActiveChatId(chatHistory[0].id);
      }
    } else {
      const newChat = handleNewChat(false); // don't open sidebar on initial create
      setActiveChatId(newChat.id);
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
    localStorage.setItem('chatHistoryV2', JSON.stringify(chatHistory));
  }, [chatHistory]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };
  
  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const handleNewChat = (openSidebar = true) => {
    const newChat: ChatSession = {
      id: `chat-${Date.now()}`,
      title: 'New Chat',
      messages: [],
    };
    setChatHistory(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    if (openSidebar && !isMobile) setIsSidebarOpen(true);
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
      case 'live':
        return <LiveView />;
      case 'chat':
      default:
        return (
          <ChatView 
            key={activeChatId}
            messages={activeChatMessages} 
            setMessages={setMessagesForActiveChat} 
          />
        );
    }
  }

  const sidebarProps = {
    chatHistory,
    activeChatId,
    mode,
    onSetMode: (newMode: Mode) => {
        setMode(newMode);
        if (isMobile) setIsSidebarOpen(false);
    },
    onSelectChat: (id: string) => {
        setMode('chat');
        setActiveChatId(id);
        if (isMobile) setIsSidebarOpen(false);
    },
    onNewChat: () => {
        setMode('chat');
        handleNewChat();
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
            {isSidebarOpen && (
              <>
                <div 
                  className="fixed inset-0 bg-black/60 z-30 animate-fade-in"
                  onClick={toggleSidebar}
                ></div>
                <div className="fixed top-0 left-0 h-full w-64 z-40 animate-slide-in-left bg-gray-50 dark:bg-gray-800/80 backdrop-blur-sm">
                  <Sidebar {...sidebarProps} />
                </div>
              </>
            )}
          </>
        ) : (
          <div className={`shrink-0 transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-0'} overflow-hidden`}>
            <Sidebar {...sidebarProps} />
          </div>
        )}

        <div className="flex flex-col flex-1 min-w-0">
          <header className="bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-2 sm:p-3 shadow-sm flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
                  <button 
                      onClick={toggleSidebar}
                      className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      aria-label="Toggle sidebar"
                  >
                      <MenuIcon className="w-6 h-6" />
                  </button>
                  <div className="flex items-center space-x-2">
                      <BotIcon className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-500 shrink-0" />
                      <div className="min-w-0">
                          <h1 className="text-base sm:text-lg font-bold tracking-wider text-gray-900 dark:text-white">Cognix AI</h1>
                          {activeChatId && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {mode === 'live' ? 'Live Conversation' : chatHistory.find(c => c.id === activeChatId)?.title}
                              </p>
                          )}
                      </div>
                  </div>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
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