import React from 'react';
import type { ChatSession, Mode } from '../types';
import { BotIcon, TrashIcon, SparklesIcon, UsersIcon } from './Icons';

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
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
              ${isActive 
                  ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg' 
                  : 'text-slate-800 hover:text-black hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60'}
              ${isSidebarCollapsed ? 'justify-center' : ''}
          `}
      >
          <span className={`shrink-0 transition-transform ${isActive ? 'scale-100' : 'group-hover:scale-110 opacity-70 group-hover:opacity-100'}`}>
            {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4' }) : icon}
          </span>
          {!isSidebarCollapsed && <span className="text-[14px] font-bold tracking-tight">{label}</span>}
      </button>
    );
  };

  return (
    <>
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] lg:hidden transition-opacity duration-300" onClick={onClose} />
      )}
      <aside className={`fixed lg:static inset-y-0 left-0 z-[70] transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) h-full bg-white dark:bg-[#0b0f1a] border-r border-slate-300 dark:border-slate-800 flex flex-col
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarCollapsed ? 'w-0 lg:w-20 overflow-hidden' : 'w-[280px]'}
      `}>
        <div className={`p-6 flex flex-col h-full ${isSidebarCollapsed ? 'items-center px-2' : ''}`}>
           <div className={`flex items-center gap-3 mb-10 select-none group cursor-pointer px-1 ${isSidebarCollapsed ? 'justify-center' : ''}`} onClick={onNewChat}>
              <BotIcon className="w-10 h-10 shadow-md rounded-full transition-all group-hover:scale-105" />
              {!isSidebarCollapsed && (
                <div className="flex flex-col">
                  <h2 className="text-xl font-bold tracking-tight text-black dark:text-white leading-none">Cognix</h2>
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-black dark:text-slate-500 mt-1">Intelligence Hub</span>
                </div>
              )}
           </div>

           <div className="space-y-6 mb-10">
              <div>
                {!isSidebarCollapsed && <h3 className="text-[11px] font-bold text-black dark:text-slate-400 uppercase tracking-widest px-3 mb-3">Navigation</h3>}
                <nav className="space-y-1">
                  <NavItem m="chat" icon={<SparklesIcon />} label="Core Chat" />
                  <NavItem m="toolbox" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.628.288a2 2 0 01-1.647 0l-.628-.288a6 6 0 00-3.86-.517l-2.387.477a2 2 0 00-1.022.547V18.5a2 2 0 001.106 1.789l2.387 1.193a4 4 0 001.789.418h4.818a4 4 0 001.789-.418l2.387-1.193a2 2 0 001.106-1.789v-3.072zM4.5 9V5.25A2.25 2.25 0 016.75 3h10.5A2.25 2.25 0 0119.5 5.25V9"/></svg>} label="Cognix Lab" />
                  <NavItem m="community" icon={<UsersIcon />} label="Collective" />
                </nav>
              </div>
           </div>

           <button 
             onClick={() => { onNewChat(); if(window.innerWidth < 1024) onClose(); }}
             className={`w-full flex items-center justify-center gap-2 px-5 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm transition-all active:scale-[0.98] hover:opacity-90 mb-8 shadow-md ${isSidebarCollapsed ? 'px-0 w-12 mx-auto' : ''}`}
           >
             {isSidebarCollapsed ? <SparklesIcon className="w-4 h-4" /> : <span>New Session</span>}
           </button>

           {!isSidebarCollapsed && (
             <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between px-3 mb-4">
                  <h3 className="text-[11px] font-bold text-black dark:text-slate-400 uppercase tracking-widest">Recent Pulses</h3>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 pr-2 -mr-2 scrollbar-hide pb-8">
                  {chatHistory.length === 0 ? (
                    <div className="px-6 py-12 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl">
                      <p className="text-[12px] text-slate-600 dark:text-slate-400 font-medium italic opacity-60">Vault empty</p>
                    </div>
                  ) : (
                    chatHistory.map((chat) => (
                      <div key={chat.id} className="group relative px-1">
                        <button 
                          onClick={() => { onSelectChat(chat.id); onSetMode('chat'); if(window.innerWidth < 1024) onClose(); }}
                          className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between
                            ${activeChatId === chat.id && mode === 'chat' 
                              ? 'bg-slate-100 dark:bg-slate-800 text-black dark:text-white font-bold' 
                              : 'text-slate-700 dark:text-slate-400 hover:text-black dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/40'}
                          `}
                        >
                          <span className="text-[13px] truncate w-full tracking-tight">{chat.title}</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteChat(chat.id); }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-600 transition-all"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
             </div>
           )}

           <div className={`pt-6 border-t border-slate-300 dark:border-slate-800 mt-auto ${isSidebarCollapsed ? 'px-0' : ''}`}>
              {!isSidebarCollapsed ? (
                <div className="flex flex-col gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-slate-800 dark:bg-slate-300"></div>
                      <span className="text-[10px] font-bold text-black dark:text-slate-300 uppercase tracking-tight">System Ready</span>
                    </div>
                    <span className="text-[9px] font-mono text-slate-600 dark:text-slate-500 font-bold">11.0</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="w-2 h-2 rounded-full bg-slate-800 dark:bg-slate-300"></div>
                </div>
              )}
           </div>
        </div>
      </aside>
    </>
  );
};