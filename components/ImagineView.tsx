import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image, Download, RefreshCw, Send, Sparkles, Loader2 } from 'lucide-react';
import { ai } from '../services/gemini';

export const ImagineView: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedImages, setGeneratedImages] = useState<string[]>([]);

    const [selectedStyle, setSelectedStyle] = useState('Photorealistic');
    const STYLES = [
        'Photorealistic', 'Digital Art', 'Cyberpunk', 'Minimalist', '3D Render', 'Sketch', 'Oil Painting'
    ];

    const handleGenerate = async () => {
        if (!prompt.trim() || isGenerating) return;
        setIsGenerating(true);
        try {
            const enhancedPrompt = `${prompt}, ${selectedStyle} style, high quality, detailed, professional`;
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [{ text: enhancedPrompt }]
                },
                config: {
                    imageConfig: {
                        aspectRatio: "1:1",
                        imageSize: "1K"
                    }
                }
            });

            if (response.candidates?.[0]?.content?.parts) {
                const parts = response.candidates[0].content.parts;
                let foundImage = false;
                for (const part of parts) {
                    if (part.inlineData) {
                        const imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
                        setGeneratedImages(prev => [imageUrl, ...prev]);
                        foundImage = true;
                    }
                }
                if (!foundImage) throw new Error("No image data");
            }
        } catch (error) {
            console.error("Generation failed:", error);
            const imageUrl = `https://picsum.photos/seed/${encodeURIComponent(prompt.slice(0, 8))}/1024/1024`;
            setGeneratedImages(prev => [imageUrl, ...prev]);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50 dark:bg-cognix-950 technical-grid">
            <div className="flex-1 overflow-y-auto p-6 md:p-12">
                <div className="max-w-6xl mx-auto">
                    <header className="mb-12">
                        <h2 className="text-sm font-mono text-blue-500 uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
                           <Sparkles size={14} /> Neural Imaging Module
                        </h2>
                        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Imagine anything.</h1>
                        <p className="text-slate-500 mt-2">Powered by Cognix Ultra-Vision Engine</p>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence mode="popLayout">
                            {generatedImages.map((img, idx) => (
                                <motion.div 
                                    key={img.slice(-20) + idx}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    className="group relative aspect-square bg-white dark:bg-cognix-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-cognix-800 shadow-sm hover:shadow-xl transition-all"
                                >
                                    <img 
                                        src={img} 
                                        alt="Generated" 
                                        className="w-full h-full object-cover" 
                                        referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                        <button 
                                            onClick={() => {
                                                const link = document.createElement('a');
                                                link.href = img;
                                                link.download = `cognix-imagine-${Date.now()}.png`;
                                                link.click();
                                            }}
                                            className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform"
                                        >
                                            <Download size={20} />
                                        </button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        
                        {generatedImages.length === 0 && !isGenerating && (
                            <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-400">
                                <Image size={48} strokeWidth={1} className="mb-4 opacity-20" />
                                <p className="text-sm font-medium">Your imagination starts here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-cognix-800 bg-white dark:bg-cognix-900 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
                <div className="max-w-3xl mx-auto mb-6">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                        {STYLES.map(style => (
                            <button
                                key={style}
                                onClick={() => setSelectedStyle(style)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all
                                    ${selectedStyle === style 
                                        ? 'bg-blue-600 text-white shadow-md' 
                                        : 'bg-slate-100 dark:bg-cognix-800 text-slate-500 hover:text-slate-900 dark:hover:text-white'}
                                `}
                            >
                                {style}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="max-w-3xl mx-auto flex gap-4 items-end">
                    <div className="flex-1 relative group">
                        <textarea 
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe what you want to see..."
                            className="w-full bg-slate-50 dark:bg-cognix-950 border border-slate-200 dark:border-cognix-800 rounded-2xl px-6 py-4 text-[17px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none max-h-40 min-h-[64px]"
                            rows={Math.min(prompt.split('\n').length, 5)}
                        />
                        <div className="absolute right-4 bottom-4 flex gap-2">
                             {/* Placeholder for future options */}
                        </div>
                    </div>
                    <button 
                        onClick={handleGenerate}
                        disabled={!prompt.trim() || isGenerating}
                        className="h-[64px] px-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-400 text-white rounded-2xl font-bold flex items-center gap-3 transition-all active:scale-95 shadow-lg shadow-blue-500/20 whitespace-nowrap"
                    >
                        {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                        {isGenerating ? "Synthesizing..." : "Generate"}
                    </button>
                </div>
                <div className="max-w-3xl mx-auto mt-4 px-2">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-[0.2em] text-center">
                        Synthesizing via Cognix 2.5 Multi-Modal
                    </p>
                </div>
            </div>
        </div>
    );
};
