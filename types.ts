export interface SearchResult {
  uri: string;
  title: string;
}

export interface ChatPart {
  text?: string;
  imageUrl?: string;
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
