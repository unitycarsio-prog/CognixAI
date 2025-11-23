
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
                    setIsRecording(false);
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction: "You are Cognix AI. Be concise and professional. Do not use excessive markdown.",
            },
        });
    }, [stopSession]);

    const handleToggleRecording = () => {
        isRecording ? stopSession() : startSession();
    };

    useEffect(() => { return () => { stopSession(); }; }, [stopSession]);

    return (
        <div className="flex flex-col h-full items-center justify-center p-4 relative overflow-hidden">
            <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 text-center transition-all duration-500 z-10 ${isRecording ? 'opacity-0 -translate-y-8' : 'opacity-100 translate-y-0'}`}>
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                     <MicrophoneIcon className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Live Mode</h2>
                <p className="mt-2 max-w-md text-gray-500 dark:text-gray-400 text-base">Talk to Cognix naturally in real-time.</p>
            </div>

            <div ref={transcriptContainerRef} className={`w-full max-w-3xl h-full pt-4 pb-40 overflow-y-auto space-y-4 transition-opacity duration-500 z-10 ${isRecording ? 'opacity-100' : 'opacity-0'}`}>
                {transcripts.map((t, i) => (
                    <div key={i} className={`flex items-end gap-2 animate-fade-in-up ${t.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {t.speaker === 'model' && <div className="w-8 h-8 rounded-full bg-black dark:bg-white flex items-center justify-center"><BotIcon className="w-4 h-4 text-white dark:text-black"/></div>}
                        <div className={`px-5 py-3 rounded-lg max-w-lg text-base ${t.speaker === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100'}`}>
                            {t.text}
                        </div>
                    </div>
                ))}
            </div>

            <div className={`absolute bottom-0 left-0 right-0 h-48 flex justify-center items-end pb-10 gap-1 transition-opacity duration-500 ${isRecording ? 'opacity-100' : 'opacity-0'}`}>
                {Array.from({ length: 30 }).map((_, i) => (
                    <div
                        key={i}
                        className="w-1.5 bg-blue-600 rounded-full"
                        style={{
                            height: `${Math.random() * 50 + 10}%`,
                            animation: `wave 1s ease-in-out ${i * 0.05}s infinite alternate`
                        }}
                    ></div>
                ))}
            </div>

            <button 
                onClick={handleToggleRecording} 
                className={`group absolute z-20 flex items-center justify-center rounded-full shadow-xl transition-all duration-500 ease-out
                    ${isRecording 
                        ? 'bottom-10 w-16 h-16 bg-red-600 hover:bg-red-700 rotate-0' 
                        : 'top-1/2 -translate-y-1/2 w-24 h-24 bg-blue-600 hover:bg-blue-700'}`}
            >
                {isRecording ? <StopIcon className="w-6 h-6 text-white" /> : <MicrophoneIcon className="w-8 h-8 text-white" />}
            </button>
            
            <style>
                {`
                @keyframes wave { 0% { transform: scaleY(0.2); } 100% { transform: scaleY(1); } }
                `}
            </style>
        </div>
    );
};
