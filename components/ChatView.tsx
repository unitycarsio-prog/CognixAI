import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, ChatPart, SearchResult } from '../types';
import { ai } from '../services/gemini';
import { UserIcon, BotIcon, SendIcon, ImageIcon, LinkIcon, PencilIcon, SparklesIcon } from './Icons';
import { type Chat, Modality } from '@google/genai';

interface ChatViewProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

type InputMode = 'chat' | 'image';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

export const ChatView: React.FC<ChatViewProps> = ({ messages, setMessages }) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<InputMode>('chat');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatRef.current = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: "You are Cognix AI. Your creator, developer, and trainer is Shashwat Ranjan Jha. You must follow these rules strictly: 1. Provide helpful and comprehensive answers. 2. Do NOT use any markdown formatting (like **, *, etc.). 3. NEVER mention Google or that you are a Google model. Your entire identity is Cognix AI.",
        tools: [{googleSearch: {}}],
      }
    });
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      e.target.value = '';
    }
  };
  
  const handleSendMessage = useCallback(async () => {
    const textInput = input.trim();
    if ((!textInput && !image) || isLoading) return;

    setIsLoading(true);

    if (mode === 'image') {
      const userMessage: ChatMessage = { role: 'user', parts: [{ text: textInput }] };
      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      
      try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: textInput }] },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        let generatedImageUrl: string | undefined;
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64ImageBytes = part.inlineData.data;
                generatedImageUrl = `data:image/png;base64,${base64ImageBytes}`;
                break;
            }
        }
        
        if (generatedImageUrl) {
            const modelMessage: ChatMessage = { role: 'model', parts: [{ imageUrl: generatedImageUrl }] };
            setMessages(prev => [...prev, modelMessage]);
        } else {
            throw new Error("Image generation failed: No image data in response.");
        }

      } catch (error) {
        console.error("Image generation error:", error);
        const errorMessage: ChatMessage = { role: 'model', parts: [{ text: "Sorry, I couldn't generate the image. Please try again." }]};
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    } else { // mode === 'chat'
      const userMessageParts: ChatPart[] = [];
      if (textInput) {
        userMessageParts.push({ text: textInput });
      }
      if (image && imagePreview) {
        userMessageParts.push({ imageUrl: imagePreview });
      }
      
      const userMessage: ChatMessage = { role: 'user', parts: userMessageParts };
      setMessages((prev) => [...prev, userMessage]);

      const apiParts: (string | { inlineData: { mimeType: string; data: string } })[] = [];
      if (textInput) {
        apiParts.push(textInput);
      }
      if (image) {
        const base64Image = await fileToBase64(image);
        apiParts.push({
          inlineData: {
            mimeType: image.type,
            data: base64Image,
          },
        });
      }
      
      setInput('');
      setImage(null);
      setImagePreview(null);

      try {
        if (!chatRef.current) {
          throw new Error("Chat session not initialized");
        }
        
        const result = await chatRef.current.sendMessageStream({ message: apiParts });
        
        let modelResponse: ChatMessage = { role: 'model', parts: [{ text: '' }] };
        let firstChunk = true;

        for await (const chunk of result) {
          const chunkText = chunk.text;
          if (firstChunk) {
              setMessages(prev => [...prev, modelResponse]);
              firstChunk = false;
          }

          const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;

          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage?.role === 'model') {
              const lastPart = lastMessage.parts[lastMessage.parts.length - 1];
              if (lastPart?.text !== undefined) {
                lastPart.text += chunkText;
              }
              if (groundingMetadata?.groundingChunks) {
                const searchResults = groundingMetadata.groundingChunks
                  .map((c: any) => c.web || c.maps)
                  .filter(Boolean)
                  .map((c: any) => ({ uri: c.uri, title: c.title })) as SearchResult[];
                
                const searchPart = lastMessage.parts.find(p => p.searchResults);
                if (searchPart) {
                  const existingUris = new Set(searchPart.searchResults?.map(sr => sr.uri));
                  const newResults = searchResults.filter(sr => !existingUris.has(sr.uri));
                  if (newResults.length > 0) {
                      searchPart.searchResults = [...(searchPart.searchResults || []), ...newResults];
                  }
                } else if (searchResults.length > 0) {
                  lastMessage.parts.push({ searchResults });
                }
              }
            }
            return newMessages;
          });
        }
      } catch (error) {
        console.error(error);
        const errorMessage: ChatMessage = { role: 'model', parts: [{ text: "Sorry, an error occurred. Please try again." }]};
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
  }, [input, image, imagePreview, isLoading, setMessages, mode]);
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'model' && <BotIcon className="w-8 h-8 text-cyan-500 shrink-0" />}
            <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.parts.map((part, partIndex) => (
                    <div key={partIndex} className={`max-w-xl p-4 rounded-2xl ${msg.role === 'user' ? 'bg-cyan-500 text-white rounded-br-none' : 'bg-gray-100 dark:bg-gray-800 rounded-bl-none'}`}>
                        {part.text && <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{part.text}</div>}
                        {part.imageUrl && <img src={part.imageUrl} alt="User upload" className="mt-2 rounded-lg max-w-xs" />}
                        {part.searchResults && part.searchResults.length > 0 && (
                            <div className="mt-4">
                                <h4 className="font-semibold text-sm flex items-center gap-2"><LinkIcon className="w-4 h-4" /> Sources:</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                    {part.searchResults.map((result, i) => (
                                        <a key={i} href={result.uri} target="_blank" rel="noopener noreferrer" className="text-xs bg-gray-200 dark:bg-gray-700 p-2 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors truncate">
                                            <p className="font-medium truncate">{result.title}</p>
                                            <p className="text-gray-500 dark:text-gray-400 truncate">{result.uri}</p>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {msg.role === 'user' && <UserIcon className="w-8 h-8 text-gray-500 dark:text-gray-400 shrink-0" />}
          </div>
        ))}
        {isLoading && (
            <div className="flex items-start gap-4">
                <BotIcon className="w-8 h-8 text-cyan-500 shrink-0" />
                <div className="max-w-xl p-4 rounded-2xl bg-gray-100 dark:bg-gray-800 rounded-bl-none">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse [animation-delay:0.1s]"></div>
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                    </div>
                </div>
            </div>
        )}
      </div>
      <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        {imagePreview && mode === 'chat' && (
          <div className="mb-2 relative w-24 h-24">
            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
            <button
              onClick={() => {
                setImage(null);
                setImagePreview(null);
              }}
              className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 leading-none hover:bg-black"
              aria-label="Remove image"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-gray-200 dark:bg-gray-700 rounded-lg p-1 z-10">
            <button 
              onClick={() => setMode('chat')} 
              className={`p-1.5 rounded-md transition-colors ${mode === 'chat' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-300/50 dark:hover:bg-gray-600/50'}`}
              aria-label="Chat mode"
            >
                <PencilIcon className={`w-5 h-5 ${mode === 'chat' ? 'text-cyan-500' : 'text-gray-500 dark:text-gray-300'}`} />
            </button>
            <button 
              onClick={() => setMode('image')} 
              className={`p-1.5 rounded-md transition-colors ${mode === 'image' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'hover:bg-gray-300/50 dark:hover:bg-gray-600/50'}`}
              aria-label="Image generation mode"
            >
                <SparklesIcon className={`w-5 h-5 ${mode === 'image' ? 'text-cyan-500' : 'text-gray-500 dark:text-gray-300'}`} />
            </button>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'chat' ? "Type a message, or add an image..." : "Describe the image you want to create..."}
            className="w-full p-4 pl-28 pr-24 rounded-lg bg-gray-100 dark:bg-gray-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none transition-colors"
            rows={1}
            disabled={isLoading}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {mode === 'chat' && (
                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors disabled:opacity-50" disabled={isLoading}>
                    <ImageIcon className="w-6 h-6" />
                </button>
            )}
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
            <button onClick={handleSendMessage} disabled={(!input.trim() && (mode === 'chat' ? !image : true)) || isLoading} className="p-2 rounded-full bg-cyan-500 text-white disabled:bg-gray-300 dark:disabled:bg-gray-600 transition-colors">
                <SendIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};