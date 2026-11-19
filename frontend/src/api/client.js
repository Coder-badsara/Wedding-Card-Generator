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
  timeout: 120000, // 120s timeout so Render cold starts have sufficient time
});

client.interceptors.request.use((config) => {
  const sessionId = getClientSessionId();
  if (sessionId) {
    config.headers['X-Session-ID'] = sessionId;
  }
  return config;
});

// Automatic silent retry for cold start transient errors (502, 503, 504, timeout, network error)
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config || config._noRetry) {
      return Promise.reject(error);
    }

    config._retryCount = config._retryCount || 0;
    const maxRetries = config.maxRetries !== undefined ? config.maxRetries : 2;

    const isColdStartStatus =
      !error.response ||
      error.code === 'ECONNABORTED' ||
      [502, 503, 504].includes(error.response?.status);

    if (isColdStartStatus && config._retryCount < maxRetries) {
      config._retryCount += 1;
      const delayMs = config._retryCount * 2500;
      await new Promise((res) => setTimeout(res, delayMs));
      return client(config);
    }

    return Promise.reject(error);
  }
);

// Silent background wake-up ping
export const triggerWakeupPing = () => {
  if (typeof window === 'undefined') return;
  // Fire and forget, ignore any errors
  client.get('/projects/', { _noRetry: true, timeout: 60000 }).catch(() => {});
};

export default client;
