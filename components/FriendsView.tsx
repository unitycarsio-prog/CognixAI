import React, { useState } from 'react';
import type { Friend } from '../types';
import { UsersIcon, CopyIcon, SparklesIcon } from './Icons';

export const FriendsView: React.FC<{ friends: Friend[], setFriends: React.Dispatch<React.SetStateAction<Friend[]>> }> = ({ friends, setFriends }) => {
    const [inviteLink, setInviteLink] = useState('');
    const [copied, setCopied] = useState(false);

    const generateLink = () => {
        const link = `https://nexzi.ai/handshake/${Math.random().toString(36).substring(7)}`;
        setInviteLink(link);
        setCopied(false);
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const addMockCognate = () => {
        if (friends.length >= 10) return;
        const names = ['Aria', 'Xenon', 'Lyra', 'Cyrus', 'Atlas', 'Nova', 'Veda', 'Echo', 'Zion', 'Luna'];
        const friend: Friend = { id: Date.now().toString(), name: names[friends.length] || 'Cognate_0' + friends.length, avatar: '', status: 'online' };
        setFriends([...friends, friend]);
    };

    return (
        <div className="h-full bg-slate-50 dark:bg-slate-950 overflow-y-auto custom-scrollbar p-8 sm:p-12 animate-fade-in">
            <div className="max-w-5xl mx-auto space-y-12">
                <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-8">
                    <div>
                        <h2 className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter italic">Cognates.</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">Manage your collective intelligence network (Max 10).</p>
                    </div>
                    <div className="px-6 py-3 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Network Load</span>
                        <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${(friends.length/10)*100}%` }} />
                        </div>
                        <span className="text-xs font-black text-slate-900 dark:text-white">{friends.length}/10</span>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between px-2">
                             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Nodes</h3>
                             <button onClick={addMockCognate} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">+ Link Manual Node</button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {friends.map(f => (
                                <div key={f.id} className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:border-blue-500 transition-all">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center font-black text-blue-600 text-lg shadow-inner">{f.name[0]}</div>
                                    <div>
                                        <p className="font-black text-slate-900 dark:text-white">{f.name}</p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Synched</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="p-10 bg-blue-600 text-white rounded-[3rem] shadow-3xl space-y-6 relative overflow-hidden group">
                            <h3 className="text-2xl font-black italic">Invite.</h3>
                            <p className="text-sm text-blue-100 leading-relaxed font-medium">Generate a real-time neural handshake link to involve a peer in your active session node.</p>
                            <button onClick={generateLink} className="w-full py-4 bg-white text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Generate Handshake</button>
                            {inviteLink && (
                                <div className="mt-4 p-4 bg-blue-700 rounded-2xl flex items-center justify-between gap-4 border border-white/10 animate-fade-in">
                                    <span className="text-[10px] font-mono truncate">{inviteLink}</span>
                                    <button onClick={copyToClipboard} className="shrink-0 p-2 hover:bg-white/10 rounded-xl transition-all">
                                        {copied ? <span className="text-[10px]">OK</span> : <CopyIcon className="w-4 h-4"/>}
                                    </button>
                                </div>
                            )}
                            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-1000"></div>
                        </div>

                        <div className="p-8 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Neural Protocol</h4>
                             <ul className="space-y-3">
                                {["Up to 10 nodes per cluster", "Real-time state synchronization", "Encryption level: Grade-A"].map((t, i) => (
                                    <li key={i} className="flex gap-2 text-xs font-medium text-slate-500">
                                        <div className="w-1 h-1 bg-blue-600 rounded-full mt-2" />
                                        {t}
                                    </li>
                                ))}
                             </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};