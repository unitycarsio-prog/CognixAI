
import React, { useState, useRef } from 'react';
import { BotIcon, MicrophoneIcon, ImageIcon, SearchIcon } from './Icons';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onClearHistory: () => void;
}

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
    <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
        <div className="text-blue-600 shrink-0 p-2.5 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">{icon}</div>
        <div>
            <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
        </div>
    </div>
);

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose, onClearHistory }) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg m-4 max-h-[90vh] flex flex-col animate-fade-in-up overflow-hidden border border-gray-200 dark:border-gray-800"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">About Cognix AI</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Close">
                        &times;
                    </button>
                </header>

                <main className="p-6 overflow-y-auto space-y-8">
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Core Capabilities</h3>
                        <div className="space-y-3">
                            <FeatureCard 
                                icon={<BotIcon className="w-5 h-5" />}
                                title="Conversational Chat"
                                description="Engage in dynamic, multimodal conversations powered by the latest Gemini models."
                            />
                            <FeatureCard 
                                icon={<SearchIcon className="w-5 h-5" />}
                                title="Live Search & Maps"
                                description="Access real-time information and location-based answers with Google Search and Maps."
                            />
                             <FeatureCard 
                                icon={<ImageIcon className="w-5 h-5" />}
                                title="Image Generation"
                                description="Generate high-quality images from text prompts using Imagen."
                            />
                            <FeatureCard 
                                icon={<MicrophoneIcon className="w-5 h-5" />}
                                title="Live Conversation"
                                description="Real-time voice chat for hands-free interaction."
                            />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Privacy & Data</h3>
                        <div className="p-5 border border-red-100 dark:border-red-900/20 bg-red-50 dark:bg-red-900/10 rounded-2xl">
                            <h3 className="text-sm font-bold text-red-700 dark:text-red-400 mb-2">Clear History</h3>
                            <p className="text-sm text-red-600/80 dark:text-red-400/80 mb-4 leading-relaxed">
                                This action will permanently remove all your chat sessions and cannot be undone.
                            </p>
                            <button
                                onClick={onClearHistory}
                                className="w-full px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm"
                            >
                                Clear All Data
                            </button>
                        </div>
                    </div>
                </main>

                 <footer className="p-4 border-t border-gray-100 dark:border-gray-800 text-center text-xs text-gray-400 dark:text-gray-500 shrink-0 bg-gray-50/30 dark:bg-gray-800/30">
                    <p>Powered by Google Gemini • Built by Shashwat Ranjan Jha</p>
                </footer>
            </div>
        </div>
    );
};
