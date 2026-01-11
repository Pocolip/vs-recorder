// src/index.jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import './styles/index.css';

// Wait for DOM to be ready
const initializeApp = () => {
    const container = document.getElementById('root');
    if (!container) {
        console.error('Root element not found');
        return;
    }

    const root = createRoot(container);
    root.render(<App />);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}