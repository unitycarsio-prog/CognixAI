
import React, { useState, useEffect } from 'react';
import { ChatView } from './components/ChatView';
import { LiveView } from './components/LiveView';
import { BotIcon, SunIcon, MoonIcon, NewChatIcon } from './components/Icons';
import type { ChatMessage } from './types';

type Mode = 'chat' | 'live';
type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('chat');
  
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) return savedTheme;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const savedMessages = localStorage.getItem('chatHistory');
      return savedMessages ? JSON.parse(savedMessages) : [];
      // FIX: Added curly braces to the catch block to fix syntax error.
    } catch (error) {
      console.error("Failed to parse chat history from localStorage", error);
      return [];
    }
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'light' ? 'dark' : 'light');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(messages));
  }, [messages]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const startNewChat = () => {
    if (mode === 'chat') {
        setMessages([]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans transition-colors duration-300">
      <header className="bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 p-4 shadow-sm flex justify-between items-center shrink-0">
        <div className="flex items-center space-x-3">
          <BotIcon className="w-8 h-8 text-cyan-500" />
          <div>
            <h1 className="text-xl font-bold tracking-wider text-gray-900 dark:text-white">Cognix AI</h1>
          </div>
        </div>
        <div className="flex items-center space-x-2">
            <nav className="flex items-center bg-gray-200 dark:bg-gray-700/50 rounded-lg p-1">
              <button
                onClick={() => setMode('chat')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 ${
                  mode === 'chat'
                    ? 'bg-cyan-500 text-white shadow'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-gray-600/50'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setMode('live')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 ${
                  mode === 'live'
                    ? 'bg-cyan-500 text-white shadow'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300/50 dark:hover:bg-gray-600/50'
                }`}
              >
                Live
              </button>
            </nav>
            <button
                onClick={startNewChat}
                disabled={mode !== 'chat'}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="New Chat"
            >
                <NewChatIcon className="w-5 h-5" />
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
        {mode === 'chat' ? <ChatView messages={messages} setMessages={setMessages} /> : <LiveView />}
      </main>
    </div>
  );
};

export default App;