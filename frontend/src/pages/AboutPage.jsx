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
    Shield,
    ExternalLink,
    MessageCircle,
    Target,
    Cloud,
    DollarSign,
    Coins
} from 'lucide-react';
import { Footer } from '../components';

const AboutPage = () => {
    const features = [
        {
            icon: Trophy,
            title: "Team Management",
            description: "Import teams from Pokepaste/Pokebin and organize your VGC roster"
        },
        {
            icon: BarChart3,
            title: "Performance Analytics",
            description: "Track win rates, usage stats, and identify your best matchups"
        },
        {
            icon: Users,
            title: "Replay Analysis",
            description: "Import Showdown replays and analyze gameplay patterns"
        },
        {
            icon: Target,
            title: "Opponent Planning",
            description: "Plan strategies against specific opponent teams with leads and backups"
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 flex flex-col">
            <div className="flex-1 p-6">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center mb-6">
                        <Link
                            to="/"
                            className="mr-4 p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                                VS Recorder
                            </h1>
                            <p className="text-gray-400">VGC Analytics Platform</p>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-6">
                            {/* Features */}
                            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                                <h2 className="text-xl font-bold text-gray-100 mb-4">Key Features</h2>
                                <div className="space-y-4">
                                    {features.map((feature, index) => {
                                        const Icon = feature.icon;
                                        return (
                                            <div key={index} className="flex items-start gap-3">
                                                <Icon className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                                                <div>
                                                    <h3 className="font-semibold text-gray-100 text-sm">
                                                        {feature.title}
                                                    </h3>
                                                    <p className="text-gray-400 text-sm">{feature.description}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Getting Started */}
                            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                                <h2 className="text-xl font-bold text-gray-100 mb-4">Getting Started</h2>
                                <div className="space-y-2 text-sm text-gray-300">
                                    <p>1. Import your team from Pokepaste</p>
                                    <p>2. Add Showdown replays to start tracking</p>
                                    <p>3. View your analytics on the dashboard</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-6">
                            {/* Data & Security */}
                            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                                <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
                                    <Cloud className="h-5 w-5" />
                                    Data & Security
                                </h2>
                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                        Your data is synced securely to your account
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                        Access your teams from any device
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                                        Open source and transparent
                                    </div>
                                </div>
                            </div>

                            {/* Support & Links */}
                            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                                <h2 className="text-xl font-bold text-gray-100 mb-4">Support & Links</h2>
                                <div className="space-y-3">
                                    <a
                                        href="https://github.com/Pocolip/vs-recorder"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-gray-300 hover:text-emerald-400 transition-colors text-sm"
                                    >
                                        <Github className="h-4 w-4" />
                                        Report issues on GitHub
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                    <a
                                        href="https://x.com/luisfrik"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-gray-300 hover:text-blue-400 transition-colors text-sm"
                                    >
                                        <MessageCircle className="h-4 w-4" />
                                        Follow on Twitter/X
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                    <a
                                        href="https://chromewebstore.google.com/detail/pokemon-showdown-replay-s/bhbnajjpbnbjdichnlbjmgiokcpemjme"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-gray-300 hover:text-emerald-400 transition-colors text-sm"
                                    >
                                        <Heart className="h-4 w-4" />
                                        Check out my other extension for automatically saving replays
                                        <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            </div>

                            {/* Financial Support */}
                            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-6">
                                <h2 className="text-xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                                    <Heart className="h-5 w-5 text-pink-400" />
                                    Support Development
                                </h2>
                                <p className="text-gray-400 text-sm mb-4">
                                    If VS Recorder has helped your VGC journey, consider supporting its development!
                                </p>

                                <div className="space-y-3">
                                    {/* PayPal */}
                                    <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                                        <DollarSign className="h-5 w-5 text-blue-400" />
                                        <div className="flex-1">
                                            <p className="text-gray-200 text-sm font-medium">PayPal</p>
                                            <p className="text-gray-400 text-xs">luisfrik@gmail.com</p>
                                        </div>
                                    </div>

                                    {/* Bitcoin */}
                                    <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                                        <Coins className="h-5 w-5 text-orange-400" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-gray-200 text-sm font-medium">Bitcoin</p>
                                            <p className="text-gray-400 text-xs truncate font-mono">3KMwSv6KCYiKuuR9N1GoZ9RX4bvsYcwtPt</p>
                                        </div>
                                    </div>

                                    {/* Dogecoin */}
                                    <div className="flex items-center gap-3 p-3 bg-slate-700/50 rounded-lg">
                                        <Coins className="h-5 w-5 text-yellow-400" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-gray-200 text-sm font-medium">Dogecoin</p>
                                            <p className="text-gray-400 text-xs truncate font-mono">D6smeLTJFrv6vM7npwWWzonXtBH9r1bRjh</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default AboutPage;