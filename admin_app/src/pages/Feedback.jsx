import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { MessageSquare, Star } from 'lucide-react';

export const Feedback = () => {
    const [feedback, setFeedback] = useState([]);

    useEffect(() => {
        const fetchFeedback = async () => {
            try {
                const response = await axios.get('/api/feed/feedback');
                setFeedback(response.data);
            } catch (error) {
                console.error('Failed to fetch feedback', error);
            }
        };
        fetchFeedback();
    }, []);

    const getRatingColor = (rating) => {
        if (rating >= 4) return 'text-yellow-400';
        if (rating >= 3) return 'text-yellow-600';
        return 'text-gray-400';
    };

    return (
        <Layout>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800">User Feedback</h1>
                <p className="text-gray-600">Review user comments and ratings</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 font-semibold text-gray-600">User</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Rating</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Category</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Message</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {feedback.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                {item.userName ? item.userName.substring(0, 2).toUpperCase() : 'AN'}
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">{item.userName || 'Anonymous'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    size={14}
                                                    className={star <= item.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                                                />
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full capitalize">
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-gray-600 max-w-md">{item.message}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-sm text-gray-500">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {feedback.length === 0 && (
                        <div className="p-8 text-center text-gray-400">
                            No feedback available yet.
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};
