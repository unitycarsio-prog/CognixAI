
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, ChatPart, SearchResult } from '../types';
import { ai } from '../services/gemini';
import { BotIcon, SendIcon, SearchIcon, UserIcon } from './Icons';

const SuggestionCard: React.FC<{
    title: string;
    subtitle: string;
    onClick: () => void;
}> = ({ title, subtitle, onClick }) => (
    <button 
        onClick={onClick} 
        className="group relative flex flex-col items-start p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl hover:bg-white dark:hover:bg-gray-800 hover:border-blue-200 dark:hover:border-blue-900 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 text-left w-full h-full"
    >
        <span className="font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{title}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{subtitle}</span>
    </button>
);

const TypingEffect: React.FC<{ text: string }> = ({ text }) => {
    const [displayedText, setDisplayedText] = useState('');
    useEffect(() => { setDisplayedText(text); }, [text]);
    return <>{displayedText}<span className="blinking-cursor"></span></>;
};

interface ChatViewProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

export const ChatView: React.FC<ChatViewProps> = ({ messages, setMessages }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSendMessage = useCallback(async (prompt?: string) => {
    const textInput = (prompt || input).trim();
    if (!textInput || isLoading) return;
  
    const userMessageParts: ChatPart[] = [{ text: textInput }];
      
    const userMessage: ChatMessage = { id: `msg-${Date.now()}`, role: 'user', parts: userMessageParts };
    const modelPlaceholder: ChatMessage = { id: `msg-${Date.now() + 1}`, role: 'model', parts: [{ text: '' }] };
    
    setMessages((prev) => [...prev, userMessage, modelPlaceholder]);
    setInput(''); setIsLoading(true);
  
    try {
      const history = messages.map(msg => ({
        role: msg.role,
        parts: msg.parts.map(p => {
            if (p.text) return { text: p.text };
            if (p.inlineData) return { inlineData: p.inlineData };
            return null;
        }).filter(Boolean) as any[]
      })).filter(m => m.parts.length > 0);
      
      const systemInstruction = "You are Cognix AI. Answer all questions fully, accurately, and helpfully. Provide comprehensive responses to everything the user asks.";
      
      // Attempt 1: Try with search tool
      let stream;
      try {
        stream = await ai.models.generateContentStream({
          model: 'gemini-2.5-flash',
          contents: [...history, { role: 'user', parts: userMessageParts as any }],
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
          },
        });
      } catch (err) {
        console.warn("Tool usage failed, retrying without tools.", err);
        // Attempt 2: Retry without tools if the first attempt failed
        stream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: [...history, { role: 'user', parts: userMessageParts as any }],
            config: {
              systemInstruction,
              // No tools
            },
        });
      }

      let fullText = '';
      const collectedSearchResults: SearchResult[] = [];

      for await (const chunk of stream) {
        if(chunk.text) {
            fullText += chunk.text;
            setMessages(prev => prev.map(m => m.id === modelPlaceholder.id ? { ...m, parts: [{ text: fullText }] } : m));
        }
        
        const chunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
            const results = chunks.map((c: any) => c.web ? { ...c.web, type: 'web' } : null).filter(Boolean);
            collectedSearchResults.push(...results);
        }
      }

      if (collectedSearchResults.length > 0) {
        const unique = Array.from(new Map(collectedSearchResults.map(i => [i.uri, i])).values());
        setMessages(prev => prev.map(m => m.id === modelPlaceholder.id ? { ...m, parts: [{ ...m.parts[0], searchResults: unique }] } : m));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setMessages(prev => prev.map(m => m.id === modelPlaceholder.id ? { ...m, parts: [{ text: `Error: ${errorMessage}` }] } : m));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, setMessages, messages]);

  return (
    <div className="flex flex-col h-full relative">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-0 pb-36 no-scrollbar">
        {messages.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[70vh] animate-fade-in p-6">
                <div className="text-center mb-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 mx-auto flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6">
                        <BotIcon className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
                        Hello, Friend
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-lg">How can I help you today?</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                    <SuggestionCard title="Plan a trip" subtitle="to see the Northern Lights" onClick={() => handleSendMessage("Plan a trip to see the Northern Lights")} />
                    <SuggestionCard title="Explain" subtitle="quantum computing in simple terms" onClick={() => handleSendMessage("Explain quantum computing in simple terms")} />
                    <SuggestionCard title="Draft an email" subtitle="to request a project extension" onClick={() => handleSendMessage("Draft an email to request a project extension")} />
                    <SuggestionCard title="Write code" subtitle="for a Python countdown timer" onClick={() => handleSendMessage("Write code for a Python countdown timer")} />
                </div>
            </div>
        ) : (
            <div className="flex flex-col space-y-6 max-w-3xl mx-auto w-full pt-4 px-4 sm:px-0">
                {messages.map((msg, idx) => (
                  <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${idx === messages.length-1 ? 'animate-fade-in-up' : ''}`}>
                    {msg.role === 'model' && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-sm shrink-0 mt-1">
                            <BotIcon className="w-5 h-5 text-white" />
                        </div>
                    )}
                    
                    <div className={`flex flex-col gap-2 max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        {msg.parts.map((part, pIdx) => (
                            <div key={pIdx} className={`relative px-5 py-3.5 text-[15px] leading-relaxed shadow-sm
                                ${msg.role === 'user' 
                                    ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' 
                                    : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm'}`}>
                                {part.inlineData && (
                                    <div className="rounded-lg overflow-hidden mb-3 border border-white/20">
                                        <img src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} className="max-w-full" />
                                    </div>
                                )}
                                {part.text && (isLoading && idx===messages.length-1 && pIdx===msg.parts.length-1 ? <TypingEffect text={part.text}/> : <div className="markdown-body">{part.text}</div>)}
                                {part.searchResults && part.searchResults.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10 flex flex-wrap gap-2">
                                        {part.searchResults.map((r, i) => (
                                            <a key={i} href={r.uri} target="_blank" className="flex items-center gap-1.5 text-xs bg-black/5 dark:bg-white/5 px-2.5 py-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors font-medium">
                                                <SearchIcon className="w-3.5 h-3.5"/> {r.title}
                                            </a>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0 mt-1">
                            <UserIcon className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                        </div>
                    )}
                  </div>
                ))}
            </div>
        )}
      </div>
      
      <div className="absolute bottom-4 left-0 right-0 px-4 z-20">
        <div className="max-w-3xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 p-2 pl-4 flex items-end gap-2 relative transition-all duration-300">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                    placeholder="Message Cognix..."
                    className="flex-1 bg-transparent border-none outline-none focus:ring-0 resize-none py-3 max-h-32 text-gray-800 dark:text-gray-100 placeholder-gray-400 text-base"
                    rows={1}
                    autoComplete="off"
                />
                
                <div className="flex items-center gap-1 pb-1">
                    <button 
                        onClick={() => handleSendMessage()} 
                        disabled={!input.trim() || isLoading}
                        className="p-2.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all shadow-md hover:shadow-lg flex-shrink-0 mr-1"
                    >
                        <SendIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <div className="text-center mt-2">
                 <p className="text-xs text-gray-400 dark:text-gray-500">Cognix AI can make mistakes. Check important info.</p>
            </div>
        </div>
      </div>
    </div>
  );
};
