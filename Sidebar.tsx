import React from 'react';
import type { ChatSession, Mode } from '../types';
import { BotIcon, CoreChatIcon, LabIcon, CollectiveIcon } from './Icons';

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
  chatHistory, activeChatId, mode, onSetMode, onSelectChat, onNewChat, isSidebarOpen, isSidebarCollapsed, onClose 
}) => {
  
  const NavItem: React.FC<{ m: Mode, icon: React.ReactNode, label: string }> = ({ m, icon, label }) => {
    const isActive = mode === m;
    return (
      <button
          onClick={() => { onSetMode(m); if(window.innerWidth < 1024) onClose(); }}
          className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-xl transition-all duration-200
              ${isActive 
                  ? 'bg-black text-white' 
                  : 'text-[#64748b] hover:text-black hover:bg-slate-50'}
          `}
      >
          <span className="shrink-0">
            {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-5 h-5' }) : icon}
          </span>
          {!isSidebarCollapsed && <span className="text-[14px] font-bold tracking-tight">{label}</span>}
      </button>
    );
  };

  return (
    <>
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/5 z-[60] lg:hidden" onClick={onClose} />
      )}
      <aside className={`fixed lg:static inset-y-0 left-0 z-[70] transition-all duration-300 h-full bg-white border-r border-slate-100 flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isSidebarCollapsed ? 'w-20' : 'w-[280px]'}
      `}>
        <div className="p-6 flex flex-col h-full">
           <div className="flex items-center gap-3 mb-10 px-2 select-none">
              <BotIcon className="w-10 h-10" />
              {!isSidebarCollapsed && (
                <h2 className="text-[20px] font-bold tracking-tight text-black">CognixAi</h2>
              )}
           </div>

           <div className="space-y-2 mb-10">
              <nav className="space-y-1">
                <NavItem m="chat" icon={<CoreChatIcon />} label="Core Chat" />
                <NavItem m="toolbox" icon={<LabIcon />} label="Cognix Lab" />
                <NavItem m="community" icon={<CollectiveIcon />} label="Collective" />
              </nav>
           </div>

           <button 
             onClick={() => { onNewChat(); if(window.innerWidth < 1024) onClose(); }}
             className={`w-full flex items-center justify-center py-4 bg-[#f1f5f9] text-black rounded-2xl font-bold text-[14px] transition-all hover:bg-[#e2e8f0] mb-12`}
           >
             {!isSidebarCollapsed ? "New Pulse" : "+"}
           </button>

           {!isSidebarCollapsed && (
             <div className="flex-1 flex flex-col min-h-0">
                <div className="px-2 mb-4">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Pulses</h3>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar pb-6">
                  {chatHistory.map((chat) => (
                    <button 
                      key={chat.id}
                      onClick={() => { onSelectChat(chat.id); onSetMode('chat'); if(window.innerWidth < 1024) onClose(); }}
                      className={`w-full text-left px-4 py-2.5 rounded-xl transition-all flex items-center justify-between
                        ${activeChatId === chat.id && mode === 'chat' 
                          ? 'bg-[#f8fafc] text-black font-semibold border border-slate-100' 
                          : 'text-[#64748b] hover:text-black hover:bg-slate-50'}
                      `}
                    >
                      <span className="text-[13px] truncate">{chat.title}</span>
                    </button>
                  ))}
                </div>
             </div>
           )}

           <div className={`pt-4 border-t border-slate-100 mt-auto ${isSidebarCollapsed ? 'hidden' : ''}`}>
              <div className="flex items-center justify-between p-3 rounded-2xl bg-[#f8fafc] border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                  <span className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest">Neural Link</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400">11.2</span>
              </div>
           </div>
        </div>
      </aside>
    </>
  );
};