// src/components/NewTeamModal.jsx
import React, { useState } from 'react';
import { X, Users, Link as LinkIcon, Tag, User, AlertCircle } from 'lucide-react';

const NewTeamModal = ({ onClose, onCreateTeam }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        pokepaste: '',
        format: 'VGC 2025',
        showdownUsernames: '',
        tags: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const formats = [
        'VGC 2025',
        'VGC 2024',
        'VGC 2023',
        'BSS',
        'Doubles OU',
        'Other'
    ];

    const validatePokepasteUrl = (url) => {
        if (!url.trim()) return true; // Optional field
        const pokepastePattern = /^https?:\/\/(www\.)?pokepast\.es\/[a-zA-Z0-9]+\/?$/;
        return pokepastePattern.test(url.trim());
    };

    const parseArrayField = (value) => {
        return value
            .split(',')
            .map(item => item.trim())
            .filter(item => item);
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error when user starts typing
        if (error) {
            setError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.name.trim()) {
            setError('Team name is required');
            return;
        }

        if (formData.pokepaste && !validatePokepasteUrl(formData.pokepaste)) {
            setError('Please enter a valid Pokepaste URL (e.g., https://pokepast.es/abc123)');
            return;
        }

        try {
            setLoading(true);
            setError('');

            const teamData = {
                name: formData.name.trim(),
                description: formData.description.trim(),
                pokepaste: formData.pokepaste.trim(),
                format: formData.format,
                showdownUsernames: parseArrayField(formData.showdownUsernames),
                tags: parseArrayField(formData.tags)
            };

            await onCreateTeam(teamData);
            // Modal will be closed by parent component on success
        } catch (err) {
            setError(err.message || 'Failed to create team. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 border border-slate-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-700">
                    <h2 className="text-xl font-semibold text-gray-100">Create New Team</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-200 transition-colors"
                        disabled={loading}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Team Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            <Users className="h-4 w-4 inline mr-1" />
                            Team Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            placeholder="Enter your team name..."
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-400"
                            disabled={loading}
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            placeholder="Describe your team strategy, meta, or notes..."
                            rows={3}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-400 resize-none"
                            disabled={loading}
                        />
                    </div>

                    {/* Pokepaste URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            <LinkIcon className="h-4 w-4 inline mr-1" />
                            Pokepaste URL
                        </label>
                        <input
                            type="url"
                            value={formData.pokepaste}
                            onChange={(e) => handleInputChange('pokepaste', e.target.value)}
                            placeholder="https://pokepast.es/abc123"
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-400"
                            disabled={loading}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Optional: Link to your team's Pokepaste for automatic Pokémon import
                        </p>
                    </div>

                    {/* Format */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Format
                        </label>
                        <select
                            value={formData.format}
                            onChange={(e) => handleInputChange('format', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 focus:outline-none focus:border-emerald-400"
                            disabled={loading}
                        >
                            {formats.map(format => (
                                <option key={format} value={format}>{format}</option>
                            ))}
                        </select>
                    </div>

                    {/* Showdown Usernames */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            <User className="h-4 w-4 inline mr-1" />
                            Showdown Usernames
                        </label>
                        <input
                            type="text"
                            value={formData.showdownUsernames}
                            onChange={(e) => handleInputChange('showdownUsernames', e.target.value)}
                            placeholder="username1, username2, username3"
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-400"
                            disabled={loading}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Optional: Comma-separated list of your Pokémon Showdown usernames for this team
                        </p>
                    </div>

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            <Tag className="h-4 w-4 inline mr-1" />
                            Tags
                        </label>
                        <input
                            type="text"
                            value={formData.tags}
                            onChange={(e) => handleInputChange('tags', e.target.value)}
                            placeholder="meta, offense, trick room, sun team"
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-emerald-400"
                            disabled={loading}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Optional: Comma-separated tags to help organize and filter your teams
                        </p>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 bg-red-600/20 border border-red-600/30 rounded-lg">
                            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-red-400 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Users className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="text-sm">
                                <p className="text-blue-400 font-medium mb-1">Team Creation</p>
                                <p className="text-gray-300">
                                    Once created, you can add replays to analyze your team's performance.
                                    If you provide a Pokepaste URL, we'll automatically parse your team composition.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-300 hover:text-gray-100 transition-colors"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !formData.name.trim()}
                            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Creating Team...
                                </>
                            ) : (
                                <>
                                    <Users className="h-4 w-4" />
                                    Create Team
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewTeamModal;