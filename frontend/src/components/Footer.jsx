// src/components/Footer.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Download, Upload, Info, Github } from 'lucide-react';
import { useAuth } from '../contexts';

const Footer = () => {
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

    return (
        <footer className="mt-12 border-t border-slate-700">
            <div className="max-w-7xl mx-auto px-6 py-6">
                {/* Single row layout */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    {/* Left - Brand */}
                    <div className="flex items-center gap-6">
                        <div className="text-center md:text-left">
                            <h3 className="text-base font-semibold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                                VS Recorder
                            </h3>
                            <p className="text-gray-400 text-xs">VGC Analytics</p>
                        </div>

                        {/* GitHub link */}
                        <a
                            href="https://github.com/Pocolip/vs-recorder"
                            className="text-gray-400 hover:text-gray-200 transition-colors"
                            title="GitHub Repository"
                        >
                            <Github className="h-4 w-4" />
                        </a>
                    </div>

                    {/* Center - Action Buttons (smaller) - Import/Export only for authenticated users */}
                    <div className="flex gap-3">
                        {isAuthenticated && (
                            <>
                                <Link
                                    to="/import"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white rounded text-sm transition-colors"
                                >
                                    <Upload className="h-3 w-3" />
                                    Import
                                </Link>

                                <Link
                                    to="/export"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white rounded text-sm transition-colors"
                                >
                                    <Download className="h-3 w-3" />
                                    Export
                                </Link>
                            </>
                        )}

                        <Link
                            to="/about"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white rounded text-sm transition-colors"
                        >
                            <Info className="h-3 w-3" />
                            About
                        </Link>
                    </div>

                    {/* Right - Version/Copyright */}
                    <div className="text-center md:text-right">
                        <p className="text-xs text-gray-400">
                            © 2025 Luis Medina
                        </p>
                        <p className="text-xs text-gray-500">v1.0.0</p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;