import React from 'react';
import { Routes, Route, HashRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import TeamAnalysisPage from '../pages/TeamAnalysisPage';

const App = () => {
    return (
        <HashRouter>
            <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/team/:teamId" element={<TeamAnalysisPage />} />
                </Routes>
            </div>
        </HashRouter>
    );
};

export default App;