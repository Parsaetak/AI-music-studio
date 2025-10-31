
export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
  groundingChunks?: GroundingChunk[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

// Fix: The global declaration for `window.aistudio` has been removed.
// The TypeScript compiler error indicates that a global type for `window.aistudio` already exists.
// This redeclaration was causing a conflict.
