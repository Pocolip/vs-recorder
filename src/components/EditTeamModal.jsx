// src/components/EditTeamModal.jsx
import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/StorageService';

const EditTeamModal = ({ isOpen, onClose, teamData, onTeamUpdated }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        pokepaste: '',
        showdownUsernames: '',
        format: '',
        tags: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Populate form when teamData changes
    useEffect(() => {
        if (teamData) {
            setFormData({
                name: teamData.name || '',
                description: teamData.description || '',
                pokepaste: teamData.pokepaste || '',
                showdownUsernames: (teamData.showdownUsernames || []).join(', '),
                format: teamData.format || '',
                tags: (teamData.tags || []).join(', ')
            });
        }
    }, [teamData]);

    const handleClose = () => {
        if (!isLoading) {
            setErrors({});
            onClose();
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Team name is required';
        }

        if (formData.pokepaste && !isValidPokepasteUrl(formData.pokepaste.trim())) {
            newErrors.pokepaste = 'Please enter a valid Pokepaste URL';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const isValidPokepasteUrl = (url) => {
        const pokepasteRegex = /^https?:\/\/pokepast\.es\/[a-zA-Z0-9]+\/?$/;
        return pokepasteRegex.test(url);
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setErrors({});

        try {
            const updatedTeamData = {
                ...teamData,
                name: formData.name.trim(),
                description: formData.description.trim(),
                pokepaste: formData.pokepaste.trim(),
                showdownUsernames: formData.showdownUsernames
                    ? formData.showdownUsernames.split(',').map(u => u.trim()).filter(u => u)
                    : [],
                format: formData.format.trim(),
                tags: formData.tags
                    ? formData.tags.split(',').map(t => t.trim()).filter(t => t)
                    : [],
                lastModified: new Date().toISOString()
            };

            console.log('Updating team with data:', updatedTeamData);

            const savedTeam = await StorageService.saveTeam(updatedTeamData);

            console.log('Team updated successfully:', savedTeam);

            if (onTeamUpdated) {
                onTeamUpdated(savedTeam);
            }

            handleClose();
        } catch (error) {
            console.error('Error updating team:', error);
            setErrors({ submit: 'Failed to update team. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: undefined
            }));
        }
    };

    if (!isOpen || !teamData) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-100">Edit Team</h2>
                        <button
                            onClick={handleClose}
                            disabled={isLoading}
                            className="text-gray-400 hover:text-gray-200 text-2xl leading-none disabled:opacity-50"
                        >
                            ×
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* Team Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Team Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                                placeholder="Enter team name"
                                className={`w-full px-3 py-2 bg-slate-700 border rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    errors.name ? 'border-red-500' : 'border-slate-600'
                                }`}
                                disabled={isLoading}
                            />
                            {errors.name && (
                                <p className="text-red-400 text-sm mt-1">{errors.name}</p>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                placeholder="Optional description of your team"
                                rows={3}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Pokepaste URL */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Pokepaste URL
                            </label>
                            <input
                                type="url"
                                value={formData.pokepaste}
                                onChange={(e) => handleInputChange('pokepaste', e.target.value)}
                                placeholder="https://pokepast.es/..."
                                className={`w-full px-3 py-2 bg-slate-700 border rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                    errors.pokepaste ? 'border-red-500' : 'border-slate-600'
                                }`}
                                disabled={isLoading}
                            />
                            {errors.pokepaste && (
                                <p className="text-red-400 text-sm mt-1">{errors.pokepaste}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">
                                Link to your team on Pokepaste
                            </p>
                        </div>

                        {/* Format */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Format
                            </label>
                            <input
                                type="text"
                                value={formData.format}
                                onChange={(e) => handleInputChange('format', e.target.value)}
                                placeholder="e.g., VGC 2025 Reg I"
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isLoading}
                            />
                        </div>

                        {/* Showdown Usernames */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Showdown Usernames
                            </label>
                            <input
                                type="text"
                                value={formData.showdownUsernames}
                                onChange={(e) => handleInputChange('showdownUsernames', e.target.value)}
                                placeholder="username1, username2"
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isLoading}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Comma-separated list of your Showdown usernames
                            </p>
                        </div>

                        {/* Tags */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Tags
                            </label>
                            <input
                                type="text"
                                value={formData.tags}
                                onChange={(e) => handleInputChange('tags', e.target.value)}
                                placeholder="Main, Tournament, Restricteds"
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isLoading}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Comma-separated tags to organize your teams
                            </p>
                        </div>
                    </div>

                    {/* Error Message */}
                    {errors.submit && (
                        <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-md">
                            <p className="text-red-300 text-sm">{errors.submit}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 justify-end mt-6">
                        <button
                            onClick={handleClose}
                            disabled={isLoading}
                            className="px-4 py-2 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || !formData.name.trim()}
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading && (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            )}
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditTeamModal;