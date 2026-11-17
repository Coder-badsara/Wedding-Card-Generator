import client, { API_BASE_URL } from './client';

export const getProjects = async () => {
  const response = await client.get('/projects/');
  return response.data;
};

export const getProject = async (id) => {
  const response = await client.get(`/projects/${id}/`);
  return response.data;
};

export const createProject = async (formData) => {
  const response = await client.post('/projects/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updateProject = async (id, data) => {
  const response = await client.patch(`/projects/${id}/`, data);
  return response.data;
};

export const deleteProject = async (id) => {
  const response = await client.delete(`/projects/${id}/`);
  return response.data;
};

export const getProjectBatches = async (id) => {
  const response = await client.get(`/projects/${id}/batches/`);
  return response.data;
};

export const createBatch = async (id, payload) => {
  const response = await client.post(`/projects/${id}/create_batch/`, payload);
  return response.data;
};

export const renderSample = async (id, payload) => {
  const response = await client.post(`/projects/${id}/render_sample/`, payload, {
    responseType: 'blob',
  });
  return URL.createObjectURL(response.data);
};

export const getFonts = async () => {
  const response = await client.get('/fonts/');
  return response.data;
};

export const transliterateText = async (text, direction = 'auto') => {
  const response = await client.post('/transliterate/', { text, direction });
  return response.data.transliterated;
};

export const formatMediaUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path}`;
};
