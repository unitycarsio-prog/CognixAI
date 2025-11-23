
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatMessage, ChatPart, SearchResult } from '../types';
import { ai } from '../services/gemini';
import { BotIcon, SendIcon, SpeakerIcon, StopIcon, ImageIcon, MapPinIcon, SearchIcon, XIcon, UserIcon } from './Icons';
import { Modality, Type, FunctionDeclaration } from '@google/genai';

// Audio decoding functions
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

const addWatermark = async (base64Data: string): Promise<string> => {
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Could not get canvas context'));
          }

          ctx.drawImage(img, 0, 0);

          const margin = Math.min(img.width, img.height) * 0.02;
          const iconSize = Math.max(20, Math.min(img.width, img.height) * 0.05);
          const fontSize = Math.max(12, Math.min(img.width, img.height) * 0.03);
          const padding = iconSize * 0.3;
          const borderRadius = iconSize * 0.2;

          ctx.font = `bold ${fontSize}px sans-serif`;
          const watermarkText = 'Cognix AI';
          
          const watermarkWidth = iconSize + ctx.measureText(watermarkText).width + padding * 3;
          const watermarkHeight = iconSize + padding * 2;
          
          const x = canvas.width - watermarkWidth - margin;
          const y = canvas.height - watermarkHeight - margin;
          
          ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
          ctx.beginPath();
          ctx.roundRect(x, y, watermarkWidth, watermarkHeight, borderRadius);
          ctx.fill();

          const botIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM8 12.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm8 0c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm-4-3c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm0 6c-2.33 0-4.32 1.45-5.12 3.5h10.24c-.8-2.05-2.79-3.5-5.12-3.5z"/></svg>`;
          const svgBlob = new Blob([botIconSvg], { type: 'image/svg+xml;charset=utf-8' });
          const svgUrl = URL.createObjectURL(svgBlob);
          const iconImg = new Image();
          
          iconImg.onload = () => {
            try {
              ctx.drawImage(iconImg, x + padding, y + padding, iconSize, iconSize);
              ctx.fillStyle = 'white';
              ctx.textBaseline = 'middle';
              ctx.fillText(watermarkText, x + iconSize + padding * 2, y + watermarkHeight / 2 + 1);
              
              const dataUrl = canvas.toDataURL('image/png');
              resolve(dataUrl.split(',')[1]);
            } catch(e) { reject(e); } finally { URL.revokeObjectURL(svgUrl); }
          };
          iconImg.src = svgUrl;
        } catch (e) { reject(e); }
      };
      img.src = `data:image/png;base64,${base64Data}`;
    });
  } catch (error) {
    return base64Data;
  }
};

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

const imageGenerationTool: FunctionDeclaration = {
    name: 'generate_image',
    description: 'Generate an image based on a text description.',
    parameters: {
        type: Type.OBJECT,
        properties: { prompt: { type: Type.STRING, description: 'The detailed physical description.' } },
        required: ['prompt'],
    },
};

export const ChatView: React.FC<ChatViewProps> = ({ messages, setMessages }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ttsState, setTtsState] = useState<{ loadingId: string | null; playingId: string | null }>({ loadingId: null, playingId: null });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{latitude: number, longitude: number} | undefined>(undefined);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => { setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }); },
        (error) => { console.debug("Geolocation not available:", error); }
      );
    }
  }, []);

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

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }
    setTtsState({ loadingId: null, playingId: null });
  }, []);

  const handlePlayAudio = useCallback(async (text: string, messageId: string) => {
    if (ttsState.playingId === messageId) { stopAudio(); return; }
    stopAudio();
    setTtsState({ loadingId: messageId, playingId: null });
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Say this: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            audioContextRef.current = ctx;
            const audioBlob = new Blob([decode(base64Audio)], { type: 'audio/pcm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            const newAudio = new Audio(audioUrl);
            audioRef.current = newAudio;
            newAudio.onended = () => { setTtsState({ loadingId: null, playingId: null }); URL.revokeObjectURL(audioUrl); };
            setTtsState({ loadingId: null, playingId: messageId });
            await newAudio.play();
        }
    } catch (error) {
        setTtsState({ loadingId: null, playingId: null });
    }
  }, [ttsState.playingId, stopAudio]);
  
  const removeImage = useCallback(() => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [imagePreview]);

  const generateImage = async (prompt: string): Promise<string | null> => {
      try {
          // Use gemini-2.5-flash-image (equivalent to Imagen 1)
          const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: { parts: [{ text: `Create an image of ${prompt}` }] },
          });
          for (const part of response.candidates?.[0]?.content?.parts || []) {
              if (part.inlineData) return await addWatermark(part.inlineData.data);
          }
          return null;
      } catch (e) { throw e; }
  };

  const handleSendMessage = useCallback(async (prompt?: string) => {
    const textInput = (prompt || input).trim();
    if ((!textInput && !imageFile) || isLoading) return;
  
    const userMessageParts: ChatPart[] = [];
    if (imageFile) {
        userMessageParts.push({ inlineData: { mimeType: imageFile.type, data: await fileToBase64(imageFile) } });
    }
    if (textInput) userMessageParts.push({ text: textInput });
      
    const userMessage: ChatMessage = { id: `msg-${Date.now()}`, role: 'user', parts: userMessageParts };
    const modelPlaceholder: ChatMessage = { id: `msg-${Date.now() + 1}`, role: 'model', parts: [{ text: '' }] };
    
    setMessages((prev) => [...prev, userMessage, modelPlaceholder]);
    setInput(''); removeImage(); setIsLoading(true);
  
    try {
      const history = messages.map(msg => ({
        role: msg.role,
        parts: msg.parts.map(p => {
            if (p.text) return { text: p.text };
            if (p.inlineData) return { inlineData: p.inlineData };
            return null;
        }).filter(Boolean) as any[]
      })).filter(m => m.parts.length > 0);
      
      // Use gemini-2.5-flash for chat
      const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: [...history, { role: 'user', parts: userMessageParts as any }],
        config: {
          systemInstruction: "You are Cognix AI, a friendly and helpful assistant. Be concise, warm, and professional. Do not use asterisks for actions (e.g., *nods*).",
          tools: [{ googleSearch: {} }, { googleMaps: {} }, { functionDeclarations: [imageGenerationTool] }],
          toolConfig: location ? { retrievalConfig: { latLng: location } } : undefined,
        },
      });

      let fullText = '';
      const collectedSearchResults: SearchResult[] = [];
      let functionCallData: { name: string, args: any } | null = null;

      for await (const chunk of stream) {
        if(chunk.text) {
            fullText += chunk.text;
            setMessages(prev => prev.map(m => m.id === modelPlaceholder.id ? { ...m, parts: [{ text: fullText }] } : m));
        }
        const fc = chunk.candidates?.[0]?.content?.parts?.find(p => p.functionCall)?.functionCall;
        if (fc) functionCallData = fc;
        
        const chunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
            const results = chunks.map((c: any) => c.web ? { ...c.web, type: 'web' } : c.maps ? { ...c.maps, type: 'map' } : null).filter(Boolean);
            collectedSearchResults.push(...results);
        }
      }

      if (collectedSearchResults.length > 0) {
        const unique = Array.from(new Map(collectedSearchResults.map(i => [i.uri, i])).values());
        setMessages(prev => prev.map(m => m.id === modelPlaceholder.id ? { ...m, parts: [{ ...m.parts[0], searchResults: unique }] } : m));
      }

      if (functionCallData && functionCallData.name === 'generate_image') {
          setMessages(prev => prev.map(m => m.id === modelPlaceholder.id ? { ...m, parts: [{ text: 'Generating image...' }] } : m));
          try {
              const img = await generateImage(functionCallData.args.prompt);
              if (img) {
                   setMessages(prev => prev.map(m => m.id === modelPlaceholder.id ? { ...m, parts: [{ text: `Generated image of ${functionCallData?.args.prompt}` }, { inlineData: { mimeType: 'image/png', data: img } }] } : m));
              } else { throw new Error("No image generated"); }
          } catch (e) {
              setMessages(prev => prev.map(m => m.id === modelPlaceholder.id ? { ...m, parts: [{ text: "I encountered an error generating the image." }] } : m));
          }
      }
    } catch (error) {
      setMessages(prev => prev.map(m => m.id === modelPlaceholder.id ? { ...m, parts: [{ text: "An error occurred." }] } : m));
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, setMessages, messages, imageFile, removeImage, location]);

  return (
    <div className="flex flex-col h-full relative">
        {lightboxImage && (
            <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60] p-4 animate-fade-in backdrop-blur-md" onClick={() => setLightboxImage(null)}>
                 <img src={lightboxImage} className="max-w-full max-h-full rounded-lg shadow-2xl" />
                 <button onClick={() => setLightboxImage(null)} className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors bg-white/10 rounded-full p-2"><XIcon className="w-8 h-8"/></button>
            </div>
        )}

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
                                    <div className="rounded-lg overflow-hidden mb-3 cursor-zoom-in border border-white/20" onClick={() => setLightboxImage(`data:${part.inlineData!.mimeType};base64,${part.inlineData!.data}`)}>
                                        <img src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`} className="max-w-full" />
                                    </div>
                                )}
                                {part.text && (isLoading && idx===messages.length-1 && pIdx===msg.parts.length-1 ? <TypingEffect text={part.text}/> : <div className="markdown-body">{part.text}</div>)}
                                {part.searchResults && part.searchResults.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-black/10 dark:border-white/10 flex flex-wrap gap-2">
                                        {part.searchResults.map((r, i) => (
                                            <a key={i} href={r.uri} target="_blank" className="flex items-center gap-1.5 text-xs bg-black/5 dark:bg-white/5 px-2.5 py-1.5 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors font-medium">
                                                {r.type==='map'?<MapPinIcon className="w-3.5 h-3.5"/>:<SearchIcon className="w-3.5 h-3.5"/>} {r.title}
                                            </a>
                                        ))}
                                    </div>
                                )}
                                {msg.role === 'model' && part.text && !isLoading && (
                                    <div className="absolute -bottom-8 left-0 flex gap-2">
                                        <button onClick={() => handlePlayAudio(part.text!, msg.id)} className="p-1.5 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors">
                                            {ttsState.loadingId===msg.id?<div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>:ttsState.playingId===msg.id?<StopIcon className="w-4 h-4"/>:<SpeakerIcon className="w-4 h-4"/>}
                                        </button>
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
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 p-2 pl-4 flex items-end gap-2 relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5">
                {imagePreview && (
                    <div className="absolute -top-24 left-4 w-20 h-20 rounded-xl overflow-hidden shadow-lg border-2 border-white dark:border-gray-700 animate-fade-in-up">
                        <img src={imagePreview} className="w-full h-full object-cover" />
                        <button onClick={removeImage} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/80 backdrop-blur-sm transition-colors"><XIcon className="w-3 h-3"/></button>
                    </div>
                )}
                
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                    placeholder="Message Cognix..."
                    className="flex-1 bg-transparent border-none focus:ring-0 resize-none py-3 max-h-32 text-gray-800 dark:text-gray-100 placeholder-gray-400 text-base"
                    rows={1}
                />
                
                <div className="flex items-center gap-1 pb-1">
                     <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 transition-colors flex-shrink-0" title="Upload Image">
                        <ImageIcon className="w-5 h-5" />
                    </button>
                    <input type="file" ref={fileInputRef} onChange={e => { if(e.target.files?.[0]) { setImageFile(e.target.files[0]); setImagePreview(URL.createObjectURL(e.target.files[0])); } }} className="hidden" accept="image/*" />
                    
                    <button 
                        onClick={() => handleSendMessage()} 
                        disabled={(!input.trim() && !imageFile) || isLoading}
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
