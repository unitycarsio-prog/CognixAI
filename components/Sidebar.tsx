import React, { useState, useRef, useEffect } from 'react';
import type { ChatSession, Mode, ThemeColors, Friend } from '../types';
import { BotIcon, TrashIcon, PencilIcon, MicrophoneIcon, UsersIcon, CodeIcon, SparklesIcon } from './Icons';

interface SidebarProps {
  chatHistory: ChatSession[];
  activeChatId: string | null;
  mode: Mode;
  onSetMode: (mode: Mode) => void;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
  isSidebarOpen: boolean;
  isDesktopSidebarOpen: boolean;
  theme: ThemeColors;
  friends: Friend[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  chatHistory, activeChatId, mode, onSetMode, onSelectChat, onNewChat, onDeleteChat, onRenameChat, isSidebarOpen, isDesktopSidebarOpen, theme, friends,
}) => {
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingChatId && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
    }
  }, [editingChatId]);

  const handleRename = () => {
    if (editingChatId && newTitle.trim()) onRenameChat(editingChatId, newTitle.trim());
    setEditingChatId(null);
  };

  const NavItem: React.FC<{ m: Mode, icon: React.ReactNode, label: string }> = ({ m, icon, label }) => (
    <button
        onClick={() => onSetMode(m)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300
            ${mode === m 
                ? 'bg-blue-600 text-white shadow-[0_4px_15px_rgba(37,99,235,0.3)]' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-blue-600 shadow-none'}
        `}
    >
        <span className="shrink-0">{icon}</span>
        <span className="text-sm font-bold tracking-tight">{label}</span>
    </button>
  );

  return (
    <aside className={`fixed lg:static inset-y-0 left-0 z-50 transition-all duration-500 ease-in-out h-full shrink-0 flex flex-col bg-slate-50 dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800/50
      ${isSidebarOpen ? 'translate-x-0 w-[280px]' : '-translate-x-full lg:translate-x-0'}
      ${isDesktopSidebarOpen ? 'lg:w-[280px]' : 'lg:w-0 overflow-hidden border-none'}
    `}>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-10 group cursor-pointer" onClick={() => onSetMode('chat')}>
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-[0_8px_20px_rgba(37,99,235,0.4)] transition-transform duration-500 group-hover:scale-105">
                <BotIcon className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">CognixAI V3.0</h1>
        </div>

        <button onClick={onNewChat} className="w-full flex items-center justify-center gap-2 py-3.5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl font-bold transition-all hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-blue-500 hover:text-blue-600 active:scale-95 text-xs uppercase tracking-widest shadow-sm">
          + Initialize Request
        </button>
      </div>
      
      <nav className="px-4 space-y-1 mb-8">
        <NavItem m="chat" icon={<SparklesIcon className="w-5 h-5" />} label="Neural Hub" />
        <NavItem m="community" icon={<UsersIcon className="w-5 h-5" />} label="Collective" />
        <NavItem m="friends" icon={<UsersIcon className="w-5 h-5" />} label="Cognates" />
        <NavItem m="coding" icon={<CodeIcon className="w-5 h-5" />} label="Dev Studio" />
        <NavItem m="live" icon={<MicrophoneIcon className="w-5 h-5" />} label="Live Voice" />
        <NavItem m="memory" icon={<BotIcon className="w-5 h-5" />} label="Memory Vault" />
      </nav>

      <div className="flex-1 overflow-y-auto px-4 custom-scrollbar pb-6">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-4 mb-4 flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-blue-600"></div> Archive
            </h3>
            <div className="space-y-1">
                {chatHistory.map((chat) => (
                    <div key={chat.id} onClick={() => { if(editingChatId !== chat.id) onSelectChat(chat.id); }}
                        className={`group relative flex items-center justify-between px-4 py-3 cursor-pointer rounded-xl transition-all
                        ${activeChatId === chat.id && mode === 'chat'
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold border-l-4 border-blue-600'
                            : 'text-slate-500 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'}
                        `}
                    >
                        {editingChatId === chat.id ? (
                            <input ref={inputRef} type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onBlur={handleRename} onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                                className="bg-transparent border-none w-full outline-none text-sm font-medium" />
                        ) : (
                            <>
                            <span className="truncate text-sm font-medium">{chat.title}</span>
                            <div className="hidden group-hover:flex items-center gap-1 absolute right-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-1 rounded-lg">
                                <button onClick={(e) => { e.stopPropagation(); setEditingChatId(chat.id); setNewTitle(chat.title); }} className="p-1 text-slate-400 hover:text-blue-500 transition-colors"><PencilIcon className="w-3.5 h-3.5"/></button>
                                <button onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }} className="p-1 text-slate-400 hover:text-red-500 transition-colors"><TrashIcon className="w-3.5 h-3.5"/></button>
                            </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
      </div>
      
      <div className="p-8 border-t border-slate-100 dark:border-slate-800/50">
          <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-widest leading-loose">
            Engineering by <br/> <span className="text-blue-600 font-black">Shashwat Ranjan Jha</span>
          </p>
      </div>
    </aside>
  );
};