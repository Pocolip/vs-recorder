// src/components/ConfirmationModal.jsx
import React from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';

const ConfirmationModal = ({
                               title = 'Confirm Action',
                               message,
                               onConfirm,
                               onCancel,
                               loading = false,
                               confirmText = 'Confirm',
                               cancelText = 'Cancel',
                               confirmButtonClass = 'bg-red-600 hover:bg-red-700',
                               dangerous = true
                           }) => {
    return createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-md">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        {dangerous && (
                            <div className="p-2 bg-red-600/20 rounded-lg">
                                <AlertTriangle className="h-5 w-5 text-red-400" />
                            </div>
                        )}
                        <h2 className="text-xl font-semibold text-gray-100">{title}</h2>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-200 transition-colors"
                        disabled={loading}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="text-gray-300">
                        {typeof message === 'string' ? (
                            <p>{message}</p>
                        ) : (
                            message
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 p-6 border-t border-slate-700">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors"
                        disabled={loading}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`px-6 py-2 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${confirmButtonClass}`}
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Processing...
                            </>
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmationModal;