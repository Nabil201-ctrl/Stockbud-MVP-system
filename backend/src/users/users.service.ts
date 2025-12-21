import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
    findAll() {
        return {
            users: [
                { id: 1, name: 'Alex Johnson', email: 'alex@example.com', status: 'active', plan: 'Premium', lastActive: '2 hours ago', location: 'New York', signupDate: '2024-01-15', avatar: 'AJ' },
                { id: 2, name: 'Sarah Wilson', email: 'sarah@example.com', status: 'active', plan: 'Pro', lastActive: '5 minutes ago', location: 'London', signupDate: '2024-01-10', avatar: 'SW' },
                { id: 3, name: 'Mike Brown', email: 'mike@example.com', status: 'inactive', plan: 'Free', lastActive: '2 days ago', location: 'Toronto', signupDate: '2023-12-20', avatar: 'MB' },
                { id: 4, name: 'Emma Davis', email: 'emma@example.com', status: 'active', plan: 'Premium', lastActive: '1 hour ago', location: 'Sydney', signupDate: '2024-01-05', avatar: 'ED' },
                { id: 5, name: 'James Wilson', email: 'james@example.com', status: 'active', plan: 'Enterprise', lastActive: 'Just now', location: 'San Francisco', signupDate: '2024-01-12', avatar: 'JW' },
                { id: 6, name: 'Lisa Chen', email: 'lisa@example.com', status: 'inactive', plan: 'Free', lastActive: '1 week ago', location: 'Singapore', signupDate: '2023-11-30', avatar: 'LC' }
            ],
            stats: {
                total: 15284,
                active: 8920,
                new: 1420,
                inactive: 5944,
                growth: 12.4
            }
        };
    }
}
