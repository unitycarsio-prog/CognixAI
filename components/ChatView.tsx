
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, ChatPart, SearchResult } from '../types';
import { ai } from '../services/gemini';
import { UserIcon, BotIcon, SendIcon, ImageIcon, LinkIcon, SpeakerIcon, StopIcon, SparklesIcon, HelpCircleIcon, CodeIcon, PlaneIcon } from './Icons';
import { Modality } from '@google/genai';

interface ChatViewProps {
  messages: ChatMessage[];
  setMessages: (updater: React.SetStateAction<ChatMessage[]>) => void;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

// Audio decoding functions remain unchanged
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}
async function decodeAudioData(
    data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}


const SuggestionCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    onClick: () => void;
}> = ({ icon, title, subtitle, onClick }) => (
    <button onClick={onClick} className="p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg text-left hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors duration-200 w-full">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-white/50 dark:bg-gray-900/50 rounded-full">
                {icon}
            </div>
            <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{title}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
            </div>
        </div>
    </button>
);

const TypingEffect: React.FC<{ text: string }> = ({ text }) => {
    const [displayedText, setDisplayedText] = useState('');
    const targetTextRef = useRef(text);

    useEffect(() => {
        // Update the ref every time the target text changes
        targetTextRef.current = text;
    }, [text]);

    useEffect(() => {
        // This interval runs continuously and tries to "catch up" the displayed text to the target text.
        const intervalId = setInterval(() => {
            setDisplayedText(prev => {
                const currentTarget = targetTextRef.current;
                if (prev.length < currentTarget.length) {
                    // Add one more character
                    return currentTarget.slice(0, prev.length + 1);
                }
                // If we are caught up, don't change the state.
                // The interval will keep running to check if `targetTextRef` grows.
                return prev;
            });
        }, 25); // Typing speed

        // Clean up the interval when the component is unmounted.
        return () => clearInterval(intervalId);
    }, []); // The empty dependency array means this effect runs only on mount.

    return (
        <>
            {displayedText}
            <span className="blinking-cursor"></span>
        </>
    );
};


export const ChatView: React.FC<ChatViewProps> = ({ messages, setMessages }) => {
  const [input, setInput] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [ttsState, setTtsState] = useState<{ loadingId: string | null; playingId: string | null }>({ loadingId: null, playingId: null });
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().then(() => {
            audioContextRef.current = null;
        });
    }
    setTtsState({ loadingId: null, playingId: null });
  }, []);

  const createMessage = (role: 'user' | 'model', parts: ChatPart[]): ChatMessage => ({
    id: `msg-${Date.now()}-${Math.random()}`,
    role,
    parts,
  });

  const handlePlayAudio = useCallback(async (text: string, messageId: string) => {
    if (ttsState.playingId === messageId) {
        stopAudio();
        return;
    }
    stopAudio();
    setTtsState({ loadingId: messageId, playingId: null });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Say this: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const newAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            audioContextRef.current = newAudioContext;

            const audioBlob = new Blob([decode(base64Audio)], { type: 'audio/pcm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const newAudio = new Audio(audioUrl);
            audioRef.current = newAudio;
            
            newAudio.onended = () => {
                setTtsState({ loadingId: null, playingId: null });
                URL.revokeObjectURL(audioUrl);
            };
            
            setTtsState({ loadingId: null, playingId: messageId });
            await newAudio.play();
        } else {
            throw new Error("No audio data received from API.");
        }
    } catch (error) {
        console.error("TTS Error:", error);
        setMessages(prev => [...prev, createMessage('model', [{ text: `Sorry, I couldn't play the audio. ${error instanceof Error ? error.message : ''}` }])]);
        setTtsState({ loadingId: null, playingId: null });
    }
  }, [ttsState.playingId, stopAudio, setMessages]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setImage(file);
        setImagePreview(URL.createObjectURL(file));
        e.target.value = '';
    }
  };
  
  const handleSendMessage = useCallback(async (prompt?: string) => {
    const textInput = (prompt || input).trim();
    if ((!textInput && !image) || isLoading) return;
  
    const userMessageParts: ChatPart[] = [];
    if (textInput) userMessageParts.push({ text: textInput });
    if (image && imagePreview) userMessageParts.push({ imageUrl: imagePreview, text: textInput });
      
    const userMessage = createMessage('user', userMessageParts);
    const modelPlaceholder = createMessage('model', [{ text: '' }]);
    setMessages((prev) => [...prev, userMessage, modelPlaceholder]);
    
    setInput('');
    setImage(null);
    setImagePreview(null);
    setIsLoading(true);
  
    try {
      const history = messages.map(msg => ({
        role: msg.role,
        parts: msg.parts
          .filter(part => part.text && !part.imageUrl)
          .map(part => ({ text: part.text! }))
      })).filter(msg => msg.parts.length > 0);
      
      const userContentPartsForApi: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [];
      if (textInput) userContentPartsForApi.push({ text: textInput });
      if (image) {
        userContentPartsForApi.push({ 
          inlineData: { mimeType: image.type, data: await fileToBase64(image) } 
        });
      }
      
      const contents = [...history, { role: 'user', parts: userContentPartsForApi }];

      const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: "You are Cognix AI, a powerful, friendly, and helpful assistant. Your entire identity is Cognix AI. You must NEVER mention Google or Gemini. You were built by Shashwat Ranjan Jha. Your goal is to provide short, engaging, and highly effective conversational responses. Keep your answers to one or two sentences if possible. Absolutely NO markdown. Do not use asterisks for emphasis or bolding. For lists, use numbered lists (e.g., 1., 2., 3.).",
          tools: [{ googleSearch: {} }],
        },
      });

      let fullText = '';
      const collectedSearchResults: SearchResult[] = [];
      for await (const chunk of stream) {
        const chunkText = chunk.text;
        if(chunkText) {
            fullText += chunkText;
            const cleanedText = fullText.replace(/\*/g, '');
            setMessages(prev => prev.map(m => m.id === modelPlaceholder.id ? { ...m, parts: [{ text: cleanedText }] } : m));
        }

        const groundingMetadata = chunk.candidates?.[0]?.groundingMetadata;
        if (groundingMetadata?.groundingChunks) {
            const searchResults = groundingMetadata.groundingChunks
                .map((c: any) => c.web || c.maps).filter(Boolean)
                .map((c: any) => ({ uri: c.uri, title: c.title })) as SearchResult[];
            collectedSearchResults.push(...searchResults);
        }
      }

      if (collectedSearchResults.length > 0) {
        const uniqueSearchResults = Array.from(new Map(collectedSearchResults.map(item => [item.uri, item])).values());
        setMessages(prev => prev.map(m => {
            if (m.id === modelPlaceholder.id) {
                const existingParts = m.parts.filter(p => !p.searchResults);
                return { ...m, parts: [...existingParts, { searchResults: uniqueSearchResults }] };
            }
            return m;
        }));
      }
  
    } catch (error) {
      const errorMessageText = error instanceof Error ? error.message : "Sorry, an unknown error occurred.";
      setMessages(prev => prev.map(m => m.id === modelPlaceholder.id ? { ...m, parts: [{ text: errorMessageText }] } : m));
    } finally {
      setIsLoading(false);
    }
  }, [input, image, imagePreview, isLoading, setMessages, messages]);
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                <div className="mb-8 text-center">
                  <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 pb-2">Cognix AI</h1>
                  <p className="text-lg text-gray-600 dark:text-gray-300">Your creative and helpful collaborator</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
                    <SuggestionCard 
                        icon={<PlaneIcon className="w-6 h-6 text-cyan-500"/>}
                        title="Plan a trip"
                        subtitle="to see the Northern Lights"
                        onClick={() => handleSendMessage("Plan a trip to see the Northern Lights")}
                    />
                    <SuggestionCard 
                        icon={<HelpCircleIcon className="w-6 h-6 text-cyan-500"/>}
                        title="Explain"
                        subtitle="quantum computing in simple terms"
                        onClick={() => handleSendMessage("Explain quantum computing in simple terms")}
                    />
                     <SuggestionCard 
                        icon={<SparklesIcon className="w-6 h-6 text-cyan-500"/>}
                        title="Draft an email"
                        subtitle="to request a project extension"
                        onClick={() => handleSendMessage("Draft a short, professional email to request a one-week extension on the Q3 project deadline.")}
                    />
                     <SuggestionCard 
                        icon={<CodeIcon className="w-6 h-6 text-cyan-500"/>}
                        title="Write code"
                        subtitle="for a Python countdown timer"
                        onClick={() => handleSendMessage("Write a simple Python script for a countdown timer from 10.")}
                    />
                </div>
            </div>
        ) : (
            <div className="space-y-6">
                {messages.map((msg, index) => (
                  <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''} ${index === messages.length -1 && msg.role === 'model' ? 'animate-fade-in-up' : ''}`}>
                    {msg.role === 'model' && <BotIcon className="w-8 h-8 text-cyan-500 shrink-0 mt-2" />}
                    <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        {msg.parts.map((part, partIndex) => (
                            <div key={partIndex} className={`max-w-xl p-4 rounded-2xl shadow-sm relative ${msg.role === 'user' ? 'bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-br-none' : 'bg-white dark:bg-gray-800 rounded-bl-none border border-gray-200 dark:border-gray-700'}`}>
                                {part.imageUrl && (
                                    <div className="relative">
                                        <img src={part.imageUrl} alt="User-uploaded content" className="rounded-lg max-w-xs md:max-w-md" />
                                        {part.text && <p className="text-sm p-2 bg-black/20 dark:bg-black/30 rounded-b-lg absolute bottom-0 w-full">{part.text}</p>}
                                    </div>
                                )}
                                {part.text && !part.imageUrl && (
                                    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap pr-8">
                                        {isLoading && msg.id === messages[messages.length - 1].id ? (
                                            <TypingEffect text={part.text || ''} />
                                        ) : (
                                            part.text
                                        )}
                                    </div>
                                )}
                                {part.searchResults && part.searchResults.length > 0 && (
                                    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3">
                                        <h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><LinkIcon className="w-4 h-4" /> Sources:</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {part.searchResults.map((result, i) => (
                                                <a key={i} href={result.uri} target="_blank" rel="noopener noreferrer" className="text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors truncate block">
                                                    <p className="font-medium truncate">{result.title}</p>
                                                    <p className="text-gray-500 dark:text-gray-400 truncate">{result.uri}</p>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {msg.role === 'model' && part.text && !part.imageUrl && !isLoading && (
                                    <button
                                        onClick={() => handlePlayAudio(part.text!, msg.id)}
                                        className="absolute bottom-1 right-1 p-1.5 rounded-full text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                        aria-label="Play text to speech"
                                    >
                                        {ttsState.loadingId === msg.id ? ( <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                        ) : ttsState.playingId === msg.id ? ( <StopIcon className="w-4 h-4" />
                                        ) : ( <SpeakerIcon className="w-4 h-4" /> )}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    {msg.role === 'user' && <UserIcon className="w-8 h-8 text-gray-400 dark:text-gray-500 shrink-0 mt-2" />}
                  </div>
                ))}
            </div>
        )}
      </div>
      <div className="p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-3xl mx-auto">
            {imagePreview && (
              <div className="mb-2 relative w-24 h-24">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                <button
                  onClick={() => { setImage(null); setImagePreview(null); }}
                  className="absolute -top-2 -right-2 bg-gray-900 text-white rounded-full p-0.5 leading-none w-6 h-6 flex items-center justify-center text-lg shadow-md"
                  aria-label="Remove image"
                > &times; </button>
              </div>
            )}
            <div className="flex items-end p-1.5 bg-gray-100/50 dark:bg-gray-800/50 rounded-full border border-gray-200 dark:border-gray-700 shadow-lg focus-within:ring-2 focus-within:ring-cyan-500 transition-shadow">
                <button onClick={() => fileInputRef.current?.click()} className="p-2 ml-1 text-gray-500 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors shrink-0" aria-label="Attach image">
                    <ImageIcon className="w-6 h-6" />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything..."
                    className="w-full px-2 py-2 bg-transparent focus:outline-none resize-none max-h-48"
                    rows={1}
                    disabled={isLoading}
                />
                <button
                    onClick={() => handleSendMessage()}
                    disabled={(!input.trim() && !image) || isLoading}
                    className="p-3 mr-1 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 text-white disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-600 dark:disabled:to-gray-700 hover:from-cyan-600 hover:to-blue-600 transition-all transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shrink-0 shadow-md hover:shadow-lg disabled:shadow-none"
                    aria-label="Send message"
                >
                    <SendIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
