import React, { useState, useEffect, useMemo } from 'react';
import { ChatView } from './components/ChatView';
import { LiveView } from './components/LiveView';
import { Sidebar } from './components/Sidebar';
import { FriendsView } from './components/FriendsView';
import { ToolboxView } from './components/ToolboxView';
import { MemoryView } from './components/MemoryView';
import { AboutUs } from './components/AboutUs';
import { CodingView } from './components/CodingView';
import { CommunityView } from './components/CommunityView';
import { MenuIcon, UserIcon } from './components/Icons';
import { SettingsModal } from './components/SettingsModal';
import { GoogleGenAI } from "@google/genai";
import type { ChatMessage, ChatSession, Mode, UIStyle, AccentColor, ThemeColors, FontSize, Friend, ModelType } from './types';

const THEMES: Record<AccentColor, ThemeColors> = {
    blue: { primary: 'bg-blue-600', primaryHover: 'hover:bg-blue-700', text: 'text-blue-600', textDark: 'text-blue-400', bgSoft: 'bg-blue-50', darkBgSoft: 'dark:bg-blue-900/20', border: 'border-blue-600', ring: 'focus:ring-blue-600', gradient: 'bg-gradient-to-r from-blue-600 to-blue-400' },
    violet: { primary: 'bg-violet-600', primaryHover: 'hover:bg-violet-700', text: 'text-violet-600', textDark: 'text-violet-400', bgSoft: 'bg-violet-50', darkBgSoft: 'dark:bg-violet-900/20', border: 'border-violet-600', ring: 'focus:ring-violet-600', gradient: 'bg-gradient-to-r from-violet-600 to-purple-500' },
    emerald: { primary: 'bg-emerald-600', primaryHover: 'hover:bg-emerald-700', text: 'text-emerald-600', textDark: 'text-emerald-400', bgSoft: 'bg-emerald-50', darkBgSoft: 'dark:bg-emerald-900/20', border: 'border-emerald-600', ring: 'focus:ring-emerald-600', gradient: 'bg-gradient-to-r from-emerald-600 to-teal-500' },
    rose: { primary: 'bg-rose-600', primaryHover: 'hover:bg-rose-700', text: 'text-rose-600', textDark: 'text-rose-400', bgSoft: 'bg-rose-50', darkBgSoft: 'dark:bg-violet-900/20', border: 'border-rose-600', ring: 'focus:ring-rose-600', gradient: 'bg-gradient-to-r from-rose-600 to-pink-500' },
    amber: { primary: 'bg-amber-600', primaryHover: 'hover:bg-amber-700', text: 'text-amber-600', textDark: 'text-amber-400', bgSoft: 'bg-amber-50', darkBgSoft: 'dark:bg-amber-900/20', border: 'border-amber-600', ring: 'focus:ring-amber-600', gradient: 'bg-gradient-to-r from-amber-600 to-orange-500' },
};

const App: React.FC = () => {
  const [mode, setMode] = useState<Mode>('chat');
  const [accentColor, setAccentColor] = useState<AccentColor>('blue');
  const [activeModel, setActiveModel] = useState<ModelType>('gemini-3-pro-preview');
  const [systemInstruction, setSystemInstruction] = useState("You are CognixAI V3.0 pro, a superior intelligence engine. Always respond with high technical clarity, precision, and helpfulness. You are sleek, modern, and highly capable.");
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('cognix_history');
    if (savedHistory) setChatHistory(JSON.parse(savedHistory));
    const savedFriends = localStorage.getItem('cognix_friends');
    if (savedFriends) setFriends(JSON.parse(savedFriends));
    const savedTheme = localStorage.getItem('cognix_theme');
    if (savedTheme === 'dark') { setIsDarkMode(true); document.documentElement.classList.add('dark'); }
  }, []);

  useEffect(() => localStorage.setItem('cognix_history', JSON.stringify(chatHistory)), [chatHistory]);
  useEffect(() => localStorage.setItem('cognix_friends', JSON.stringify(friends)), [friends]);
  useEffect(() => {
    if (isDarkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('cognix_theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('cognix_theme', 'light'); }
  }, [isDarkMode]);

  const currentChat = useMemo(() => chatHistory.find(c => c.id === activeChatId), [chatHistory, activeChatId]);
  const activeTheme = useMemo(() => THEMES[accentColor], [accentColor]);

  useEffect(() => { setMessages(currentChat ? currentChat.messages : []); }, [currentChat?.id]);

  const handleNewChat = () => { setActiveChatId(null); setMessages([]); setMode('chat'); if (window.innerWidth < 1024) setIsSidebarOpen(false); };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-slate-50 dark:bg-slate-950 transition-all font-sans relative">
      <Sidebar 
        chatHistory={chatHistory} activeChatId={activeChatId} mode={mode}
        onSetMode={(m) => { setMode(m); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
        onSelectChat={(id) => { setActiveChatId(id); setMode('chat'); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
        onNewChat={handleNewChat}
        onDeleteChat={(id) => { setChatHistory(h => h.filter(c => c.id !== id)); if (activeChatId === id) { setActiveChatId(null); setMessages([]); } }}
        onRenameChat={(id, t) => setChatHistory(h => h.map(c => c.id === id ? { ...c, title: t } : c))}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isSidebarOpen={isSidebarOpen} isDesktopSidebarOpen={isDesktopSidebarOpen} theme={activeTheme} friends={friends}
      />

      <div className={`flex-1 flex flex-col h-full bg-white dark:bg-slate-900 transition-all duration-500 overflow-hidden relative shadow-2xl ${isDesktopSidebarOpen ? 'lg:rounded-l-[2.5rem]' : ''}`}>
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 shrink-0 z-30 border-b border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
             <div className="flex items-center gap-2 sm:gap-4">
                <button onClick={() => window.innerWidth >= 1024 ? setIsDesktopSidebarOpen(!isDesktopSidebarOpen) : setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all">
                    <MenuIcon className="w-5 h-5"/>
                </button>
                <div className="flex items-center gap-2">
                  <h1 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 sm:gap-2">
                      {mode} <span className="text-blue-600 opacity-50">/</span> cognix.v3.pro
                  </h1>
                  <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse shadow-[0_0_8px_#2563EB]"></div>
                </div>
             </div>
             <div className="flex items-center gap-2 sm:gap-3">
                 <button onClick={() => setIsSettingsOpen(true)} className="p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 hover:border-blue-600 transition-all shadow-sm">
                    <UserIcon className="w-5 h-5"/>
                 </button>
             </div>
        </header>

        <main className="flex-1 relative overflow-hidden animate-fade-in bg-white dark:bg-slate-900">
            {mode === 'chat' && (
                <ChatView messages={messages} setMessages={setMessages} uiStyle={'modern'} theme={activeTheme} fontSize={'normal'} systemInstruction={systemInstruction} model={activeModel} setActiveModel={setActiveModel} friends={friends} />
            )}
            {mode === 'live' && <LiveView theme={activeTheme} />}
            {mode === 'friends' && <FriendsView friends={friends} setFriends={setFriends} />}
            {mode === 'community' && <CommunityView theme={activeTheme} model={activeModel} />}
            {mode === 'coding' && <CodingView theme={activeTheme} model={activeModel} />}
            {mode === 'memory' && <MemoryView theme={activeTheme} />}
            {mode === 'about' && <AboutUs />}
        </main>
      </div>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} uiStyle={'modern'} setUiStyle={() => {}} accentColor={accentColor} setAccentColor={setAccentColor} fontSize={'normal'} setFontSize={() => {}} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} onClearHistory={() => { setChatHistory([]); setMessages([]); setActiveChatId(null); setIsSettingsOpen(false); }} systemInstruction={systemInstruction} setSystemInstruction={setSystemInstruction} />
    </div>
  );
}

export default App;