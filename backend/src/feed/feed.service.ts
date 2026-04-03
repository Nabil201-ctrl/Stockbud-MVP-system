import { Injectable, OnModuleInit } from '@nestjs/common';
import { Feedback } from './feed.interface';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class FeedService implements OnModuleInit {
    constructor(private readonly db: PrismaService) { }

    onModuleInit() { }

    async create(feedbackData: Omit<Feedback, 'id' | 'createdAt' | 'status'>): Promise<Feedback> {
        const newFeedback = await this.db.createFeedback({
            email: feedbackData.email,
            rating: feedbackData.rating,
            category: feedbackData.category,
            message: feedbackData.message,
            status: 'new',
        });
        return newFeedback as any;
    }

    async findAll(): Promise<Feedback[]> {
        const feedback = await this.db.getAllFeedback();
        return feedback as any;
    }
}

