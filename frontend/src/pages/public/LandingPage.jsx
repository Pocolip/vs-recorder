import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-emerald-500 mb-4">
          VS Recorder
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-12">
          Pokemon VGC Replay Analysis & Tournament Preparation
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link to="/login" className="btn-primary text-lg px-8 py-3">
            Login
          </Link>
          <Link to="/register" className="btn-secondary text-lg px-8 py-3">
            Register
          </Link>
        </div>

        {/* Features */}
        <div className="card max-w-2xl mx-auto text-left">
          <h2 className="text-2xl font-semibold text-emerald-400 mb-4">Key Features</h2>
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-start">
              <span className="text-emerald-500 mr-2">✓</span>
              Import and analyze Pokemon Showdown replays
            </li>
            <li className="flex items-start">
              <span className="text-emerald-500 mr-2">✓</span>
              Track team performance and win rates
            </li>
            <li className="flex items-start">
              <span className="text-emerald-500 mr-2">✓</span>
              Analyze matchups and move usage patterns
            </li>
            <li className="flex items-start">
              <span className="text-emerald-500 mr-2">✓</span>
              Plan tournament strategies with the game planner
            </li>
            <li className="flex items-start">
              <span className="text-emerald-500 mr-2">✓</span>
              Export and share your data
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
