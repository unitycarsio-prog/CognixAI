
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { VideoIcon, SparklesIcon, DownloadIcon } from './Icons';

// Helper to safely access aistudio methods
const getAiStudio = () => (window as any).aistudio;

export const VideoView: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [videoUri, setVideoUri] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasKey, setHasKey] = useState<boolean>(false);
    const [checkingKey, setCheckingKey] = useState(true);

    useEffect(() => {
        checkKey();
    }, []);

    const checkKey = async () => {
        setCheckingKey(true);
        try {
            const aistudio = getAiStudio();
            if (aistudio && aistudio.hasSelectedApiKey) {
                const selected = await aistudio.hasSelectedApiKey();
                setHasKey(selected);
            }
        } catch (e) {
            console.error("Error checking API key:", e);
        } finally {
            setCheckingKey(false);
        }
    };

    const handleSelectKey = async () => {
        try {
            const aistudio = getAiStudio();
            if (aistudio && aistudio.openSelectKey) {
                await aistudio.openSelectKey();
                // Race condition mitigation: Assume success after dialog interaction
                setHasKey(true);
            }
        } catch (e) {
            console.error("Error opening key selector:", e);
        }
    };

    const handleGenerate = async () => {
        if (!prompt.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);
        setVideoUri(null);

        try {
            // Re-initialize AI client to ensure we use the latest selected key
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            let operation = await ai.models.generateVideos({
                model: 'veo-3.1-fast-generate-preview',
                prompt: prompt.trim(),
                config: {
                    numberOfVideos: 1,
                    resolution: '720p',
                    aspectRatio: '16:9'
                }
            });

            // Polling loop
            while (!operation.done) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                operation = await ai.operations.getVideosOperation({ operation: operation });
            }

            if (operation.error) {
                throw new Error(operation.error.message || "Video generation failed.");
            }

            const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
            if (!uri) {
                throw new Error("No video URI returned.");
            }

            // Append key for playback/download
            setVideoUri(`${uri}&key=${process.env.API_KEY}`);
            setPrompt('');

        } catch (err) {
            console.error("Video Generation Error:", err);
            let errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            
            if (errorMessage.includes("Requested entity was not found")) {
                setHasKey(false); // Reset key state to force re-selection
                errorMessage = "API Key issue detected. Please select your paid API key again.";
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    if (checkingKey) {
        return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-blue-600 rounded-full animate-spin"></div></div>;
    }

    if (!hasKey) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
                    <VideoIcon className="w-16 h-16 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Video Generation Requires a Paid Key</h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">
                    To use the Veo model for video generation, you must select a paid API key from your Google Cloud project.
                </p>
                <button 
                    onClick={handleSelectKey}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                    Select API Key
                </button>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="mt-4 text-sm text-blue-700 hover:underline">
                    Learn more about billing
                </a>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
                <div className="w-full max-w-3xl text-center">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-600 dark:text-gray-300">Generating video with Veo... This may take a minute.</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                            <h3 className="font-bold">Generation Failed</h3>
                            <p className="whitespace-pre-wrap mt-1">{error}</p>
                            {error.includes("Key") && (
                                <button onClick={handleSelectKey} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                                    Select Key Again
                                </button>
                            )}
                        </div>
                    ) : videoUri ? (
                        <div className="space-y-4 animate-fade-in-up">
                            <div className="relative rounded-xl overflow-hidden shadow-2xl bg-black aspect-video">
                                <video 
                                    controls 
                                    autoPlay 
                                    loop 
                                    className="w-full h-full"
                                    src={videoUri}
                                >
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                            <div className="flex justify-center">
                                <a 
                                    href={videoUri} 
                                    download="veo-generation.mp4"
                                    className="flex items-center gap-2 px-6 py-2 bg-gray-800 hover:bg-gray-900 text-white rounded-full transition-colors"
                                >
                                    <DownloadIcon className="w-5 h-5" />
                                    Download Video
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 animate-fade-in">
                            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
                                <VideoIcon className="w-16 h-16 text-blue-600" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Veo Video Generation</h2>
                            <p className="mt-2 max-w-md text-lg">
                                Turn your text prompts into high-quality 1080p videos.
                            </p>
                        </div>
                    )}
                </div>
            </div>
            <div className="p-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700">
                <div className="max-w-3xl mx-auto">
                    <div className="relative">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); }}}
                            placeholder="Describe the video you want to create (e.g., A neon hologram of a cat driving at top speed)..."
                            className="w-full p-4 pr-36 bg-gray-100 dark:bg-gray-800 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:outline-none resize-none transition-all shadow-sm"
                            rows={2}
                            disabled={isLoading}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <button
                                onClick={handleGenerate}
                                disabled={!prompt.trim() || isLoading}
                                className="px-6 py-2.5 flex items-center gap-2 rounded-xl bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
                                aria-label="Generate Video"
                            >
                                <SparklesIcon className="w-5 h-5" />
                                Generate
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
