import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MicrophoneIcon, StopIcon, BotIcon, UserIcon, CameraIcon, FlipCameraIcon } from './Icons';
import type { LiveServerMessage, Blob } from '@google/genai';
import { Modality } from '@google/genai';
import type { ThemeColors } from '../types';

function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) { binary += String.fromCharCode(bytes[i]); }
    return btoa(binary);
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) { bytes[i] = binaryString.charCodeAt(i); }
    return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) { channelData[i] = dataInt16[i * numChannels + channel] / 32768.0; }
    }
    return buffer;
}

export const LiveView: React.FC<{ theme?: ThemeColors }> = () => {
    const [status, setStatus] = useState<'idle' | 'connecting' | 'active'>('idle');
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    
    const sessionPromiseRef = useRef<any>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const outputNodeRef = useRef<GainNode | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef(0);

    const stopSession = useCallback(async () => {
        setStatus('idle');
        if (sessionPromiseRef.current) {
            try {
                const session = await sessionPromiseRef.current;
                session.close();
            } catch (e) {}
            sessionPromiseRef.current = null;
        }
        streamRef.current?.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        
        if (inputAudioContextRef.current?.state !== 'closed') await inputAudioContextRef.current?.close();
        if (outputAudioContextRef.current?.state !== 'closed') await outputAudioContextRef.current?.close();
        
        outputSourcesRef.current.forEach(source => { try { source.stop(); } catch(e) {} });
        outputSourcesRef.current.clear();
    }, []);

    const startSession = useCallback(async () => {
        setStatus('connecting');
        try {
            const apiKey = process.env.API_KEY;
            if (!apiKey) throw new Error("API Key missing");

            const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            if (inputCtx.state === 'suspended') await inputCtx.resume();
            if (outputCtx.state === 'suspended') await outputCtx.resume();

            const outputNode = outputCtx.createGain();
            outputNode.connect(outputCtx.destination);
            inputAudioContextRef.current = inputCtx;
            outputAudioContextRef.current = outputCtx;
            outputNodeRef.current = outputNode;
            nextStartTimeRef.current = 0;

            const ai = new GoogleGenAI({ apiKey });
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: async () => {
                        try {
                            const constraints = { 
                                audio: true, 
                                video: isCameraOn ? { facingMode } : false 
                            };
                            streamRef.current = await navigator.mediaDevices.getUserMedia(constraints);
                            if (videoRef.current && isCameraOn) videoRef.current.srcObject = streamRef.current;
                            
                            mediaStreamSourceRef.current = inputAudioContextRef.current!.createMediaStreamSource(streamRef.current);
                            scriptProcessorRef.current = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                            scriptProcessorRef.current.onaudioprocess = (e) => {
                                const l = e.inputBuffer.getChannelData(0).length;
                                const int16 = new Int16Array(l);
                                const data = e.inputBuffer.getChannelData(0);
                                for (let i = 0; i < l; i++) { int16[i] = data[i] * 32768; }
                                
                                sessionPromiseRef.current?.then((session: any) => {
                                    session.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } });
                                });
                            };
                            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                            scriptProcessorRef.current.connect(inputAudioContextRef.current!.destination);
                            setStatus('active');
                        } catch (err) { 
                            console.error(err);
                            stopSession(); 
                        }
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        const interrupted = message.serverContent?.interrupted;
                        if (interrupted) {
                            for (const source of outputSourcesRef.current.values()) {
                                try { source.stop(); } catch(e) {}
                                outputSourcesRef.current.delete(source);
                            }
                            nextStartTimeRef.current = 0;
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                            const buffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                            const source = outputAudioContextRef.current.createBufferSource();
                            source.buffer = buffer;
                            source.connect(outputNodeRef.current!);
                            
                            source.addEventListener('ended', () => {
                                outputSourcesRef.current.delete(source);
                            });

                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += buffer.duration;
                            outputSourcesRef.current.add(source);
                        }
                    },
                    onerror: (e) => {
                      console.error("Live session error", e);
                      stopSession();
                    },
                    onclose: () => setStatus('idle'),
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    systemInstruction: "You are Clora Live. Be helpful, professional, and warm in voice chat.",
                },
            });
        } catch (e) { 
            console.error(e);
            setStatus('idle'); 
        }
    }, [stopSession, isCameraOn, facingMode]);

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900 items-center justify-center p-6 relative">
            {isCameraOn && status === 'active' && (
                <div className="absolute inset-0 bg-black z-0">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-60" />
                </div>
            )}
            
            <div className="z-10 text-center max-w-md">
                <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center text-white shadow-2xl mx-auto mb-10 transition-all ${status === 'active' ? 'bg-red-600 animate-pulse scale-110' : 'bg-blue-600'}`}>
                    <MicrophoneIcon className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter italic uppercase">Talk to Clora</h2>
                <p className="text-slate-500 mb-14 font-medium px-4">Experience instant, natural voice interaction with our core neural engine.</p>
                
                <div className="flex gap-5 justify-center">
                    <button onClick={() => setIsCameraOn(!isCameraOn)} className={`p-5 rounded-3xl transition-all shadow-md active:scale-95 ${isCameraOn ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-400'}`}>
                        <CameraIcon className="w-6 h-6" />
                    </button>
                    {isCameraOn && (
                        <button onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')} className="p-5 rounded-3xl bg-white dark:bg-slate-800 text-slate-400 shadow-md active:scale-95">
                            <FlipCameraIcon className="w-6 h-6" />
                        </button>
                    )}
                    <button onClick={() => status === 'active' ? stopSession() : startSession()} className={`p-8 rounded-3xl transition-all shadow-2xl active:scale-90 ${status === 'active' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                        {status === 'active' ? <StopIcon className="w-10 h-10" /> : <MicrophoneIcon className="w-10 h-10" />}
                    </button>
                </div>
                
                <div className="mt-12">
                   <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-6 py-3 bg-slate-100 dark:bg-slate-800/60 rounded-full border border-slate-200 dark:border-slate-800">
                       Uplink Status: {status.toUpperCase()}
                   </span>
                </div>
            </div>
        </div>
    );
};