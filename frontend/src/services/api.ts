import axios from 'axios';

// Debug environment variable loading
console.log('Environment check:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  mode: import.meta.env.MODE,
  all_env: import.meta.env
});

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

console.log('Using API Base URL:', API_BASE_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
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

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Enhanced error handling with proper message extraction
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Extract error message from response
    let errorMessage = 'An unexpected error occurred';

    if (error.response?.data) {
      if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error;
      } else if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      }
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Create a new error with the extracted message
    const enhancedError = new Error(errorMessage) as any;
    enhancedError.response = error.response;
    enhancedError.status = error.response?.status;

    return Promise.reject(enhancedError);
  }
);

export default api;
