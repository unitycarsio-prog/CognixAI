import React, { useState, useEffect, useRef } from 'react';
import { ai } from '../services/gemini';
import type { ThemeColors, CommunityPost, ModelType } from '../types';
import { 
  Users, 
  Send, 
  Image as ImageIcon, 
  Sparkles, 
  MessageSquare, 
  Heart, 
  ShieldCheck, 
  AlertCircle,
  Plus,
  X,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
        const saved = localStorage.getItem('cognix_community_v8');
        if (saved) setPosts(JSON.parse(saved));
        else setPosts([
            { 
                id: '1', 
                author: 'Neural Architect', 
                authorId: 'sys',
                content: 'Welcome to the Cognix Collective. Share architectural ideas, neural pulses, and logic workflows with the collective network. This is a local-first persistent mesh.', 
                timestamp: Date.now(), 
                likedBy: ['sys'], 
                replies: [],
                type: 'text' 
            }
        ]);
    }, []);

    useEffect(() => localStorage.setItem('cognix_community_v8', JSON.stringify(posts)), [posts]);
    useEffect(() => { if(username) localStorage.setItem('cognix_user_name', username); }, [username]);

    const handlePublish = async () => {
        if (!newPostContent.trim() || !username.trim()) {
            setError('Identification and content required for broadcast.');
            return;
        }
        setIsPublishing(true);
        setSafetyScanner(true);
        setError(null);

        try {
            const moderation = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [{ role: 'user', parts: [{ text: `Safety Audit: "${newPostContent}". Respond ONLY with 'PASS' or 'FAIL: [REASON]'.` }] }],
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
                
                setPosts(prev => [newPost, ...prev]);
                setNewPostContent('');
                setSelectedImage(null);
            } else {
                setError(`Neural Guard: ${result.replace('FAIL:', '')}`);
            }
        } catch (e) {
            setError('Neural uplink failure during audit.');
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
        <div className="h-full overflow-y-auto bg-white dark:bg-cognix-950 p-6 no-scrollbar technical-grid">
            <div className="max-w-2xl mx-auto space-y-12 pb-32">
                <header className="text-center pt-12 flex flex-col items-center">
                    <div className="mb-6 relative">
                        <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full animate-pulse"></div>
                        <div className="relative w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-2xl">
                            <Users size={32} />
                        </div>
                    </div>
                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight">The Collective</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-bold text-[11px] uppercase tracking-[0.4em] mt-3">Global Neural Relay Network</p>
                </header>

                <div className="bg-white dark:bg-cognix-900 rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 dark:border-cognix-800 relative transition-all focus-within:ring-4 focus-within:ring-blue-500/5">
                    <AnimatePresence>
                      {safetyScanner && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-white/90 dark:bg-cognix-900/90 backdrop-blur-md z-10 flex flex-col items-center justify-center rounded-[2.5rem]"
                        >
                          <ShieldCheck size={48} className="text-blue-500 animate-bounce mb-4" />
                          <p className="font-bold uppercase tracking-[0.3em] text-blue-600">Neural Audit in Progress</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex flex-col gap-6">
                        <div className="flex items-center gap-4">
                            <input 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Neural ID..."
                                className="bg-slate-50 dark:bg-cognix-950 border border-slate-100 dark:border-cognix-800 rounded-2xl px-5 py-3 text-xs font-bold text-blue-600 outline-none w-fit min-w-[200px] shadow-inner uppercase tracking-widest placeholder-slate-400"
                            />
                        </div>
                        
                         <textarea 
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder="Broadcast a neural pulse to the collective..."
                            className="bg-slate-50 dark:bg-cognix-950 border border-slate-100 dark:border-cognix-800 rounded-3xl p-6 h-32 outline-none text-slate-800 dark:text-slate-100 resize-none text-sm font-medium leading-relaxed shadow-inner focus:border-blue-500 transition-all placeholder-slate-400"
                        />
                    </div>
                    
                    <AnimatePresence>
                      {selectedImage && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="mt-6 flex items-center gap-4 px-2"
                          >
                               <div className="relative w-20 h-20 rounded-2xl overflow-hidden shadow-xl border-2 border-blue-500 group">
                                  <img src={`data:${selectedImage.mimeType};base64,${selectedImage.data}`} className="w-full h-full object-cover" alt="Pulse Media"/>
                                  <button 
                                    onClick={() => setSelectedImage(null)} 
                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                                  >
                                    <X size={16}/>
                                  </button>
                               </div>
                               <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Attachment Ready</span>
                          </motion.div>
                      )}
                    </AnimatePresence>

                    {error && (
                      <div className="mt-6 flex items-center gap-3 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl animate-shake">
                        <AlertCircle size={16} className="text-red-500" />
                        <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest">{error}</p>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mt-8 px-2">
                        <button 
                          onClick={() => fileInputRef.current?.click()} 
                          className="w-12 h-12 flex items-center justify-center bg-slate-50 dark:bg-cognix-950 border border-slate-200 dark:border-cognix-800 rounded-2xl text-slate-400 hover:text-blue-500 transition-all"
                        >
                            <ImageIcon size={20}/>
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
                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-10 py-4 rounded-3xl font-bold text-xs uppercase tracking-[0.3em] shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-30 transition-all"
                        >
                            Synchronize Pulse
                        </button>
                    </div>
                </div>

                <div className="space-y-8">
                    {posts.map((post, idx) => (
                        <motion.div 
                          key={post.id} 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="bg-white dark:bg-cognix-900 rounded-[3rem] p-8 md:p-10 shadow-lg border border-slate-100 dark:border-cognix-800 hover:border-blue-500/30 transition-all group"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center font-bold text-blue-600 text-lg shadow-inner group-hover:scale-110 transition-transform">
                                    {post.author[0]}
                                  </div>
                                  <div className="flex flex-col">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">@{post.author.toLowerCase().replace(/\s+/g, '')}</span>
                                        {post.authorId === 'sys' && <ShieldCheck size={14} className="text-blue-500" />}
                                      </div>
                                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 leading-none">
                                        {new Date(post.timestamp).toLocaleDateString()} • RELAY {post.id.slice(-4)}
                                      </span>
                                  </div>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                            </div>

                            <p className="text-slate-800 dark:text-slate-200 text-base leading-relaxed mb-8 font-medium">{post.content}</p>
                            
                            <div className="flex items-center gap-8 text-slate-400 border-t border-slate-50 dark:border-cognix-800/50 pt-8 mt-2">
                                <button 
                                  onClick={() => toggleLike(post.id)} 
                                  className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all ${post.likedBy.includes('user_local') ? 'text-blue-600 scale-110' : 'hover:text-blue-500'}`}
                                >
                                    <Sparkles size={18} />
                                    <span>{post.likedBy.length} Syncs</span>
                                </button>
                                <button 
                                  onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)} 
                                  className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${replyingTo === post.id ? 'text-blue-500' : 'hover:text-blue-500'}`}
                                >
                                    <MessageSquare size={18} />
                                    <span>{post.replies.length} Persp.</span>
                                </button>
                            </div>
                            
                            <AnimatePresence>
                              {(post.replies.length > 0 || replyingTo === post.id) && (
                                  <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="mt-8 space-y-4">
                                        {post.replies.map(reply => (
                                            <div key={reply.id} className="p-5 bg-slate-50 dark:bg-cognix-950 rounded-2xl border border-slate-100 dark:border-cognix-800/50">
                                                <span className="font-bold text-blue-600 uppercase tracking-widest text-[9px]">@{reply.author.toLowerCase().replace(/\s+/g, '')}</span>
                                                <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm leading-relaxed font-medium">{reply.content}</p>
                                            </div>
                                        ))}
                                        {replyingTo === post.id && (
                                            <div className="flex gap-3 mt-6">
                                                <input 
                                                  value={replyText} 
                                                  onChange={(e) => setReplyText(e.target.value)} 
                                                  onKeyDown={e => e.key === 'Enter' && addReply(post.id)} 
                                                  placeholder="Inject perspective..." 
                                                  className="flex-1 bg-slate-50 dark:bg-cognix-950 rounded-2xl px-5 py-3 text-xs outline-none border border-slate-100 dark:border-cognix-800 shadow-inner font-bold placeholder-slate-400" 
                                                />
                                                <button onClick={() => addReply(post.id)} className="px-6 bg-slate-900 dark:bg-blue-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition-all">Relay</button>
                                            </div>
                                        )}
                                    </div>
                                  </motion.div>
                              )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
