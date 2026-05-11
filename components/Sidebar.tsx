import React from 'react';
import type { ChatSession, Mode } from '../types';
import { BotIcon } from './Icons';
import { 
  MessageSquare, 
  Image as ImageIcon, 
  Zap, 
  Users, 
  Database, 
  Plus, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Search,
  MessageCircle
} from 'lucide-react';

interface SidebarProps {
  chatHistory: ChatSession[];
  activeChatId: string | null;
  mode: Mode;
  onSetMode: (mode: Mode) => void;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  onToggleCollapse: () => void;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  chatHistory, activeChatId, mode, onSetMode, onSelectChat, onNewChat, isSidebarOpen, isSidebarCollapsed, onToggleCollapse, onClose 
}) => {
  
  const NavItem: React.FC<{ m: Mode, icon: React.ReactNode, label: string }> = ({ m, icon, label }) => {
    const isActive = mode === m;
    return (
      <button
          onClick={() => { onSetMode(m); if(window.innerWidth < 1024) onClose(); }}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group
              ${isActive 
                  ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md' 
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-cognix-900'}
          `}
      >
          <span className={`shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'scale-110' : ''}`}>
            {icon}
          </span>
          {!isSidebarCollapsed && <span className="text-sm font-bold tracking-tight">{label}</span>}
      </button>
    );
  };

  return (
    <>
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] lg:hidden" onClick={onClose} />
      )}
      <aside className={`fixed lg:static inset-y-0 left-0 z-[70] transition-all duration-500 h-full bg-slate-50 dark:bg-cognix-950 border-r border-slate-200 dark:border-cognix-900 flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarCollapsed ? 'w-24' : 'w-[280px]'}
      `}>
        <div className="p-6 flex flex-col h-full">
           <div className="flex items-center justify-between mb-10 px-2">
              <div className="flex items-center gap-3 select-none">
                <BotIcon className="w-9 h-9" />
                {!isSidebarCollapsed && (
                  <div className="flex flex-col">
                    <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Cognix<span className="text-slate-500 font-medium">Pro</span></h2>
                    <span className="text-[9px] font-mono font-bold text-slate-400 tracking-[0.2em] uppercase leading-none mt-0.5">Enterprise Edition</span>
                  </div>
                )}
              </div>
              <button 
                onClick={onToggleCollapse}
                className="hidden lg:flex w-8 h-8 items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-cognix-900 rounded-lg transition-colors"
              >
                {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
           </div>

           <div className="space-y-6 mb-8 flex-1 overflow-y-auto no-scrollbar">
              <nav className="space-y-1.5">
                <NavItem m="chat" icon={<MessageSquare size={18} />} label="Workspace" />
                <NavItem m="imagine" icon={<ImageIcon size={18} />} label="Studio" />
                <NavItem m="toolbox" icon={<Zap size={18} />} label="Modules" />
                <NavItem m="community" icon={<Users size={18} />} label="Network" />
                <NavItem m="memory" icon={<Database size={18} />} label="Knowledge" />
              </nav>

              {!isSidebarCollapsed && (
                <div className="pt-6 border-t border-slate-100 dark:border-cognix-900 flex-1 flex flex-col min-h-0">
                    <div className="px-4 mb-4 flex items-center justify-between">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">History</h3>
                      <button 
                        onClick={onNewChat}
                        className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="New Chat"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1 px-1 custom-scrollbar pb-6">
                      {chatHistory.map((chat) => (
                        <button 
                          key={chat.id}
                          onClick={() => { onSelectChat(chat.id); onSetMode('chat'); if(window.innerWidth < 1024) onClose(); }}
                          className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 group
                            ${activeChatId === chat.id && mode === 'chat' 
                              ? 'bg-slate-100 dark:bg-cognix-900 text-slate-900 dark:text-white font-bold border border-slate-200 dark:border-cognix-800 shadow-sm' 
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-cognix-950'}
                          `}
                        >
                          <MessageCircle size={14} className={`shrink-0 ${activeChatId === chat.id && mode === 'chat' ? 'text-blue-500' : 'text-slate-300'}`} />
                          <span className="text-sm truncate flex-1">{chat.title}</span>
                        </button>
                      ))}
                      {chatHistory.length === 0 && (
                        <div className="py-8 px-4 text-center">
                          <p className="text-xs text-slate-400 italic">No historical data.</p>
                        </div>
                      )}
                    </div>
                </div>
              )}
           </div>

           <div className={`mt-auto space-y-4 ${isSidebarCollapsed ? 'items-center' : ''}`}>
              <button 
                onClick={onNewChat}
                className={`w-full flex items-center justify-center gap-3 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-xs uppercase tracking-widest transition-all hover:bg-slate-800 dark:hover:bg-slate-100 shadow-lg active:scale-95
                  ${isSidebarCollapsed ? 'w-10 h-10 p-0' : ''}
                `}
              >
                <Plus size={18} />
                {!isSidebarCollapsed && <span>New Session</span>}
              </button>

              {!isSidebarCollapsed && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-cognix-900 border border-slate-100 dark:border-cognix-800">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"></div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">System Secure</span>
                  </div>
                </div>
              )}
           </div>
        </div>
      </aside>
    </>
  );
};
