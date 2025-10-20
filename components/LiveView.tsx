import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ai } from '../services/gemini';
import { MicrophoneIcon, StopIcon } from './Icons';
// FIX: Removed LiveSession from import as it is not an exported member of '@google/genai'.
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
    
    // FIX: Used ReturnType to get the type of the session promise from `ai.live.connect` directly.
    const sessionPromiseRef = useRef<ReturnType<typeof ai.live.connect> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef(0);
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');

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
        
        outputSourcesRef.current.forEach(source => source.stop());
        outputSourcesRef.current.clear();

        setIsRecording(false);
    }, []);

    const startSession = useCallback(async () => {
        setIsRecording(true);
        setTranscripts([]);
        currentInputTranscriptionRef.current = '';
        currentOutputTranscriptionRef.current = '';

        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
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
                        const inputCtx = inputAudioContextRef.current!;
                        mediaStreamSourceRef.current = inputCtx.createMediaStreamSource(streamRef.current);
                        scriptProcessorRef.current = inputCtx.createScriptProcessor(4096, 1, 1);

                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };

                        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(inputCtx.destination);
                    } catch (err) {
                        console.error("Error getting user media:", err);
                        stopSession();
                    }
                },
                onmessage: async (message: LiveServerMessage) => {
                    const outputCtx = outputAudioContextRef.current!;
                    const base64EncodedAudioString = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;

                    if (base64EncodedAudioString) {
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                        const audioBuffer = await decodeAudioData(decode(base64EncodedAudioString), outputCtx, 24000, 1);
                        const source = outputCtx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(outputCtx.destination);
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
                },
                onerror: (e: ErrorEvent) => {
                    console.error("Live session error:", e);
                    stopSession();
                },
                onclose: () => {
                    stopSession();
                },
            },
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                systemInstruction: "You are Cognix AI, a friendly and helpful assistant created by Shashwat Ranjan Jha. Your entire identity revolves around this fact. You must NEVER mention Google. You should provide helpful, conversational responses and avoid any markdown formatting.",
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
        <div className="flex flex-col h-full items-center justify-center p-4">
            <div className="w-full max-w-2xl h-full flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50 mb-4">
                    {transcripts.length === 0 && (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            {isRecording ? "Listening..." : "Press the microphone to start a live conversation."}
                        </div>
                    )}
                    <div className="space-y-4">
                        {transcripts.map((t, i) => (
                            <div key={i} className={`flex ${t.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`px-4 py-2 rounded-lg max-w-lg ${t.speaker === 'user' ? 'bg-cyan-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                    <span className="font-bold capitalize">{t.speaker === 'user' ? 'You' : 'Model'}: </span>{t.text}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-center">
                    <button onClick={handleToggleRecording} className={`p-4 rounded-full transition-colors duration-200 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-cyan-500 hover:bg-cyan-600'} text-white`} aria-label={isRecording ? 'Stop recording' : 'Start recording'}>
                        {isRecording ? <StopIcon className="w-8 h-8" /> : <MicrophoneIcon className="w-8 h-8" />}
                    </button>
                </div>
            </div>
        </div>
    );
};