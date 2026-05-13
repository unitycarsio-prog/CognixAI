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
        <div className="flex flex-col h-full bg-white dark:bg-[#020617] items-center justify-center p-6 relative overflow-hidden">
            {isCameraOn && status === 'active' && (
                <div className="absolute inset-0 bg-black z-0">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-40 blur-sm" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent"></div>
                </div>
            )}

            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20 dark:opacity-40">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-blue-500/20 rounded-full animate-[spin_20s_linear_infinite]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-blue-500/10 rounded-full animate-[spin_15s_linear_infinite_reverse]"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-blue-500/5 rounded-full animate-[spin_10s_linear_infinite]"></div>
            </div>
            
            <div className="z-10 text-center max-w-xl w-full">
                <div className="relative mb-16 inline-block">
                    <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl transition-all duration-700 relative z-10 ${status === 'active' ? 'bg-blue-600 scale-110' : 'bg-slate-900 dark:bg-white dark:text-slate-900'}`}>
                        {status === 'active' ? (
                           <div className="flex gap-1 items-end h-8">
                              <div className="w-1.5 bg-white rounded-full animate-[audio-bar_0.5s_ease-in-out_infinite_alternate]"></div>
                              <div className="w-1.5 bg-white/60 rounded-full animate-[audio-bar_0.7s_ease-in-out_infinite_alternate_0.2s] h-10"></div>
                              <div className="w-1.5 bg-white/40 rounded-full animate-[audio-bar_0.4s_ease-in-out_infinite_alternate_0.1s] h-6"></div>
                              <div className="w-1.5 bg-white/80 rounded-full animate-[audio-bar_0.6s_ease-in-out_infinite_alternate_0.3s] h-12"></div>
                           </div>
                        ) : (
                           <MicrophoneIcon className="w-14 h-14" />
                        )}
                    </div>
                    {status === 'active' && (
                       <>
                          <div className="absolute inset-0 bg-blue-600 blur-3xl opacity-40 animate-pulse rounded-full"></div>
                          <div className="absolute -inset-10 border border-blue-600/30 rounded-full animate-ping"></div>
                       </>
                    )}
                </div>

                <div className="space-y-4 mb-20">
                   <div className="flex items-center justify-center gap-4 mb-2">
                      <div className="px-4 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full">
                         <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.4em]">Neural Link Status: {status.toUpperCase()}</span>
                      </div>
                   </div>
                   <h2 className="text-5xl lg:text-7xl font-bold text-slate-900 dark:text-white tracking-tighter italic serif">Cognix Live.</h2>
                   <p className="text-slate-500 dark:text-slate-400 font-medium text-xl max-w-sm mx-auto leading-relaxed italic serif italic">
                      Zero-latency voice synthesis protocol. Speak naturally.
                   </p>
                </div>
                
                <div className="flex gap-8 justify-center items-center">
                    <button 
                      onClick={() => setIsCameraOn(!isCameraOn)} 
                      className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all shadow-xl active:scale-90 border-2 ${isCameraOn ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-blue-500/50'}`}
                    >
                        <CameraIcon className="w-7 h-7" />
                    </button>
                    
                    <button 
                      onClick={() => status === 'active' ? stopSession() : startSession()} 
                      className={`w-28 h-28 rounded-full transition-all shadow-[0_0_50px_rgba(59,130,246,0.3)] flex items-center justify-center active:scale-90 group relative ${status === 'active' ? 'bg-red-600' : 'bg-blue-600'}`}
                    >
                        {status === 'active' ? <StopIcon className="w-12 h-12 text-white" /> : <MicrophoneIcon className="w-12 h-12 text-white" />}
                        <div className="absolute -bottom-14 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                           <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">{status === 'active' ? 'Kill Session' : 'Ignite Uplink'}</span>
                        </div>
                    </button>

                    <button 
                      disabled={!isCameraOn}
                      onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')} 
                      className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all shadow-xl active:scale-90 border-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:border-blue-500/50 disabled:opacity-20`}
                    >
                        <FlipCameraIcon className="w-7 h-7" />
                    </button>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes audio-bar {
                from { height: 8px; }
                to { height: 32px; }
              }
            `}} />
        </div>
    );
};