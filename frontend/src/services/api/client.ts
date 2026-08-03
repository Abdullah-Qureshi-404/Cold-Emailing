import axios from 'axios';

export const BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 30000,
});

// Request interceptor for future JWT authentication support
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for centralized error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let errorMessage = 'An unexpected error occurred';
    if (error.response) {
      const data = error.response.data;
      if (typeof data === 'string') {
        errorMessage = data;
      } else if (data?.detail) {
        errorMessage = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
      } else if (data?.message) {
        errorMessage = data.message;
      } else {
        errorMessage = `HTTP Error ${error.response.status}`;
      }
    } else if (error.request) {
      errorMessage = 'Unable to connect to FastAPI backend server at ' + BASE_URL;
    } else if (error.message) {
      errorMessage = error.message;
    }

    console.error('[API Error]:', errorMessage, error);
    return Promise.reject(new Error(errorMessage));
  }
);
