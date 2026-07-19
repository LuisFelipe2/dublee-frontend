const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'https://dublee-image-558237336336.us-east4.run.app/api';

export const post = async (url, body, headers = {}) => {
  const response = await fetch(`${API_BASE_URL}/${url}`, {
    method: 'POST',
    headers: headers,
    body: body
  }).then(res => res.json());

  return [response.data, !response.error];
};

export const postBlob = async (url, body, headers = {}) => {
  const res = await fetch(`${API_BASE_URL}/${url}`, {
    method: 'POST',
    headers: headers,
    body: body
  });
  if (!res.ok) return [null, false];
  return [await res.blob(), true];
};

export const get = async (url) => {
  const response = await fetch(`${API_BASE_URL}/${url}`)
      .then(r => r.json());
  return [response.data, !response.error];
};

export const getBlob = async (url) => {
  const res = await fetch(`${API_BASE_URL}/${url}`);
  if (!res.ok) return [null, false];
  return [await res.blob(), true];
};

