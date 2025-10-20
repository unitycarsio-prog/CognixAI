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
  role: 'user' | 'model';
  parts: ChatPart[];
}