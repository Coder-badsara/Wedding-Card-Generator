import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8000'
        : '');

const client = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
});

export default client;
