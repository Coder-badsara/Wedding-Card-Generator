import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? 'http://localhost:8000'
        : '');

export const getClientSessionId = () => {
  if (typeof window === 'undefined') return '';
  let sid = localStorage.getItem('wedding_card_session_id');
  if (!sid) {
    sid = 'sess_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
    localStorage.setItem('wedding_card_session_id', sid);
  }
  return sid;
};

const client = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
});

client.interceptors.request.use((config) => {
  const sessionId = getClientSessionId();
  if (sessionId) {
    config.headers['X-Session-ID'] = sessionId;
  }
  return config;
});

export default client;
