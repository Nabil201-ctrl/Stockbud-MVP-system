
export interface Feedback {
    id: string;
    userId?: string;
    userName?: string;
    rating: number; 
    category: string; 
    email?: string; 
    message: string;
    createdAt: Date;
    status: 'new' | 'reviewed' | 'resolved';
}
