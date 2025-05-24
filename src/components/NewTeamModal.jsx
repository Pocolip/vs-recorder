import React, { useState } from 'react';
import StorageService from '../services/StorageService';

const NewTeamModal = ({ isOpen, onClose, onTeamCreated }) => {
    const [formData, setFormData] = useState({
        name: '',
        pokepaste: '',
        format: 'VGC 2025',
        description: '',
        showdownUsers: '',
        customTags: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Required fields
        if (!formData.name.trim()) {
            newErrors.name = 'Team name is required';
        }

        if (!formData.pokepaste.trim()) {
            newErrors.pokepaste = 'Pokepaste link is required';
        } else {
            // Basic URL validation for Pokepaste
            const pokepasteRegex = /^https?:\/\/(www\.)?pokepast\.es\/[a-zA-Z0-9]+\/?$/;
            if (!pokepasteRegex.test(formData.pokepaste.trim())) {
                newErrors.pokepaste = 'Please enter a valid Pokepaste URL (e.g., https://pokepast.es/abc123)';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            // Parse custom tags and showdown users
            const customTags = formData.customTags
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0);

            const showdownUsers = formData.showdownUsers
                .split(',')
                .map(user => user.trim())
                .filter(user => user.length > 0);

            // Create new team
            const newTeam = await StorageService.addTeam({
                name: formData.name.trim(),
                description: formData.description.trim(),
                pokepaste: formData.pokepaste.trim(),
                format: formData.format,
                showdownUsers: showdownUsers.length > 0 ? showdownUsers : ['YourUsername'],
                customTags,
                pokemon: '🎯🎯🎯🎯🎯🎯' // Placeholder until we parse the Pokepaste
            });

            // Call the callback to refresh the parent component
            onTeamCreated(newTeam);

            // Reset form and close modal
            setFormData({
                name: '',
                pokepaste: '',
                format: 'VGC 2025',
                description: '',
                showdownUsers: '',
                customTags: ''
            });
            setErrors({});
            onClose();

        } catch (error) {
            console.error('Error creating team:', error);
            setErrors({ submit: 'Failed to create team. Please try again.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (!isSubmitting) {
            setFormData({
                name: '',
                pokepaste: '',
                format: 'VGC 2025',
                description: '',
                showdownUsers: '',
                customTags: ''
            });
            setErrors({});
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-lg border border-slate-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-gray-100">Create New Team</h2>
                    <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="text-gray-400 hover:text-gray-300 transition-colors disabled:opacity-50"
                    >
                        ✕
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Team Name */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                            Team Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="e.g., Main VGC Team"
                            className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-gray-100 placeholder-gray-400 transition-colors ${
                                errors.name ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
                            }`}
                            disabled={isSubmitting}
                        />
                        {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                    </div>

                    {/* Pokepaste Link */}
                    <div>
                        <label htmlFor="pokepaste" className="block text-sm font-medium text-gray-300 mb-2">
                            Pokepaste Link <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="url"
                            id="pokepaste"
                            name="pokepaste"
                            value={formData.pokepaste}
                            onChange={handleInputChange}
                            placeholder="https://pokepast.es/abc123"
                            className={`w-full px-3 py-2 bg-slate-700 border rounded-lg text-gray-100 placeholder-gray-400 transition-colors ${
                                errors.pokepaste ? 'border-red-500' : 'border-slate-600 focus:border-blue-500'
                            }`}
                            disabled={isSubmitting}
                        />
                        {errors.pokepaste && <p className="text-red-400 text-sm mt-1">{errors.pokepaste}</p>}
                        <p className="text-gray-500 text-xs mt-1">
                            Create your team at <a href="https://pokepast.es" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">pokepast.es</a> and paste the link here
                        </p>
                    </div>

                    {/* Format */}
                    <div>
                        <label htmlFor="format" className="block text-sm font-medium text-gray-300 mb-2">
                            Format
                        </label>
                        <select
                            id="format"
                            name="format"
                            value={formData.format}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 focus:border-blue-500 transition-colors"
                            disabled={isSubmitting}
                        >
                            <option value="VGC 2025">VGC 2025</option>
                            <option value="VGC 2024">VGC 2024</option>
                            <option value="Battle Stadium Singles">Battle Stadium Singles</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                            Description
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="Optional description for this team..."
                            rows={3}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:border-blue-500 transition-colors resize-none"
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Showdown Users */}
                    <div>
                        <label htmlFor="showdownUsers" className="block text-sm font-medium text-gray-300 mb-2">
                            Showdown Usernames
                        </label>
                        <input
                            type="text"
                            id="showdownUsers"
                            name="showdownUsers"
                            value={formData.showdownUsers}
                            onChange={handleInputChange}
                            placeholder="username1, username2"
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:border-blue-500 transition-colors"
                            disabled={isSubmitting}
                        />
                        <p className="text-gray-500 text-xs mt-1">
                            Comma-separated list of your Pokémon Showdown usernames for this team
                        </p>
                    </div>

                    {/* Custom Tags */}
                    <div>
                        <label htmlFor="customTags" className="block text-sm font-medium text-gray-300 mb-2">
                            Tags
                        </label>
                        <input
                            type="text"
                            id="customTags"
                            name="customTags"
                            value={formData.customTags}
                            onChange={handleInputChange}
                            placeholder="tournament, experimental, main"
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-gray-100 placeholder-gray-400 focus:border-blue-500 transition-colors"
                            disabled={isSubmitting}
                        />
                        <p className="text-gray-500 text-xs mt-1">
                            Comma-separated tags to help organize your teams
                        </p>
                    </div>

                    {/* Submit Error */}
                    {errors.submit && (
                        <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg">
                            <p className="text-red-400 text-sm">{errors.submit}</p>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Creating...
                                </>
                            ) : (
                                'Create Team'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewTeamModal;