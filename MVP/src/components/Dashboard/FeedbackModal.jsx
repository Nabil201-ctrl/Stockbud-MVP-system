import React, { useState } from 'react';
import { X, MessageSquare, ThumbsUp, ThumbsDown, Send } from 'lucide-react';

const FeedbackModal = ({ isOpen, onClose, isDarkMode }) => {
    const [rating, setRating] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate API call
        setTimeout(() => {
            setIsSubmitting(false);
            setSubmitted(true);
            setTimeout(() => {
                setSubmitted(false);
                setFeedback('');
                setRating(null);
                onClose();
            }, 2000);
        }, 1000);
    };

    const bgClass = isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900';
    const inputBgClass = isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-900';
    const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className={`w-full max-w-md rounded-2xl shadow-xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200 ${bgClass} border ${borderColor}`}>

                {/* Header */}
                <div className={`p-4 border-b ${borderColor} flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <MessageSquare size={16} />
                        </div>
                        <h3 className="font-semibold text-lg">Send Feedback</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                {!submitted ? (
                    <form onSubmit={handleSubmit} className="p-5 space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 opacity-80">How was your experience?</label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRating('good')}
                                    className={`flex-1 py-3 px-4 rounded-xl border transition-all flex items-center justify-center gap-2
                    ${rating === 'good'
                                            ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                                            : `${borderColor} hover:bg-gray-50 dark:hover:bg-gray-700/50`}`}
                                >
                                    <ThumbsUp size={18} />
                                    <span className="font-medium">Good</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRating('bad')}
                                    className={`flex-1 py-3 px-4 rounded-xl border transition-all flex items-center justify-center gap-2
                    ${rating === 'bad'
                                            ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                            : `${borderColor} hover:bg-gray-50 dark:hover:bg-gray-700/50`}`}
                                >
                                    <ThumbsDown size={18} />
                                    <span className="font-medium">Bad</span>
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 opacity-80">Your message</label>
                            <textarea
                                required
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="What did you like or dislike? How can we improve?"
                                rows={4}
                                className={`w-full rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none ${inputBgClass}`}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 opacity-80">Email (optional)</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Where can we reach you?"
                                className={`w-full rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all ${inputBgClass}`}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || !rating}
                            className={`w-full py-3 rounded-xl font-medium text-white shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all
                ${isSubmitting || !rating
                                    ? 'bg-gray-400 cursor-not-allowed opacity-70'
                                    : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 active:scale-[0.98]'}`}
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Send size={18} />
                                    <span>Send Feedback</span>
                                </>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="p-8 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 mb-4 animate-in zoom-in duration-300">
                            <ThumbsUp size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Thank You!</h3>
                        <p className="text-gray-500 dark:text-gray-400">
                            We appreciate your feedback. It helps us build a better Stockbud for you.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeedbackModal;
