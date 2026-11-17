import client from './client';

export const getBatch = async (id) => {
  const response = await client.get(`/batches/${id}/`);
  return response.data;
};

export const getBatchStatus = async (id) => {
  const response = await client.get(`/batches/${id}/status/`);
  return response.data;
};

export const retryBatch = async (id) => {
  const response = await client.post(`/batches/${id}/retry/`);
  return response.data;
};

export const deleteBatch = async (id) => {
  const response = await client.delete(`/batches/${id}/`);
  return response.data;
};

export const deleteCard = async (id) => {
  const response = await client.delete(`/cards/${id}/`);
  return response.data;
};
