import React from 'react';

export const AboutUs: React.FC = () => {
    return (
        <div className="h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto custom-scrollbar p-8 sm:p-12">
            <div className="max-w-4xl mx-auto space-y-16 animate-fade-in-up">
                <header className="text-center space-y-4">
                    <h1 className="text-6xl sm:text-8xl font-black text-slate-900 dark:text-white tracking-tighter">Cognix AI.</h1>
                    <p className="text-xs font-bold uppercase tracking-[0.5em] text-blue-600">The Original Intelligence Engine</p>
                </header>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-12 border-t border-slate-200 dark:border-slate-800">
                    <div className="space-y-6">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Our Architecture</h2>
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                            Cognix AI is a private intelligence engine designed for precision, security, and versatility. We prioritize high-performance multimodal interaction while ensuring your data sovereignty. Built with a vision to make advanced AI accessible and personal.
                        </p>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
                        <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Stable v3.0</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Cognix Core</h3>
                        <p className="text-xs text-slate-500 font-medium">Native browser persistence. Real-time visual grounding. Private neural memory.</p>
                    </div>
                </section>

                <div className="space-y-12">
                    <div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 px-2">Privacy & Security</h3>
                        <div className="p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4 text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                            <p>Cognix AI sessions are stored locally in your browser's persistent storage. We do not maintain server-side logs of your personal interactions. Data transmission is limited to necessary API calls for processing intelligence requests.</p>
                            <p>You have full control over your memory vault. Purging history is instantaneous and absolute.</p>
                        </div>
                    </div>
                </div>

                <footer className="text-center pt-12 pb-10 text-slate-400">
                    <p className="text-xs font-bold uppercase tracking-[0.2em]">Created by Shashwat Ranjan Jha</p>
                </footer>
            </div>
        </div>
    );
};