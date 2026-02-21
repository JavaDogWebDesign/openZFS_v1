import axios from 'axios';

const API_BASE = '/api/v1';

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Add CSRF header to mutating requests
client.interceptors.request.use((config) => {
  if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method)) {
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
  }
  return config;
});

// Redirect to login on 401
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
