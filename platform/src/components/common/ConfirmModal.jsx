import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = 'Confirm Action', 
    message = 'Are you sure you want to proceed?', 
    confirmText = 'Confirm', 
    cancelText = 'Cancel',
    type = 'danger' 
}) => {
    const { isDarkMode } = useTheme();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10001] p-4">
            <div className={`bg-white dark:bg-gray-800 rounded-3xl w-full max-w-sm p-6 sm:p-8 shadow-2xl animate-in fade-in zoom-in duration-200 border ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-2xl ${type === 'danger' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}`}>
                        <AlertTriangle size={24} />
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">{message}</p>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`flex-1 ${type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'} text-white font-bold py-3 rounded-xl transition-colors shadow-lg active:scale-95`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
