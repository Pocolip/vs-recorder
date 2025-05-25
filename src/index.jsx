// src/index.jsx - Fixed for Chrome Extension
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import './styles/index.css';

// Import services directly for immediate availability
import { StorageService } from './services/StorageService';
import { ReplayService } from './services/ReplayService';

console.log('🚀 VS Recorder Extension Loading...');

// Wait for DOM to be ready
const initializeApp = () => {
    const container = document.getElementById('root');
    if (!container) {
        console.error('Root element not found');
        return;
    }

    // Make services available immediately for debugging
    window.StorageService = StorageService;
    window.ReplayService = ReplayService;

    console.log('🔧 Services made available on window object');
    console.log('StorageService type:', typeof window.StorageService);
    console.log('ReplayService type:', typeof window.ReplayService);

    const root = createRoot(container);
    root.render(<App />);

    console.log('✅ VS Recorder initialized');
};

// For Chrome extension environment
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}