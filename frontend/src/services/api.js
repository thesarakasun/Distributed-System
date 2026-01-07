import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost';
const REQUEST_TIMEOUT = 5000; // 5 seconds
const MAX_RETRIES = 2;

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
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

// Response interceptor for error handling and retry logic
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // If no config or already retried max times, reject
    if (!config || config.__retryCount >= MAX_RETRIES) {
      return Promise.reject(error);
    }

    // Initialize retry count
    config.__retryCount = config.__retryCount || 0;

    // Check if error is timeout or network error
    if (
      error.code === 'ECONNABORTED' ||
      error.code === 'ERR_NETWORK' ||
      error.message === 'Network Error' ||
      (error.response && [500, 502, 503, 504].includes(error.response.status))
    ) {
      config.__retryCount += 1;

      // Exponential backoff: 1s, 2s
      const backoffDelay = Math.pow(2, config.__retryCount - 1) * 1000;

      console.log(
        `Request failed, retrying (${config.__retryCount}/${MAX_RETRIES}) after ${backoffDelay}ms...`
      );

      await new Promise((resolve) => setTimeout(resolve, backoffDelay));

      return api(config);
    }

    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      // Clear auth data
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// API methods
export const authAPI = {
  login: (username, password) =>
    api.post('/api/auth/login', { username, password }),

  logout: () => api.post('/api/auth/logout'),

  register: (username, password, role = 'User') =>
    api.post('/api/auth/register', { username, password, role }),

  heartbeat: () => api.post('/api/auth/heartbeat'),

  getSession: () => api.get('/api/auth/session'),
};

export const notesAPI = {
  getAll: () => api.get('/api/notes'),

  getOne: (id) => api.get(`/api/notes/${id}`),

  create: (title, content) =>
    api.post('/api/notes', { title, content }),

  update: (id, title, content) =>
    api.put(`/api/notes/${id}`, { title, content }),

  delete: (id) => api.delete(`/api/notes/${id}`),

  acquireLock: (id) => api.post(`/api/notes/${id}/lock`),

  releaseLock: (id) => api.post(`/api/notes/${id}/unlock`),

  getLockStatus: (id) => api.get(`/api/notes/${id}/lock-status`),
};

export default api;
