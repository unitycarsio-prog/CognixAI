
export type Mode = 'chat' | 'live';

export interface SearchResult {
  uri: string;
  title: string;
  type?: 'web' | 'map';
}

export interface ChatPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64 encoded
  };
  functionCall?: {
    name: string;
    args: any;
  };
  searchResults?: SearchResult[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  parts: ChatPart[];
}

export interface ChatSession {
  id:string;
  title: string;
  messages: ChatMessage[];
}
