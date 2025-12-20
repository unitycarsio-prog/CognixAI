
import React from 'react';
import type { ChatSession, Mode } from '../types';
import { BotIcon, TrashIcon, CoreChatIcon, LabIcon, CollectiveIcon, SparklesIcon } from './Icons';

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
  chatHistory, activeChatId, mode, onSetMode, onSelectChat, onNewChat, onDeleteChat, isSidebarOpen, isSidebarCollapsed, onToggleCollapse, onClose 
}) => {
  
  const NavItem: React.FC<{ m: Mode, icon: React.ReactNode, label: string }> = ({ m, icon, label }) => {
    const isActive = mode === m;
    return (
      <button
          onClick={() => { onSetMode(m); if(window.innerWidth < 1024) onClose(); }}
          title={isSidebarCollapsed ? label : ""}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group
              ${isActive 
                  ? 'bg-black text-white dark:bg-white dark:text-black shadow-[0_4px_16px_rgba(0,0,0,0.2)]' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40'}
              ${isSidebarCollapsed ? 'justify-center' : ''}
          `}
      >
          <span className={`shrink-0 transition-transform ${isActive ? 'scale-105 opacity-100' : 'opacity-70 group-hover:opacity-100 group-hover:scale-105'}`}>
            {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-5 h-5' }) : icon}
          </span>
          {!isSidebarCollapsed && <span className="text-[15px] font-bold tracking-tight">{label}</span>}
      </button>
    );
  };

  return (
    <>
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-[60] lg:hidden transition-opacity duration-300" onClick={onClose} />
      )}
      <aside className={`fixed lg:static inset-y-0 left-0 z-[70] transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) h-full bg-white dark:bg-[#0b0f1a] border-r border-slate-100 dark:border-slate-800 flex flex-col
        ${isSidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarCollapsed ? 'w-0 lg:w-16 overflow-hidden' : 'w-[260px]'}
      `}>
        <div className={`p-4 flex flex-col h-full ${isSidebarCollapsed ? 'items-center px-1' : ''}`}>
           <div className={`flex items-center gap-3 mb-8 select-none group cursor-pointer px-2 ${isSidebarCollapsed ? 'justify-center' : ''}`} onClick={onNewChat}>
              <BotIcon className="w-8 h-8 shadow-sm rounded-xl transition-all group-hover:scale-105" />
              {!isSidebarCollapsed && (
                <h2 className="text-xl font-bold tracking-tight text-black dark:text-white leading-none">CognixAI</h2>
              )}
           </div>

           <div className="space-y-4 mb-8">
              <nav className="space-y-1.5">
                <NavItem m="chat" icon={<CoreChatIcon />} label="Core Chat" />
                <NavItem m="toolbox" icon={<LabIcon />} label="Cognix Lab" />
                <NavItem m="community" icon={<CollectiveIcon />} label="Collective" />
              </nav>
           </div>

           <button 
             onClick={() => { onNewChat(); if(window.innerWidth < 1024) onClose(); }}
             className={`w-full flex items-center justify-center gap-2.5 px-3 py-3.5 bg-slate-100 dark:bg-slate-800 text-black dark:text-white rounded-2xl font-bold text-[14px] transition-all active:scale-[0.98] hover:bg-slate-200 dark:hover:bg-slate-700 mb-8 border border-slate-200 dark:border-slate-700 shadow-sm ${isSidebarCollapsed ? 'px-0 w-11 mx-auto' : ''}`}
           >
             {isSidebarCollapsed ? <SparklesIcon className="w-5 h-5" /> : <span>New Pulse</span>}
           </button>

           {!isSidebarCollapsed && (
             <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between px-2 mb-3">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Pulses</h3>
                </div>
                <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 -mr-1 scrollbar-hide pb-6">
                  {chatHistory.length === 0 ? (
                    <div className="px-4 py-8 text-center border border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                      <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">Vault Empty</p>
                    </div>
                  ) : (
                    chatHistory.map((chat) => (
                      <div key={chat.id} className="group relative">
                        <button 
                          onClick={() => { onSelectChat(chat.id); onSetMode('chat'); if(window.innerWidth < 1024) onClose(); }}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between
                            ${activeChatId === chat.id && mode === 'chat' 
                              ? 'bg-slate-50 dark:bg-slate-800/80 text-black dark:text-white font-bold' 
                              : 'text-slate-500 hover:text-black dark:hover:text-white hover:bg-slate-50/50 dark:hover:bg-slate-800/20'}
                          `}
                        >
                          <span className="text-[14px] truncate w-full tracking-tight font-medium">{chat.title}</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
             </div>
           )}

           <div className={`pt-4 border-t border-slate-100 dark:border-slate-800 mt-auto ${isSidebarCollapsed ? 'px-0' : ''}`}>
              {!isSidebarCollapsed ? (
                <div className="flex flex-col gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse"></div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Neural Link</span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400">11.2</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                </div>
              )}
           </div>
        </div>
      </aside>
    </>
  );
};
