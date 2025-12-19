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
        className={`w-full flex items-center gap-3.5 px-5 py-4 rounded-2xl transition-all duration-500
            ${mode === m 
                ? 'bg-blue-600 text-white shadow-[0_12px_24px_rgba(37,99,235,0.3)] scale-[1.02]' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-blue-600'}
        `}
    >
        <span className="shrink-0">{icon}</span>
        <span className="text-sm font-extrabold tracking-tight uppercase">{label}</span>
    </button>
  );

  return (
    <aside className={`fixed lg:static inset-y-0 left-0 z-50 transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1) h-full shrink-0 flex flex-col bg-slate-50 dark:bg-slate-950 border-r border-slate-100 dark:border-slate-800/50
      ${isSidebarOpen ? 'translate-x-0 w-[300px]' : '-translate-x-full lg:translate-x-0'}
      ${isDesktopSidebarOpen ? 'lg:w-[300px]' : 'lg:w-0 overflow-hidden border-none opacity-0'}
    `}>
      <div className="p-8">
        <div className="flex items-center gap-4 mb-12 group cursor-pointer" onClick={() => onSetMode('chat')}>
            <div className="w-12 h-12 bg-blue-600 rounded-[1.2rem] flex items-center justify-center text-white shadow-xl transition-transform duration-500 group-hover:scale-110">
                <BotIcon className="w-8 h-8" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter italic">CognixAI</h1>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600">V3.0 PRO</span>
            </div>
        </div>

        <button onClick={onNewChat} className="w-full flex items-center justify-center gap-3 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm hover:border-blue-500 hover:text-blue-600 transition-all active:scale-95">
          + New Neural Link
        </button>
      </div>
      
      <nav className="px-5 space-y-2 mb-10">
        <NavItem m="chat" icon={<SparklesIcon className="w-5 h-5" />} label="Hub" />
        <NavItem m="community" icon={<UsersIcon className="w-5 h-5" />} label="Collective" />
        <NavItem m="friends" icon={<UsersIcon className="w-5 h-5" />} label="Cognates" />
        <NavItem m="coding" icon={<CodeIcon className="w-5 h-5" />} label="Studio" />
        <NavItem m="live" icon={<MicrophoneIcon className="w-5 h-5" />} label="LiveTalk" />
        <NavItem m="memory" icon={<BotIcon className="w-5 h-5" />} label="Vault" />
      </nav>

      <div className="flex-1 overflow-y-auto px-5 custom-scrollbar pb-8">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-5 mb-5 flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-blue-600"></div> Session History
            </h3>
            <div className="space-y-1.5">
                {chatHistory.map((chat) => (
                    <div key={chat.id} onClick={() => { if(editingChatId !== chat.id) onSelectChat(chat.id); }}
                        className={`group relative flex items-center justify-between px-5 py-3.5 cursor-pointer rounded-xl transition-all
                        ${activeChatId === chat.id && mode === 'chat'
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-black border-l-4 border-blue-600'
                            : 'text-slate-500 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900'}
                        `}
                    >
                        {editingChatId === chat.id ? (
                            <input ref={inputRef} type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onBlur={handleRename} onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                                className="bg-transparent border-none w-full outline-none text-xs font-bold" />
                        ) : (
                            <>
                            <span className="truncate text-xs font-bold tracking-tight">{chat.title}</span>
                            <div className="hidden group-hover:flex items-center gap-1.5 absolute right-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm p-1.5 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
                                <button onClick={(e) => { e.stopPropagation(); setEditingChatId(chat.id); setNewTitle(chat.title); }} className="p-1 text-slate-400 hover:text-blue-500 transition-colors"><PencilIcon className="w-3.5 h-3.5"/></button>
                                <button onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }} className="p-1 text-slate-400 hover:text-red-500 transition-colors"><TrashIcon className="w-3.5 h-3.5"/></button>
                            </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
      </div>
      
      <div className="p-10 border-t border-slate-100 dark:border-slate-800/50">
          <p className="text-[10px] font-black text-slate-300 text-center uppercase tracking-[0.3em] leading-loose">
            Engineering by <br/> <span className="text-blue-600">Shashwat Ranjan Jha</span>
          </p>
      </div>
    </aside>
  );
};