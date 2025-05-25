// src/components/App.jsx - Updated with Debug Panel
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { StorageService } from '../services/StorageService';
import { ReplayService } from '../services/ReplayService';
import HomePage from '../pages/HomePage';
import TeamPage from '../pages/TeamPage';
import DebugPanel from './DebugPanel';

const App = () => {
    const [isDebugVisible, setIsDebugVisible] = useState(false);

    useEffect(() => {
        // Initialize storage when app loads
        StorageService.initialize();

        // ALWAYS make services available for debugging (not just in dev mode)
        window.StorageService = StorageService;
        window.ReplayService = ReplayService;

        console.log('✅ VS Recorder App initialized');
        console.log('✅ StorageService available:', typeof window.StorageService);
        console.log('✅ ReplayService available:', typeof window.ReplayService);

        // Import ReplayProcessor dynamically to avoid circular dependencies
        import('../services/ReplayProcessor').then(({ default: ReplayProcessor }) => {
            window.ReplayProcessor = ReplayProcessor;
            console.log('✅ ReplayProcessor available:', typeof window.ReplayProcessor);
        }).catch(error => {
            console.error('❌ Failed to load ReplayProcessor:', error);
        });

    }, []);

    return (
        <Router>
            <div className="app">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/team/:teamId" element={<TeamPage />} />
                </Routes>

                {/* Debug Panel - only show in development */}
                {process.env.NODE_ENV === 'development' && (
                    <DebugPanel
                        isVisible={isDebugVisible}
                        onToggle={() => setIsDebugVisible(!isDebugVisible)}
                    />
                )}
            </div>
        </Router>
    );
};

export default App;