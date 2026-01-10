import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

/**
 * Axios instance configured for VS Recorder backend
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - add JWT token to all requests
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - handle errors globally
 */
apiClient.interceptors.response.use(
  (response) => {
    // Return just the data from successful responses
    return response.data;
  },
  (error) => {
    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      const requestUrl = error.config?.url || '';
      const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');
      const isOnLoginPage = window.location.pathname === '/login';

      // Only redirect if this isn't a login/register attempt
      // If user is trying to login and fails, let the error show instead of redirecting
      if (!isAuthEndpoint && !isOnLoginPage) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      } else {
        // Clear token but don't redirect (let login page handle the error)
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    // Extract error message from response
    const errorMessage =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred';

    // Reject with error message
    return Promise.reject(new Error(errorMessage));
  }
);

export default apiClient;
