
import React, { useState, useRef, useEffect } from 'react';
import type { ChatSession } from '../types';
import { NewChatIcon, TrashIcon, PencilIcon } from './Icons';

interface SidebarProps {
  chatHistory: ChatSession[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onDeleteChat: (id: string) => void;
  onRenameChat: (id: string, newTitle: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chatHistory,
  activeChatId,
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
    <aside className="w-64 bg-gray-50 dark:bg-gray-800/50 flex flex-col h-full border-r border-gray-200 dark:border-gray-700 shrink-0 overflow-hidden">
      <div className="p-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          <NewChatIcon className="w-5 h-5" />
          New Chat
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {chatHistory.map((chat) => (
          <div
            key={chat.id}
            onClick={() => editingChatId !== chat.id && onSelectChat(chat.id)}
            className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
              activeChatId === chat.id
                ? 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-800 dark:text-cyan-200'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
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
                    className="w-full bg-transparent focus:outline-none text-sm font-medium border-b border-cyan-500"
                />
            ) : (
                <>
                    <span className="truncate text-sm font-medium">{chat.title}</span>
                    <div className="flex items-center shrink-0">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleStartEditing(chat); }}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 text-gray-500 hover:text-cyan-500 focus:opacity-100 transition-opacity"
                            aria-label="Rename chat"
                        >
                            <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => handleDelete(e, chat.id)}
                            className="p-1 rounded opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 focus:opacity-100 transition-opacity"
                            aria-label="Delete chat"
                        >
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                </>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
};
