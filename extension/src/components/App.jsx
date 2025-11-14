// src/components/App.jsx
import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import TeamPage from '../pages/TeamPage';
import ImportPage from '../pages/ImportPage';
import ExportPage from '../pages/ExportPage';
import AboutPage from '../pages/AboutPage';
import StorageService from '../services/StorageService';
import PokemonService from '../services/PokemonService';

const App = () => {
    useEffect(() => {
        initializeApp();
    }, []);

    const initializeApp = async () => {
        try {
            // Check if this is the first time the app is being used
            const hasInitialized = await StorageService.exists('app_initialized');

            if (!hasInitialized) {
                // Initialize with empty data structure
                await StorageService.setMultiple({
                    teams: {},
                    replays: {},
                    app_initialized: true,
                    app_version: '1.0.0'
                });

                console.log('VS Recorder initialized successfully');
            }

            // Initialize Pokemon service
            const pokemonInitialized = await PokemonService.initialize();
            if (pokemonInitialized) {
                console.log('PokemonService initialized with API support');
            } else {
                console.log('PokemonService initialized with fallback data only');
            }

        } catch (error) {
            console.error('Error initializing app:', error);
        }
    };

    return (
        <Router>
            <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/team/:teamId" element={<TeamPage />} />
                    <Route path="/import" element={<ImportPage />} />
                    <Route path="/export" element={<ExportPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    {/* 404 fallback - redirect to home */}
                    <Route path="*" element={<HomePage />} />
                </Routes>
            </div>
        </Router>
    );
};

export default App;