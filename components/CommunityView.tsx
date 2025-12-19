import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import type { ThemeColors, CommunityPost, ModelType } from '../types';
import { BotIcon, SendIcon, ImageIcon, UsersIcon } from './Icons';

export const CommunityView: React.FC<{ theme: ThemeColors, model: ModelType }> = ({ theme, model }) => {
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [newPostContent, setNewPostContent] = useState('');
    const [username, setUsername] = useState(localStorage.getItem('cognix_user_name') || '');
    const [selectedImage, setSelectedImage] = useState<{ data: string, mimeType: string } | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [safetyScanner, setSafetyScanner] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const saved = localStorage.getItem('cognix_community_v25');
        if (saved) setPosts(JSON.parse(saved));
        else setPosts([
            { 
                id: '1', 
                author: 'Neural Architect', 
                authorId: 'sys',
                content: 'Welcome to the Cognix Collective. Share architectural ideas, neural pulses, and logic workflows with the collective.', 
                timestamp: Date.now(), 
                likedBy: ['sys'], 
                replies: [],
                type: 'text' 
            }
        ]);
    }, []);

    useEffect(() => localStorage.setItem('cognix_community_v25', JSON.stringify(posts)), [posts]);
    useEffect(() => { if(username) localStorage.setItem('cognix_user_name', username); }, [username]);

    const handlePublish = async () => {
        if (!newPostContent.trim() || !username.trim()) {
            setError('Identification and content required.');
            return;
        }
        setIsPublishing(true);
        setSafetyScanner(true);
        setError(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const moderation = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Safety Audit: "${newPostContent}". Respond PASS or FAIL: [REASON].`,
            });

            const result = moderation.text?.trim() || "";
            if (result.startsWith('PASS')) {
                const newPost: CommunityPost = {
                    id: Date.now().toString(),
                    author: username,
                    authorId: 'user_local',
                    content: newPostContent,
                    timestamp: Date.now(),
                    likedBy: [],
                    replies: [],
                    type: selectedImage ? 'image' : 'text'
                };
                
                // In a real app we'd store the image. Here we just add it to the post content mock.
                setPosts(prev => [newPost, ...prev]);
                setNewPostContent('');
                setSelectedImage(null);
            } else {
                setError(`Neural Guard: ${result.replace('FAIL:', '')}`);
            }
        } catch (e) {
            setError('Network uplink failure.');
        } finally {
            setIsPublishing(false);
            setSafetyScanner(false);
        }
    };

    const toggleLike = (postId: string) => {
        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                const liked = p.likedBy.includes('user_local');
                return { ...p, likedBy: liked ? p.likedBy.filter(id => id !== 'user_local') : [...p.likedBy, 'user_local'] };
            }
            return p;
        }));
    };

    const addReply = (postId: string) => {
        if (!replyText.trim() || !username.trim()) return;
        setPosts(prev => prev.map(p => {
            if (p.id === postId) {
                return { 
                    ...p, 
                    replies: [...p.replies, { id: Date.now().toString(), author: username, content: replyText, timestamp: Date.now() }] 
                };
            }
            return p;
        }));
        setReplyText('');
        setReplyingTo(null);
    };

    return (
        <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 custom-scrollbar">
            <div className="max-w-2xl mx-auto space-y-8 pb-32">
                <header className="text-center pt-8">
                    <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">Collective.</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Broadcast pulses to the neural network.</p>
                </header>

                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-xl border border-slate-200 dark:border-slate-800 relative transition-all focus-within:shadow-blue-500/5">
                    {safetyScanner && <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10 flex flex-col items-center justify-center rounded-[2.5rem] font-black uppercase tracking-[0.3em] text-blue-600 animate-pulse">Neural Audit In Progress...</div>}
                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-4">
                            <input 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Sync Username..."
                                className="bg-slate-50 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 text-xs font-black text-blue-600 outline-none w-fit min-w-[180px] shadow-inner uppercase tracking-widest"
                            />
                            <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></div>
                        </div>
                        
                         <textarea 
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder="Broadcast a pulse to the collective..."
                            className="bg-slate-50 dark:bg-slate-800/50 border-none rounded-3xl p-6 min-h-[120px] outline-none text-slate-800 dark:text-slate-100 resize-none text-sm font-medium leading-relaxed shadow-inner"
                        />
                    </div>
                    
                    {selectedImage && (
                        <div className="mt-4 flex items-center gap-3 animate-fade-in-up px-2">
                             <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 border-blue-600">
                                <img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} className="w-full h-full object-cover" alt="Pulse Media"/>
                                <button onClick={() => setSelectedImage(null)} className="absolute inset-0 bg-black/40 flex items-center justify-center text-white font-black text-xs">&times;</button>
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Media Attached</span>
                        </div>
                    )}

                    {error && <p className="mt-4 text-[10px] font-bold text-red-500 uppercase tracking-widest px-2">{error}</p>}
                    
                    <div className="flex justify-between items-center mt-6 px-2">
                        <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-blue-600 transition-all">
                            <ImageIcon className="w-6 h-6"/>
                            <input type="file" ref={fileInputRef} onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => setSelectedImage({ data: (reader.result as string).split(',')[1], mimeType: file.type });
                                    reader.readAsDataURL(file);
                                }
                            }} accept="image/*" className="hidden" />
                        </button>
                        <button 
                            onClick={handlePublish}
                            disabled={isPublishing || !newPostContent.trim() || !username.trim()}
                            className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-95 transition-all hover:bg-blue-700"
                        >
                            Sync Broadcast
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    {posts.map(post => (
                        <div key={post.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl transition-all group">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center font-black text-blue-600 text-sm shadow-inner transition-transform group-hover:scale-110">{post.author[0]}</div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">@{post.author.toLowerCase().replace(/\s+/g, '')}</span>
                                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{new Date(post.timestamp).toLocaleDateString()} • Node Alpha</span>
                                </div>
                            </div>
                            <p className="text-slate-800 dark:text-slate-200 text-sm sm:text-base leading-loose mb-6 font-medium">{post.content}</p>
                            
                            <div className="flex items-center gap-6 text-slate-400 border-t border-slate-50 dark:border-slate-800/50 pt-6">
                                <button onClick={() => toggleLike(post.id)} className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-colors ${post.likedBy.includes('user_local') ? 'text-blue-600' : 'hover:text-slate-600'}`}>
                                    <svg className="w-5 h-5" fill={post.likedBy.includes('user_local') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                                    {post.likedBy.length} Pulse
                                </button>
                                <button onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:text-slate-600">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                                    {post.replies.length} Perspective
                                </button>
                            </div>
                            
                            {(post.replies.length > 0 || replyingTo === post.id) && (
                                <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800/50 space-y-4">
                                    {post.replies.map(reply => (
                                        <div key={reply.id} className="text-xs bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                            <span className="font-black text-blue-600 uppercase tracking-widest text-[9px]">@{reply.author.toLowerCase().replace(/\s+/g, '')}</span>
                                            <p className="text-slate-600 dark:text-slate-300 mt-2 leading-relaxed font-medium">{reply.content}</p>
                                        </div>
                                    ))}
                                    {replyingTo === post.id && (
                                        <div className="flex gap-3 mt-4">
                                            <input value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addReply(post.id)} placeholder="Inject perspective..." className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-2xl px-5 py-3 text-xs outline-none border border-slate-100 dark:border-slate-700 shadow-inner font-medium" />
                                            <button onClick={() => addReply(post.id)} className="bg-blue-600 text-white px-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-md">Sync</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};