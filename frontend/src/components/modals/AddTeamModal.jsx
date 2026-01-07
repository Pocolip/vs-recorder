import React, { useState } from 'react';
import { Modal, Input, Button } from '@/components/common';
import { REGULATIONS } from '@/utils/constants';

/**
 * Modal for adding a new team
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal open state
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onSubmit - Submit handler (receives team data)
 */
const AddTeamModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    pokepaste: '',
    regulation: 'Regulation F',
    showdownUsernames: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Team name is required';
    }

    if (!formData.pokepaste.trim()) {
      newErrors.pokepaste = 'Pokepaste URL is required';
    } else if (!formData.pokepaste.includes('pokepast.es')) {
      newErrors.pokepaste = 'Please enter a valid Pokepaste URL';
    }

    if (!formData.regulation) {
      newErrors.regulation = 'Regulation is required';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Prepare data
      const teamData = {
        name: formData.name.trim(),
        pokepaste: formData.pokepaste.trim(),
        regulation: formData.regulation,
      };

      // Add showdown usernames if provided
      if (formData.showdownUsernames.trim()) {
        teamData.showdownUsernames = formData.showdownUsernames
          .split(',')
          .map((u) => u.trim())
          .filter((u) => u.length > 0);
      }

      await onSubmit(teamData);

      // Reset form and close modal
      setFormData({
        name: '',
        pokepaste: '',
        regulation: 'Regulation F',
        showdownUsernames: '',
      });
      onClose();
    } catch (error) {
      console.error('Error creating team:', error);
      // Error will be handled by the parent component (toast notification)
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        name: '',
        pokepaste: '',
        regulation: 'Regulation F',
        showdownUsernames: '',
      });
      setErrors({});
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Team" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Team Name */}
        <Input
          label="Team Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Worlds 2024 Team"
          error={errors.name}
          disabled={loading}
          required
        />

        {/* Pokepaste URL */}
        <Input
          label="Pokepaste URL"
          name="pokepaste"
          type="url"
          value={formData.pokepaste}
          onChange={handleChange}
          placeholder="https://pokepast.es/..."
          error={errors.pokepaste}
          disabled={loading}
          required
        />

        {/* Regulation */}
        <div>
          <label htmlFor="regulation" className="block text-sm font-medium text-gray-300 mb-2">
            Regulation <span className="text-red-400 ml-1">*</span>
          </label>
          <select
            id="regulation"
            name="regulation"
            value={formData.regulation}
            onChange={handleChange}
            className="input"
            disabled={loading}
          >
            {REGULATIONS.map((reg) => (
              <option key={reg} value={reg}>
                {reg}
              </option>
            ))}
          </select>
          {errors.regulation && (
            <p className="mt-1 text-sm text-red-400">{errors.regulation}</p>
          )}
        </div>

        {/* Showdown Usernames */}
        <Input
          label="Showdown Usernames (Optional)"
          name="showdownUsernames"
          value={formData.showdownUsernames}
          onChange={handleChange}
          placeholder="username1, username2, username3"
          disabled={loading}
        />
        <p className="text-xs text-gray-500 -mt-4">
          Enter your Pokemon Showdown usernames separated by commas
        </p>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={handleClose} disabled={loading} type="button">
            Cancel
          </Button>
          <Button type="submit" loading={loading} disabled={loading}>
            {loading ? 'Creating...' : 'Create Team'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddTeamModal;
