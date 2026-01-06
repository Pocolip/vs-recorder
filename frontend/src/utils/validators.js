/**
 * Form validation utilities
 */

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate username
 * @param {string} username - Username to validate
 * @returns {Object} Validation result { valid, message }
 */
export const validateUsername = (username) => {
  if (!username || username.trim().length === 0) {
    return { valid: false, message: 'Username is required' };
  }
  if (username.length < 3) {
    return { valid: false, message: 'Username must be at least 3 characters' };
  }
  if (username.length > 50) {
    return { valid: false, message: 'Username must be less than 50 characters' };
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { valid: false, message: 'Username can only contain letters, numbers, hyphens, and underscores' };
  }
  return { valid: true, message: '' };
};

/**
 * Validate email
 * @param {string} email - Email to validate
 * @returns {Object} Validation result { valid, message }
 */
export const validateEmail = (email) => {
  if (!email || email.trim().length === 0) {
    return { valid: false, message: 'Email is required' };
  }
  if (!isValidEmail(email)) {
    return { valid: false, message: 'Please enter a valid email address' };
  }
  return { valid: true, message: '' };
};

/**
 * Validate password
 * @param {string} password - Password to validate
 * @returns {Object} Validation result { valid, message }
 */
export const validatePassword = (password) => {
  if (!password || password.length === 0) {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  return { valid: true, message: '' };
};

/**
 * Validate password confirmation
 * @param {string} password - Original password
 * @param {string} confirmPassword - Password confirmation
 * @returns {Object} Validation result { valid, message }
 */
export const validatePasswordConfirmation = (password, confirmPassword) => {
  if (!confirmPassword || confirmPassword.length === 0) {
    return { valid: false, message: 'Please confirm your password' };
  }
  if (password !== confirmPassword) {
    return { valid: false, message: 'Passwords do not match' };
  }
  return { valid: true, message: '' };
};

/**
 * Validate login form
 * @param {Object} data - Form data { username, password }
 * @returns {Object} Validation result { valid, errors }
 */
export const validateLoginForm = (data) => {
  const errors = {};

  const usernameValidation = validateUsername(data.username);
  if (!usernameValidation.valid) {
    errors.username = usernameValidation.message;
  }

  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.valid) {
    errors.password = passwordValidation.message;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validate register form
 * @param {Object} data - Form data { username, email, password, confirmPassword }
 * @returns {Object} Validation result { valid, errors }
 */
export const validateRegisterForm = (data) => {
  const errors = {};

  const usernameValidation = validateUsername(data.username);
  if (!usernameValidation.valid) {
    errors.username = usernameValidation.message;
  }

  const emailValidation = validateEmail(data.email);
  if (!emailValidation.valid) {
    errors.email = emailValidation.message;
  }

  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.valid) {
    errors.password = passwordValidation.message;
  }

  const confirmValidation = validatePasswordConfirmation(data.password, data.confirmPassword);
  if (!confirmValidation.valid) {
    errors.confirmPassword = confirmValidation.message;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};
