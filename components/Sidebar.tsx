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
      <aside className={`fixed lg:static inset-y-0 left-0 z-[70] transition-all duration-500 h-full bg-white dark:bg-[#020617] border-r border-slate-200 dark:border-slate-800 flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarCollapsed ? 'w-24' : 'w-[280px]'}
      `}>
        <div className="flex flex-col h-full">
           <div className="p-6 pb-0 flex items-center justify-between mb-8">
               <div className="flex items-center gap-3 select-none">
                <div className="w-9 h-9 rounded-xl bg-slate-950 dark:bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/10">
                  <BotIcon className="w-5 h-5 text-white" />
                </div>
                {!isSidebarCollapsed && (
                  <div className="flex flex-col">
                    <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white leading-tight transition-colors">Cognix<span className="text-violet-500 font-medium">Pro</span></h2>
                    <span className="text-[9px] font-mono font-bold text-slate-400 tracking-[0.2em] uppercase leading-none mt-0.5 opacity-60">Engine v8.2</span>
                  </div>
                )}
              </div>
              <button 
                onClick={onToggleCollapse}
                className="hidden lg:flex w-7 h-7 items-center justify-center text-slate-400 hover:text-violet-500 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-all"
              >
                {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
              </button>
           </div>

           <div className="flex-1 overflow-y-auto no-scrollbar px-6 space-y-8">
              <div>
                <h3 className={`text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 ${isSidebarCollapsed ? 'text-center' : ''}`}>Navigation</h3>
                <nav className="space-y-1">
                  <NavItem m="chat" icon={<MessageSquare size={18} />} label="Workspace" />
                  <NavItem m="toolbox" icon={<Zap size={18} />} label="AI Modules" />
                  <NavItem m="memory" icon={<Database size={18} />} label="Knowledge Base" />
                </nav>
              </div>

              {!isSidebarCollapsed && (
                <div className="min-h-0 flex flex-col">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Threads</h3>
                      <button 
                        onClick={onNewChat}
                        className="p-1 text-slate-400 hover:text-violet-500 transition-colors"
                        title="New Chat"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <div className="space-y-1 custom-scrollbar pb-6">
                      {chatHistory.map((chat) => (
                        <button 
                          key={chat.id}
                          onClick={() => { onSelectChat(chat.id); onSetMode('chat'); if(window.innerWidth < 1024) onClose(); }}
                          className={`w-full text-left px-4 py-2.5 rounded-xl transition-all flex items-center gap-3 group border
                            ${activeChatId === chat.id && mode === 'chat' 
                              ? 'bg-violet-50/80 dark:bg-violet-900/10 border-violet-100/50 dark:border-violet-900/30 text-violet-700 dark:text-violet-400 font-bold' 
                              : 'text-slate-500 dark:text-slate-400 border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900'}
                          `}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeChatId === chat.id && mode === 'chat' ? 'bg-violet-500' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                          <span className="text-sm truncate flex-1">{chat.title}</span>
                        </button>
                      ))}
                    </div>
                </div>
              )}
           </div>

           <div className={`mt-auto p-6 space-y-4 border-t border-slate-100 dark:border-slate-900 ${isSidebarCollapsed ? 'items-center' : ''}`}>
              <button 
                onClick={onNewChat}
                className={`w-full flex items-center justify-center gap-3 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all hover:translate-y-[-2px] active:translate-y-0 shadow-lg shadow-slate-900/20 dark:shadow-white/5
                  ${isSidebarCollapsed ? 'w-12 h-12 p-0' : ''}
                `}
              >
                <Plus size={20} />
                {!isSidebarCollapsed && <span>Initialize Session</span>}
              </button>

              {!isSidebarCollapsed && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                       {[1,2,3].map(i => (
                         <div key={i} className="w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-500">
                            {String.fromCharCode(64 + i)}
                         </div>
                       ))}
                    </div>

                  </div>
                </div>
              )}
           </div>
        </div>
      </aside>
    </>
  );
};
