const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  throw new Error(
    'VITE_API_URL não foi definida. Configure a env var antes de rodar o build — ' +
    'a aplicação não deve apontar silenciosamente para produção.'
  );
}

const OWNER_TOKEN_KEY = 'dublee-owner-token';

const getOwnerToken = () => {
  let token = localStorage.getItem(OWNER_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(OWNER_TOKEN_KEY, token);
  }
  return token;
};

const withOwnerToken = (headers = {}) => ({ ...headers, 'X-Owner-Token': getOwnerToken() });

export const post = async (url, body, headers = {}) => {
  const response = await fetch(`${API_BASE_URL}/${url}`, {
    method: 'POST',
    headers: withOwnerToken(headers),
    body: body
  }).then(res => res.json());

  return [response.data, !response.error];
};

export const postBlob = async (url, body, headers = {}) => {
  const res = await fetch(`${API_BASE_URL}/${url}`, {
    method: 'POST',
    headers: withOwnerToken(headers),
    body: body
  });
  if (!res.ok) return [null, false];
  return [await res.blob(), true];
};

export const get = async (url) => {
  const response = await fetch(`${API_BASE_URL}/${url}`, { headers: withOwnerToken() })
      .then(r => r.json());
  return [response.data, !response.error];
};

export const getBlob = async (url) => {
  const res = await fetch(`${API_BASE_URL}/${url}`, { headers: withOwnerToken() });
  if (!res.ok) return [null, false];
  return [await res.blob(), true];
};

