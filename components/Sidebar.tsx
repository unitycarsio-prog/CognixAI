
import React, { useState, useRef, useEffect } from 'react';
import type { ChatSession, Mode } from '../types';
import { NewChatIcon, TrashIcon, PencilIcon, MicrophoneIcon, BotIcon, ImageIcon } from './Icons';

interface SidebarProps {
  chatHistory: ChatSession[];
  activeChatId: string | null;
  mode: Mode;
  onSetMode: (mode: Mode) => void;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chatHistory,
  activeChatId,
  mode,
  onSetMode,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRenameChat,
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

  const handleStartEditing = (chat: ChatSession) => {
    setEditingChatId(chat.id);
    setNewTitle(chat.title);
  };
  
  const handleRename = () => {
    if (editingChatId && newTitle.trim()) {
        onRenameChat(editingChatId, newTitle.trim());
    }
    setEditingChatId(null);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleRename();
    } else if (e.key === 'Escape') {
        setEditingChatId(null);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onDeleteChat(id);
  };

  return (
    <aside className="flex flex-col h-full text-gray-800 dark:text-gray-200">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8 px-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <BotIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                Cognix
            </span>
        </div>

        <button
          onClick={onNewChat}
          className="w-full group flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
        >
          <NewChatIcon className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span>New Chat</span>
        </button>
      </div>
      
      <div className="px-4 mb-6 space-y-1">
        <button
            onClick={() => onSetMode('live')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                mode === 'live'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
        >
            <MicrophoneIcon className={`w-5 h-5 ${mode === 'live' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} />
            Live Conversation
        </button>
        <button
            onClick={() => onSetMode('image')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                mode === 'image'
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
        >
            <ImageIcon className={`w-5 h-5 ${mode === 'image' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} />
            Imagen 1
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 no-scrollbar">
        <h3 className="px-4 mb-3 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Recent Chats</h3>
        <div className="space-y-1">
            {chatHistory.map((chat) => (
            <div
                key={chat.id}
                onClick={() => editingChatId !== chat.id && onSelectChat(chat.id)}
                className={`group relative flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
                activeChatId === chat.id && mode === 'chat'
                    ? 'bg-white dark:bg-gray-800 shadow-sm text-gray-900 dark:text-white font-medium border border-gray-200 dark:border-gray-700'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200 border border-transparent'
                }`}
            >
                {editingChatId === chat.id ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleRename}
                        className="w-full bg-transparent focus:outline-none text-sm border-b border-blue-600 py-0.5"
                    />
                ) : (
                    <>
                        <span className="truncate text-sm pr-8">{chat.title}</span>
                        <div className="absolute right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-white dark:bg-gray-800 shadow-sm rounded-lg p-0.5 border border-gray-100 dark:border-gray-700">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleStartEditing(chat); }}
                                className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                            >
                                <PencilIcon className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={(e) => handleDelete(e, chat.id)}
                                className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <TrashIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </>
                )}
            </div>
            ))}
        </div>
      </div>
    </aside>
  );
};
