
export type Mode = 'chat' | 'live' | 'toolbox' | 'community';
export type UIStyle = 'modern' | 'glass' | 'brutal' | 'retro';
export type AccentColor = 'blue' | 'violet' | 'emerald' | 'rose' | 'amber';
export type FontSize = 'small' | 'normal' | 'large';

export type ModelType = 
  | 'cognix-rv2'      // gemini-3-flash-preview (Fast/Friendly)
  | 'clora-v1'       // gemini-3-pro-preview (Reasoning)
  | 'clorea-v2.5'    // gemini-flash-lite-latest (Lightweight)
  | 'arctic-x'       // gemini-3-pro-preview (Coding)
  | 'visualizer';    // gemini-2.5-flash-image

export interface Friend {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy' | 'away';
}

export interface Deployment {
  id: string;
  title: string;
  code: string;
  timestamp: number;
}

export interface CommunityPost {
    id: string;
    author: string;
    authorId: string;
    content: string;
    timestamp: number;
    likedBy: string[];
    replies: any[];
    type: 'text' | 'image' | 'code';
}

export interface MemoryFact {
    id: string;
    category: 'preference' | 'project' | 'personal' | 'work';
    content: string;
    timestamp: string;
}

export interface ThemeColors {
    primary: string;
    primaryHover: string;
    text: string;
    textDark: string;
    bgSoft: string;
    darkBgSoft: string;
    border: string;
    ring: string;
    gradient: string;
}

export interface ChatPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
  searchResults?: any[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  parts: ChatPart[];
  isSearching?: boolean;
}

export interface ChatSession {
  id:string;
  title: string;
  messages: ChatMessage[];
  participants: string[]; 
}
