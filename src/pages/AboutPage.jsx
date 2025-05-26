// src/pages/AboutPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    Trophy,
    BarChart3,
    Users,
    Github,
    Heart,
    Zap,
    Shield,
    Globe
} from 'lucide-react';
import { Footer } from '../components';

const AboutPage = () => {
    const features = [
        {
            icon: Trophy,
            title: "Team Management",
            description: "Create and organize multiple VGC teams with Pokepaste integration"
        },
        {
            icon: BarChart3,
            title: "Performance Analytics",
            description: "Track win rates, usage stats, and detailed battle analysis"
        },
        {
            icon: Users,
            title: "Replay Analysis",
            description: "Import Showdown replays and analyze your gameplay patterns"
        },
        {
            icon: Zap,
            title: "Real-time Insights",
            description: "Get instant feedback on team performance and matchups"
        }
    ];

    const techStack = [
        "React 18 with modern hooks",
        "Chrome Extension Manifest V3",
        "Tailwind CSS for styling",
        "Pokemon Showdown API integration",
        "Pokepaste API integration",
        "Local storage with Chrome Storage API"
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 flex flex-col">
            <div className="flex-1 p-6">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center mb-8">
                        <Link
                            to="/"
                            className="mr-4 p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                                About VS Recorder
                            </h1>
                            <p className="text-gray-400">VGC Analytics for Champions</p>
                        </div>
                    </div>

                    {/* Mission Statement */}
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 mb-8">
                        <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                            <Heart className="h-5 w-5 text-red-400" />
                            Our Mission
                        </h2>
                        <p className="text-gray-300 leading-relaxed">
                            VS Recorder was created to help VGC players analyze their performance and improve their gameplay.
                            We believe that data-driven insights can help competitive Pokemon players reach their full potential.
                            Our goal is to make advanced analytics accessible to players of all skill levels.
                        </p>
                    </div>

                    {/* Features Grid */}
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-100 mb-6">Key Features</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {features.map((feature, index) => {
                                const Icon = feature.icon;
                                return (
                                    <div
                                        key={index}
                                        className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6"
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <Icon className="h-6 w-6 text-emerald-400" />
                                            <h3 className="text-lg font-semibold text-gray-100">
                                                {feature.title}
                                            </h3>
                                        </div>
                                        <p className="text-gray-400">{feature.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Technical Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Technology */}
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                                <Zap className="h-5 w-5" />
                                Technology Stack
                            </h2>
                            <ul className="space-y-2 text-gray-400">
                                {techStack.map((tech, index) => (
                                    <li key={index} className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                                        {tech}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Privacy & Security */}
                        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                            <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Privacy & Security
                            </h2>
                            <ul className="space-y-2 text-gray-400">
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                    All data stored locally on your device
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                    No user tracking or analytics
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                    Open source and transparent
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                    You control your data completely
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Version Info */}
                    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6 mb-8">
                        <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                            <Globe className="h-5 w-5" />
                            Version Information
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                            <div>
                                <p className="text-2xl font-bold text-emerald-400">v1.0.0</p>
                                <p className="text-gray-400 text-sm">Current Version</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-blue-400">Beta</p>
                                <p className="text-gray-400 text-sm">Release Stage</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-yellow-400">2025</p>
                                <p className="text-gray-400 text-sm">Release Year</p>
                            </div>
                        </div>
                    </div>

                    {/* Community */}
                    <div className="bg-gradient-to-r from-emerald-600/20 to-blue-600/20 border border-emerald-600/30 rounded-lg p-6 text-center">
                        <h2 className="text-xl font-semibold text-gray-100 mb-4">Join the Community</h2>
                        <p className="text-gray-300 mb-6">
                            VS Recorder is built by the VGC community, for the VGC community.
                            Help us improve by contributing feedback, reporting bugs, or contributing code.
                        </p>
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={() => alert('GitHub repository coming soon!')}
                                className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <Github className="h-4 w-4" />
                                GitHub
                            </button>
                            <button
                                onClick={() => alert('Feedback form coming soon!')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
                            >
                                <Heart className="h-4 w-4" />
                                Feedback
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default AboutPage;