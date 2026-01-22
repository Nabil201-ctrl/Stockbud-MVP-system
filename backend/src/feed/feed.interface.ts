
export interface Feedback {
    id: string;
    userId?: string;
    userName?: string;
    rating: number; // 1-5
    category: string; // 'bug', 'feature', 'improvement', 'other'
    email?: string; // Optional email for follow-up
    message: string;
    createdAt: Date;
    status: 'new' | 'reviewed' | 'resolved';
}
