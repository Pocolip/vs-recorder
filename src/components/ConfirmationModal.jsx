import React from 'react';

const ConfirmationModal = ({
                               isOpen,
                               onClose,
                               onConfirm,
                               title,
                               message,
                               confirmText = 'Confirm',
                               cancelText = 'Cancel',
                               confirmButtonClass = 'bg-red-600 hover:bg-red-700',
                               isLoading = false,
                               loadingText = 'Processing...',
                               icon = '⚠️',
                               children
                           }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-md">
                {/* Header */}
                <div className="p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-gray-100">{title}</h2>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="text-center mb-6">
                        <div className="text-6xl mb-4">{icon}</div>
                        <p className="text-gray-300 mb-4">{message}</p>

                        {/* Custom content area */}
                        {children}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center ${confirmButtonClass}`}
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    {loadingText}
                                </>
                            ) : (
                                confirmText
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;