
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ai } from '../services/gemini';
import { MicrophoneIcon, StopIcon, BotIcon, UserIcon } from './Icons';
import type { LiveServerMessage, Blob } from '@google/genai';
import { Modality } from '@google/genai';

function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

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
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
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

interface TranscriptEntry {
    speaker: 'user' | 'model';
    text: string;
}

export const LiveView: React.FC = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
    
    const sessionPromiseRef = useRef<ReturnType<typeof ai.live.connect> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const outputNodeRef = useRef<GainNode | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef(0);
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');
    const transcriptContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (transcriptContainerRef.current) {
            transcriptContainerRef.current.scrollTop = transcriptContainerRef.current.scrollHeight;
        }
    }, [transcripts]);

    const stopSession = useCallback(async () => {
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) { console.error("Error closing session", e); }
            sessionPromiseRef.current = null;
        }

        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        scriptProcessorRef.current?.disconnect();
        scriptProcessorRef.current = null;

        mediaStreamSourceRef.current?.disconnect();
        mediaStreamSourceRef.current = null;

        if (inputAudioContextRef.current?.state !== 'closed') {
            await inputAudioContextRef.current?.close();
        }
        if (outputAudioContextRef.current?.state !== 'closed') {
            await outputAudioContextRef.current?.close();
        }
        outputNodeRef.current = null;
        
        outputSourcesRef.current.forEach(source => source.stop());
        outputSourcesRef.current.clear();

        setIsRecording(false);
    }, []);

    const startSession = useCallback(async () => {
        setIsRecording(true);
        setTranscripts([]);
        currentInputTranscriptionRef.current = '';
        currentOutputTranscriptionRef.current = '';

        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        if (inputCtx.state === 'suspended') {
            await inputCtx.resume();
        }
        if (outputCtx.state === 'suspended') {
            await outputCtx.resume();
        }

        const outputNode = outputCtx.createGain();
        outputNode.connect(outputCtx.destination);

        inputAudioContextRef.current = inputCtx;
        outputAudioContextRef.current = outputCtx;
        outputNodeRef.current = outputNode;
        nextStartTimeRef.current = 0;

        const createBlob = (data: Float32Array): Blob => {
            const l = data.length;
            const int16 = new Int16Array(l);
            for (let i = 0; i < l; i++) {
                int16[i] = data[i] * 32768;
            }
            return {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
            };
        };
        
        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: async () => {
                    try {
                        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                        const currentInputCtx = inputAudioContextRef.current!;
                        mediaStreamSourceRef.current = currentInputCtx.createMediaStreamSource(streamRef.current);
                        scriptProcessorRef.current = currentInputCtx.createScriptProcessor(4096, 1, 1);

                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };

                        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(currentInputCtx.destination);
                    } catch (err) {
                        console.error("Error getting user media:", err);
                        stopSession();
                    }
                },
                onmessage: async (message: LiveServerMessage) => {
                    try {
                        const currentOutputCtx = outputAudioContextRef.current!;
                        const currentOutputNode = outputNodeRef.current!;
                        if (!currentOutputCtx || currentOutputCtx.state === 'closed' || !currentOutputNode) return;
                        
                        const base64EncodedAudioString = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;

                        if (base64EncodedAudioString) {
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, currentOutputCtx.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), currentOutputCtx, 24000, 1);
                            const source = currentOutputCtx.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(currentOutputNode);
                            source.addEventListener('ended', () => { outputSourcesRef.current.delete(source) });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            outputSourcesRef.current.add(source);
                        }
                        
                        if (message.serverContent?.interrupted) {
                            outputSourcesRef.current.forEach(source => source.stop());
                            outputSourcesRef.current.clear();
                            nextStartTimeRef.current = 0;
                        }

                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                            setTranscripts(prev => {
                                const last = prev[prev.length - 1];
                                if (last?.speaker === 'user') return [...prev.slice(0, -1), { ...last, text: currentInputTranscriptionRef.current }];
                                return [...prev, { speaker: 'user', text: currentInputTranscriptionRef.current }];
                            });
                        } else if (message.serverContent?.outputTranscription) {
                            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                            setTranscripts(prev => {
                                const last = prev[prev.length - 1];
                                if (last?.speaker === 'model') return [...prev.slice(0, -1), { ...last, text: currentOutputTranscriptionRef.current }];
                                return [...prev, { speaker: 'model', text: currentOutputTranscriptionRef.current }];
                            });
                        }

                        if (message.serverContent?.turnComplete) {
                            currentInputTranscriptionRef.current = '';
                            currentOutputTranscriptionRef.current = '';
                        }
                    } catch (error) {
                        console.error("Live session message processing error:", error);
                        stopSession();
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error("Live session error:", e);
                    stopSession();
                },
                onclose: () => {
                    // Session might be closed by the server, so we just update the UI state
                    setIsRecording(false);
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction: "You are Cognix AI, a friendly and helpful assistant. Your entire identity is Cognix AI. You must NEVER mention Google. Your goal is to provide short, engaging, and highly effective conversational responses. Keep your answers to one or two sentences if possible. Absolutely NO markdown.",
            },
        });
    }, [stopSession]);

    const handleToggleRecording = () => {
        isRecording ? stopSession() : startSession();
    };

    useEffect(() => {
        return () => {
            stopSession();
        };
    }, [stopSession]);

    return (
        <div className="flex flex-col h-full items-center justify-center p-4 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 transition-colors overflow-hidden relative">
            <div className={`absolute inset-0 bg-grid-pattern dark:bg-grid-pattern-dark ${isRecording ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}></div>
            
            <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 text-center transition-all duration-500 ${isRecording ? 'opacity-0 -translate-y-8' : 'opacity-100 translate-y-0'}`}>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Live Conversation</h2>
                <p className="mt-2 max-w-md text-gray-500 dark:text-gray-400">Tap the orb to start a real-time voice chat with Cognix AI.</p>
            </div>

            <div ref={transcriptContainerRef} className={`w-full max-w-3xl h-full pt-4 pb-40 overflow-y-auto space-y-4 transition-opacity duration-500 ${isRecording ? 'opacity-100' : 'opacity-0'}`}>
                {transcripts.map((t, i) => (
                    <div key={i} className={`flex items-end gap-2 animate-fade-in-up ${t.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {t.speaker === 'model' && <BotIcon className="w-6 h-6 text-cyan-500 shrink-0 mb-1" />}
                        <div className={`px-4 py-2 rounded-2xl max-w-lg shadow-sm ${t.speaker === 'user' ? 'bg-cyan-500 text-white rounded-br-none' : 'bg-gray-100 dark:bg-gray-800 rounded-bl-none'}`}>
                            {t.text}
                        </div>
                        {t.speaker === 'user' && <UserIcon className="w-6 h-6 text-gray-400 shrink-0 mb-1" />}
                    </div>
                ))}
            </div>

            <div className={`absolute bottom-0 left-0 right-0 h-40 flex justify-center items-center transition-opacity duration-500 ${isRecording ? 'opacity-100' : 'opacity-0'}`}>
                {Array.from({ length: 50 }).map((_, i) => (
                    <div
                        key={i}
                        className="w-1 bg-cyan-400 rounded-full"
                        style={{
                            height: `${Math.random() * 60 + 10}%`,
                            animation: `wave 1.5s ease-in-out ${i * 0.05}s infinite alternate`
                        }}
                    ></div>
                ))}
            </div>

            <button 
                onClick={handleToggleRecording} 
                className={`group absolute z-10 flex items-center justify-center rounded-full shadow-2xl transition-all duration-500 ease-in-out
                    ${isRecording 
                        ? 'bottom-8 w-20 h-20 bg-red-500 hover:bg-red-600' 
                        : 'top-1/2 -translate-y-1/2 w-32 h-32 bg-gray-100 dark:bg-gray-800 hover:scale-105 animate-pulsate'}`}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
                <div className={`absolute inset-0 bg-cyan-500/20 rounded-full blur-xl group-hover:blur-2xl transition-all duration-500 ${isRecording ? 'opacity-0' : 'opacity-100'}`}></div>
                <div className="relative text-white">
                    {isRecording ? <StopIcon className="w-8 h-8" /> : <MicrophoneIcon className="w-12 h-12 text-cyan-500" />}
                </div>
            </button>
            
            <style>
                {`
                .bg-grid-pattern {
                    background-image: linear-gradient(rgba(0, 180, 255, 0.03) 1px, transparent 1px), linear-gradient(to right, rgba(0, 180, 255, 0.03) 1px, transparent 1px);
                    background-size: 2rem 2rem;
                }
                .dark .bg-grid-pattern-dark {
                    background-image: linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
                    background-size: 2rem 2rem;
                }
                @keyframes pulsate {
                    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 187, 255, 0.3); }
                    50% { transform: scale(1.05); box-shadow: 0 0 20px 10px rgba(0, 187, 255, 0); }
                }
                .animate-pulsate {
                    animation: pulsate 2.5s infinite ease-in-out;
                }
                @keyframes wave {
                    0% { transform: scaleY(0.1); opacity: 0.3; }
                    100% { transform: scaleY(1); opacity: 1; }
                }
                `}
            </style>
        </div>
    );
};
