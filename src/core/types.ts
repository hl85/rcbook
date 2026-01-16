export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: number;
}

export interface Task {
    id: string;
    title: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    mode: 'code' | 'architect' | 'debug';
    content: string;
    messages: Message[];
}

export interface RcnbFile {
    metadata: Record<string, any>;
    tasks: Task[];
    rawContent?: string;
}
