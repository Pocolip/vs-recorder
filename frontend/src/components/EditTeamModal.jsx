// src/components/EditTeamModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Users, Link as LinkIcon, User, AlertCircle } from 'lucide-react';
import PokepasteService from '../services/PokepasteService';

const EditTeamModal = ({ isOpen, teamData, onClose, onTeamUpdated }) => {
    const [formData, setFormData] = useState({
        name: '',
        pokepaste: '',
        regulation: 'VGC 2025 Regulation F',
        showdownUsernames: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const formats = [
        'VGC 2025 Regulation A',
        'VGC 2025 Regulation B',
        'VGC 2025 Regulation C',
        'VGC 2025 Regulation D',
        'VGC 2025 Regulation E',
        'VGC 2025 Regulation F',
        'VGC 2025 Regulation G',
        'VGC 2025 Regulation H',
        'VGC 2025 Regulation I',
        'VGC 2025 Regulation J'
    ];

    useEffect(() => {
        if (teamData) {
            setFormData({
                name: teamData.name || '',
                pokepaste: teamData.pokepaste || '',
                regulation: teamData.regulation || 'VGC 2025 Regulation F',
                showdownUsernames: Array.isArray(teamData.showdownUsernames)
                    ? teamData.showdownUsernames.join(', ')
                    : (teamData.showdownUsernames || '')
            });
        }
    }, [teamData]);

    const validatePasteUrl = (url) => {
        if (!url.trim()) return true; // Optional field
        return PokepasteService.isValidPokepasteUrl(url.trim());
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
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Team name is required';
        }

        if (formData.pokepaste && !validatePasteUrl(formData.pokepaste)) {
            newErrors.pokepaste = 'Please enter a valid Pokepaste or Pokebin URL (e.g., https://pokepast.es/abc123 or https://pokebin.com/abc123)';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            setIsLoading(true);

            const updatedTeamData = {
                ...teamData,
                name: formData.name.trim(),
                pokepaste: formData.pokepaste.trim(),
                regulation: formData.regulation,
                showdownUsernames: parseArrayField(formData.showdownUsernames)
            };

            await onTeamUpdated(updatedTeamData);
            // Modal will be closed by parent component on success
        } catch (error) {
            console.error('Error updating team:', error);
            setErrors({ submit: error.message || 'Failed to update team. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !teamData) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-semibold text-gray-100">Edit Team</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-200"
                        disabled={isLoading}
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {errors.submit && (
                        <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                            <span className="text-red-200 text-sm">{errors.submit}</span>
                        </div>
                    )}

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
                            placeholder="Enter team name"
                            className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                errors.name ? 'border-red-500' : 'border-slate-600'
                            }`}
                            disabled={isLoading}
                        />
                        {errors.name && (
                            <p className="text-red-400 text-sm mt-1">{errors.name}</p>
                        )}
                    </div>

                    {/* Pokepaste URL */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            <LinkIcon className="h-4 w-4 inline mr-1" />
                            Pokepaste / Pokebin URL
                        </label>
                        <input
                            type="url"
                            value={formData.pokepaste}
                            onChange={(e) => handleInputChange('pokepaste', e.target.value)}
                            placeholder="https://pokepast.es/... or https://pokebin.com/..."
                            className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                errors.pokepaste ? 'border-red-500' : 'border-slate-600'
                            }`}
                            disabled={isLoading}
                        />
                        {errors.pokepaste && (
                            <p className="text-red-400 text-sm mt-1">{errors.pokepaste}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                            Link to your team on Pokepaste or Pokebin
                        </p>
                    </div>

                    {/* Regulation */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Regulation
                        </label>
                        <select
                            value={formData.regulation}
                            onChange={(e) => handleInputChange('regulation', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isLoading}
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
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isLoading}
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Comma-separated list of your Pokémon Showdown usernames for this team
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-gray-300 border border-slate-600 rounded-lg hover:bg-slate-700 transition-colors"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Updating...' : 'Update Team'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTeamModal;