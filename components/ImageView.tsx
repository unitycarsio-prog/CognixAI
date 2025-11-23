
import React, { useState } from 'react';
import { ai } from '../services/gemini';
import { DownloadIcon, ImageIcon, SparklesIcon } from './Icons';

const addWatermark = async (base64ImageUrl: string): Promise<string> => {
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
            const iconSize = Math.max(20, Math.min(img.width, img.height) * 0.04);
            const fontSize = Math.max(12, Math.min(img.width, img.height) * 0.025);
            const padding = iconSize * 0.3;
            const borderRadius = iconSize * 0.2;
  
            ctx.font = `bold ${fontSize}px sans-serif`;
            const watermarkText = 'Cognix AI';
            const textMetrics = ctx.measureText(watermarkText);
            const textWidth = textMetrics.width;
            
            const watermarkWidth = iconSize + textWidth + padding * 3;
            const watermarkHeight = iconSize + padding * 2;
            
            const x = canvas.width - watermarkWidth - margin;
            const y = canvas.height - watermarkHeight - margin;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.beginPath();
            ctx.moveTo(x + borderRadius, y);
            ctx.lineTo(x + watermarkWidth - borderRadius, y);
            ctx.quadraticCurveTo(x + watermarkWidth, y, x + watermarkWidth, y + borderRadius);
            ctx.lineTo(x + watermarkWidth, y + watermarkHeight - borderRadius);
            ctx.quadraticCurveTo(x + watermarkWidth, y + watermarkHeight, x + watermarkWidth - borderRadius, y + watermarkHeight);
            ctx.lineTo(x + borderRadius, y + watermarkHeight);
            ctx.quadraticCurveTo(x, y + watermarkHeight, x, y + watermarkHeight - borderRadius);
            ctx.lineTo(x, y + borderRadius);
            ctx.quadraticCurveTo(x, y, x + borderRadius, y);
            ctx.closePath();
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
                ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                ctx.shadowBlur = 3;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                ctx.fillText(watermarkText, x + iconSize + padding * 2, y + watermarkHeight / 2 + 1);
                resolve(canvas.toDataURL('image/png'));
              } catch(e) { reject(e); } finally { URL.revokeObjectURL(svgUrl); }
            };
            iconImg.onerror = (err) => {
              URL.revokeObjectURL(svgUrl); reject(err);
            };
            iconImg.src = svgUrl;
          } catch (e) { reject(e); }
        };
        img.onerror = (err) => reject(err);
        img.src = base64ImageUrl;
      });
    } catch (error) {
      console.error("Watermarking failed, returning original image.", error);
      return base64ImageUrl;
    }
};

export const ImageView: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim() || isLoading) return;

        setIsLoading(true);
        setGeneratedImage(null);
        setError(null);

        try {
            // Using gemini-2.5-flash-image (Imagen 1 equivalent)
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { text: `Create an image of ${prompt.trim()}` }
                    ],
                },
                config: {
                   // Note: responseMimeType and responseSchema are NOT supported for this model.
                }
            });
            
            let foundImage = false;
            let textResponse = "";

            if (response.candidates && response.candidates.length > 0) {
                for (const part of response.candidates[0].content.parts) {
                    if (part.inlineData) {
                        const base64EncodeString = part.inlineData.data;
                        const mimeType = part.inlineData.mimeType || 'image/png';
                        const fullBase64Url = `data:${mimeType};base64,${base64EncodeString}`;
                        const watermarkedImageUrl = await addWatermark(fullBase64Url);
                        setGeneratedImage(watermarkedImageUrl);
                        foundImage = true;
                        break;
                    } else if (part.text) {
                        textResponse += part.text;
                    }
                }
            }

            if (!foundImage) {
                 if (textResponse) {
                    throw new Error(textResponse);
                }
                throw new Error("The model did not return an image. This could be due to content safety filters or the prompt not triggering image generation.");
            }
            
            setPrompt('');

        } catch (err) {
            console.error("Image Generation Error:", err);
            let errorMessage = err instanceof Error ? err.message : "An unknown error occurred during image generation.";
            
            const safetyKeywords = ['SAFETY', 'PROHIBITED_CONTENT', 'PUBLIC', 'CELEBRITY', 'HARASSMENT'];
            const isSafetyError = safetyKeywords.some(keyword => errorMessage.toUpperCase().includes(keyword));

            if (isSafetyError) {
                errorMessage += "\n\nNote: Generating images of specific people, especially public figures, is often restricted. Please try a more generic prompt.";
            }
            
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `cognix-ai-imagen-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleGenerate();
        }
    };

    return (
        <div className="flex flex-col h-full">
            {fullScreenImage && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
                    onClick={() => setFullScreenImage(null)}
                    role="dialog"
                    aria-modal="true"
                >
                    <img
                        src={fullScreenImage}
                        alt="Full screen view"
                        className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button
                        onClick={() => setFullScreenImage(null)}
                        className="absolute top-4 right-4 text-white/80 text-5xl font-light hover:text-white transition-colors"
                        aria-label="Close full screen view"
                    >
                        &times;
                    </button>
                </div>
            )}
            <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
                <div className="w-full max-w-2xl text-center">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-600 dark:text-gray-300">Creating masterpiece with Imagen 1...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                            <h3 className="font-bold">Generation Failed</h3>
                            <p className="whitespace-pre-wrap mt-1">{error}</p>
                        </div>
                    ) : generatedImage ? (
                        <div className="relative group animate-fade-in-up">
                            <img
                                src={generatedImage}
                                alt="Generated by Cognix AI"
                                className="rounded-xl shadow-2xl mx-auto max-h-[60vh] cursor-zoom-in transition-transform group-hover:scale-[1.02]"
                                onClick={() => setFullScreenImage(generatedImage)}
                            />
                            <button
                                onClick={handleDownload}
                                className="absolute top-4 right-4 p-3 bg-black/60 hover:bg-black/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm"
                                aria-label="Download image"
                            >
                                <DownloadIcon className="w-6 h-6" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400 animate-fade-in">
                            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-6">
                                <ImageIcon className="w-16 h-16 text-blue-600" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Imagen 1</h2>
                            <p className="mt-2 max-w-md text-lg">
                                Generate fast, high-quality images from text prompts.
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
                            onKeyDown={handleKeyDown}
                            placeholder="Describe the image you want to create in detail..."
                            className="w-full p-4 pr-36 bg-gray-100 dark:bg-gray-800 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:outline-none resize-none transition-all shadow-sm"
                            rows={2}
                            disabled={isLoading}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <button
                                onClick={handleGenerate}
                                disabled={!prompt.trim() || isLoading}
                                className="px-6 py-2.5 flex items-center gap-2 rounded-xl bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
                                aria-label="Generate Image"
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
