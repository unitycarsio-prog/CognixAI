
import React from 'react';
import { BotIcon, MicrophoneIcon } from './Icons';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onClearHistory: () => void;
}

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, description: string }> = ({ icon, title, description }) => (
    <div className="flex items-start gap-4 p-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
        <div className="text-cyan-500 shrink-0">{icon}</div>
        <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
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
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg m-4 max-h-[90vh] flex flex-col animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                    <h2 className="text-lg font-bold">About Cognix AI</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close">
                        &times;
                    </button>
                </header>

                <main className="p-6 overflow-y-auto space-y-6">
                    <div>
                        <h3 className="text-md font-semibold mb-2">Features</h3>
                        <div className="space-y-3">
                            <FeatureCard 
                                icon={<BotIcon className="w-6 h-6" />}
                                title="Conversational Chat"
                                description="Engage in dynamic, text-based conversations. Powered by Gemini 2.5 Flash for fast and intelligent responses."
                            />
                            <FeatureCard 
                                icon={<MicrophoneIcon className="w-6 h-6" />}
                                title="Live Conversation"
                                description="Speak directly with the AI in a real-time voice chat for a hands-free, natural interaction."
                            />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-md font-semibold mb-2">Data Privacy</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Your chat history is stored exclusively in your browser's local storage. Your data is not sent to any server besides the Gemini API for processing your requests. Clearing your browser data will permanently delete your history.
                        </p>
                    </div>
                    <div className="p-4 border border-red-500/30 bg-red-500/10 rounded-lg">
                        <h3 className="text-md font-semibold text-red-700 dark:text-red-300">Danger Zone</h3>
                        <p className="text-sm text-red-600 dark:text-red-400 mt-1 mb-3">
                            This action will permanently delete all your chat sessions. This cannot be undone.
                        </p>
                        <button
                            onClick={onClearHistory}
                            className="w-full px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Clear All Chat History
                        </button>
                    </div>
                </main>

                 <footer className="p-4 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500 dark:text-gray-400 shrink-0">
                    <p>Built with ❤️ by Shashwat Ranjan Jha</p>
                </footer>
            </div>
        </div>
    );
};