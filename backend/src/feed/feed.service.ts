import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Feedback } from './feed.interface';

@Injectable()
export class FeedService implements OnModuleInit {
    private feedbackList: Feedback[] = [];
    private readonly filePath = path.join(__dirname, '..', '..', 'feed.json');

    onModuleInit() {
        this.loadFeedback();
    }

    private loadFeedback() {
        if (fs.existsSync(this.filePath)) {
            try {
                const data = fs.readFileSync(this.filePath, 'utf8');
                this.feedbackList = JSON.parse(data);
                console.log(`Loaded ${this.feedbackList.length} feedback items from ${this.filePath}`);
            } catch (error) {
                console.error('Error loading feedback from file:', error);
            }
        }
    }

    private saveFeedback() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.feedbackList, null, 2), 'utf8');
        } catch (error) {
            console.error('Error saving feedback to file:', error);
        }
    }

    async create(feedbackData: Omit<Feedback, 'id' | 'createdAt' | 'status'>): Promise<Feedback> {
        const newFeedback: Feedback = {
            id: Math.random().toString(36).substr(2, 9),
            ...feedbackData,
            createdAt: new Date(),
            status: 'new',
        };
        this.feedbackList.push(newFeedback);
        this.saveFeedback();
        return newFeedback;
    }

    async findAll(): Promise<Feedback[]> {
        return this.feedbackList;
    }
}
