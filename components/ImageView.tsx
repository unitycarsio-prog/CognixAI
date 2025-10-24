import React, { useState, useRef } from 'react';
import { ai } from '../services/gemini';
import { BotIcon, DownloadIcon, ImageIcon, SparklesIcon } from './Icons';
import { Modality } from '@google/genai';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

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

type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
const aspectRatios: AspectRatio[] = ['1:1', '16:9', '9:16', '4:3', '3:4'];

export const ImageView: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [uploadedImage, setUploadedImage] = useState<File | null>(null);
    const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
    const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setUploadedImage(file);
            setUploadedImagePreview(URL.createObjectURL(file));
            setGeneratedImage(null);
            setError(null);
            e.target.value = '';
        }
    };

    const handleGenerate = async () => {
        if ((!prompt.trim() && !uploadedImage) || isLoading) return;

        setIsLoading(true);
        setGeneratedImage(null);
        setError(null);

        try {
            if (uploadedImage) {
                // --- EDITING LOGIC ---
                const apiParts: ({ text: string } | { inlineData: { mimeType: string; data: string; } })[] = [];
                const base64Data = await fileToBase64(uploadedImage);
                apiParts.push({
                    inlineData: { mimeType: uploadedImage.type, data: base64Data },
                });
                if (prompt.trim()) {
                    apiParts.push({ text: prompt.trim() });
                }
                
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: { parts: apiParts },
                    config: { responseModalities: [Modality.IMAGE] },
                });

                const candidate = response.candidates?.[0];

                if (response.promptFeedback?.blockReason) {
                    let errorMessage = `Image generation was blocked.\nReason: ${response.promptFeedback.blockReason}.`;
                    const blockedRatings = response.promptFeedback.safetyRatings?.filter(r => r.probability !== 'NEGLIGIBLE' && r.probability !== 'LOW');
                    if (blockedRatings && blockedRatings.length > 0) {
                        errorMessage += `\nBlocked Categories: ${blockedRatings.map(r => r.category.replace('HARM_CATEGORY_', '')).join(', ')}.`;
                    }
                    throw new Error(errorMessage);
                }
                if (candidate && candidate.finishReason && candidate.finishReason !== 'STOP') {
                    let errorMessage = `Image generation failed.\nReason: ${candidate.finishReason}.`;
                    const safetyRatings = candidate.safetyRatings?.filter(r => r.probability !== 'NEGLIGIBLE' && r.probability !== 'LOW');
                    if (safetyRatings && safetyRatings.length > 0) {
                        errorMessage += `\nTriggered Categories: ${safetyRatings.map(r => r.category.replace('HARM_CATEGORY_', '')).join(', ')}.`;
                    }
                    throw new Error(errorMessage);
                }
                const imagePart = candidate?.content?.parts?.find(p => p.inlineData);
                const generatedImageBytes = imagePart?.inlineData?.data;

                if (!generatedImageBytes) {
                    let finalErrorMessage = "The model did not return an image. This could be due to a content issue with the prompt or a temporary model error.";
                    const allSafetyRatings = candidate?.safetyRatings;
                    if (allSafetyRatings && allSafetyRatings.length > 0) {
                        const highProbRatings = allSafetyRatings.filter(r => r.probability !== 'NEGLIGIBLE' && r.probability !== 'LOW');
                        if (highProbRatings.length > 0) {
                            let errorMessage = `Image generation was blocked due to safety filters.`;
                            errorMessage += `\nTriggered Categories: ${highProbRatings.map(r => r.category.replace('HARM_CATEGORY_', '')).join(', ')}.`;
                            throw new Error(errorMessage);
                        } else {
                            finalErrorMessage = "The model did not return an image. While no high-risk content was detected, the prompt may have touched on sensitive topics. Please try rephrasing your prompt.";
                        }
                    }
                    if (!candidate) {
                        finalErrorMessage = "The model returned an empty response. This could be a network issue or an unfulfillable prompt."
                    }
                    throw new Error(finalErrorMessage);
                }
                
                const fullBase64Url = `data:${imagePart?.inlineData?.mimeType};base64,${generatedImageBytes}`;
                const watermarkedImageUrl = await addWatermark(fullBase64Url);
                setGeneratedImage(watermarkedImageUrl);

            } else {
                // --- GENERATION LOGIC ---
                if (!prompt.trim()) throw new Error("A prompt is required for image generation.");

                const response = await ai.models.generateImages({
                    model: 'imagen-4.0-generate-001',
                    prompt: prompt.trim(),
                    config: {
                        numberOfImages: 1,
                        outputMimeType: 'image/png',
                        aspectRatio: aspectRatio,
                    },
                });
                
                if (response.promptFeedback?.blockReason) {
                    let errorMessage = `Image generation was blocked.\nReason: ${response.promptFeedback.blockReason}.`;
                    const blockedRatings = response.promptFeedback.safetyRatings?.filter(r => r.probability !== 'NEGLIGIBLE' && r.probability !== 'LOW');
                    if (blockedRatings && blockedRatings.length > 0) {
                        errorMessage += `\nBlocked Categories: ${blockedRatings.map(r => r.category.replace('HARM_CATEGORY_', '')).join(', ')}.`;
                    }
                    throw new Error(errorMessage);
                }

                const generatedImageBytes = response.generatedImages?.[0]?.image?.imageBytes;

                if (!generatedImageBytes) {
                    let finalErrorMessage = "The model did not return an image. This could be due to safety filters or an issue with the prompt.";
                    const allSafetyRatings = response.promptFeedback?.safetyRatings;
                    if (allSafetyRatings && allSafetyRatings.length > 0) {
                        const highProbRatings = allSafetyRatings.filter(r => r.probability !== 'NEGLIGIBLE' && r.probability !== 'LOW');
                        if (highProbRatings.length > 0) {
                            let errorMessage = `Image generation was blocked due to safety filters.`;
                            errorMessage += `\nTriggered Categories: ${highProbRatings.map(r => r.category.replace('HARM_CATEGORY_', '')).join(', ')}.`;
                            throw new Error(errorMessage);
                        } else {
                             finalErrorMessage = "The model did not return an image. While no high-risk content was detected, the prompt may have touched on sensitive topics. Please try rephrasing your prompt.";
                        }
                    }
                    throw new Error(finalErrorMessage);
                }

                const fullBase64Url = `data:image/png;base64,${generatedImageBytes}`;
                const watermarkedImageUrl = await addWatermark(fullBase64Url);
                setGeneratedImage(watermarkedImageUrl);
            }
            
            // Clear inputs on success
            setUploadedImage(null);
            setUploadedImagePreview(null);
            setPrompt('');

        } catch (err) {
            console.error("Image Generation Error:", err);
            let errorMessage = err instanceof Error ? err.message : "An unknown error occurred during image generation.";
            
            const safetyKeywords = ['SAFETY', 'PROHIBITED_CONTENT', 'PUBLIC', 'CELEBRITY', 'HARASSMENT'];
            const isSafetyError = safetyKeywords.some(keyword => errorMessage.toUpperCase().includes(keyword));

            if (isSafetyError) {
                errorMessage += "\n\nNote: Generating images of specific people, especially public figures, is often restricted to prevent misuse. Please try a more generic prompt.";
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
        link.download = `cognix-ai-image-${Date.now()}.png`;
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
                            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-600 dark:text-gray-300">Generating your vision...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300">
                            <h3 className="font-bold">Generation Failed</h3>
                            <p className="whitespace-pre-wrap mt-1">{error}</p>
                        </div>
                    ) : generatedImage ? (
                        <div className="relative group">
                            <img
                                src={generatedImage}
                                alt="Generated by Cognix AI"
                                className="rounded-lg shadow-lg mx-auto max-h-[60vh] cursor-zoom-in transition-transform group-hover:scale-105"
                                onClick={() => setFullScreenImage(generatedImage)}
                            />
                            <button
                                onClick={handleDownload}
                                className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Download image"
                            >
                                <DownloadIcon className="w-6 h-6" />
                            </button>
                        </div>
                    ) : uploadedImagePreview ? (
                        <div className="relative group">
                           <img
                                src={uploadedImagePreview}
                                alt="Uploaded for editing"
                                className="rounded-lg shadow-lg mx-auto max-h-[60vh] cursor-zoom-in transition-transform group-hover:scale-105"
                                onClick={() => setFullScreenImage(uploadedImagePreview)}
                           />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
                            <ImageIcon className="w-24 h-24 text-cyan-500/50 mb-4" />
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">High-Quality Image Generation</h2>
                            <p className="mt-2 max-w-md">
                                Create stunning images with Imagen 4. Just type a prompt and select an aspect ratio.
                                <br/>
                                Or, upload an image to start editing with Gemini.
                            </p>
                        </div>
                    )}
                </div>
            </div>
            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                <div className="max-w-3xl mx-auto">
                    {uploadedImagePreview && (
                        <div className="mb-2 relative w-24 h-24">
                            <img src={uploadedImagePreview} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                            <button
                                onClick={() => { setUploadedImage(null); setUploadedImagePreview(null); }}
                                className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 leading-none w-6 h-6 flex items-center justify-center text-sm shadow-md"
                                aria-label="Remove image"
                            > &times; </button>
                        </div>
                    )}
                    {!uploadedImagePreview && (
                        <div className="mb-4">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-300 text-center mb-2">Aspect Ratio</p>
                            <div className="flex justify-center items-center gap-2 flex-wrap">
                                {aspectRatios.map(ar => (
                                    <button
                                        key={ar}
                                        onClick={() => setAspectRatio(ar)}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors duration-200 ${
                                            aspectRatio === ar
                                                ? 'bg-cyan-500 text-white shadow'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        {ar}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="relative">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={uploadedImagePreview ? "Describe how you want to edit the image..." : "Describe the image you want to create..."}
                            className="w-full p-4 pr-40 bg-gray-100 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none"
                            rows={2}
                            disabled={isLoading}
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2">
                            <button 
                                onClick={() => fileInputRef.current?.click()} 
                                className="p-2 text-gray-500 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors" 
                                aria-label="Upload image"
                            >
                                <ImageIcon className="w-6 h-6" />
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                            <button
                                onClick={handleGenerate}
                                disabled={(!prompt.trim() && !uploadedImage) || isLoading}
                                className="px-4 py-2 flex items-center gap-2 rounded-lg bg-cyan-500 text-white disabled:bg-cyan-300 dark:disabled:bg-cyan-700 hover:bg-cyan-600 transition-colors"
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