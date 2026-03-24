import React, { useState } from 'react';
import axios from 'axios';
import { X, MessageSquare, Star, Loader2 } from 'lucide-react';

const FeedbackModal = ({ isOpen, onClose }) => {
    const [rating, setRating] = useState(0);
    const [category, setCategory] = useState('improvement');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (rating === 0) {
            alert("Please provide a rating");
            return;
        }

        setIsSubmitting(true);
        setSubmitStatus(null);

        try {
            await axios.post('http://localhost:3000/feed/feedback', {
                rating,
                category,
                message
            });
            setSubmitStatus('success');
            setTimeout(() => {
                onClose();
                setSubmitStatus(null);
                setRating(0);
                setMessage('');
                setCategory('improvement');
            }, 2000);
        } catch (error) {
            console.error("Error submitting feedback:", error);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">

                {}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Send Feedback</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {}
                {submitStatus === 'success' ? (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Star className="w-8 h-8 text-green-600 dark:text-green-400 fill-current" />
                        </div>
                        <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Thank You!</h4>
                        <p className="text-gray-600 dark:text-gray-300">Your feedback helps us improve Stockbud.</p>
                    </div>
                ) : (
                                        <form onSubmit={handleSubmit} className="p-6 space-y-6">

                        {}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">How would you rate your experience?</label>
                            <div className="flex gap-2 justify-center py-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setRating(star)}
                                        className="focus:outline-none transition-transform hover:scale-110"
                                    >
                                        <Star
                                            className={`w-8 h-8 ${rating >= star ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600'}`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['improvement', 'bug', 'feature', 'other'].map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setCategory(cat)}
                                        className={`px-4 py-2 text-sm rounded-lg border transition-all capitalized
                       ${category === cat
                                                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300'
                                                : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 dark:text-gray-300'
                                            }`}
                                    >
                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Details</label>
                            <textarea
                                rows={4}
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Tell us what you think..."
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                                required
                            />
                        </div>

                        {submitStatus === 'error' && (
                            <p className="text-red-500 text-sm text-center">Failed to submit feedback. Please try again.</p>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting || rating === 0}
                            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-medium shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Sending...
                                </>
                            ) : 'Submit Feedback'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default FeedbackModal;
