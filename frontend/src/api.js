const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

function getToken() {
  return localStorage.getItem('vinylist_token');
}

export function setToken(token) {
  localStorage.setItem('vinylist_token', token);
}

export function clearToken() {
  localStorage.removeItem('vinylist_token');
}

export function isLoggedIn() {
  return !!getToken();
}

async function request(path, options = {}) {
  const token = getToken();
  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (resp.status === 401) {
    clearToken();
    window.location.href = '/login';
    return null;
  }

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${resp.status}`);
  }

  if (resp.status === 204) return null;
  return resp.json();
}

export const api = {
  loginUrl: () => `${API_BASE}/api/auth/login`,
  me: () => request('/api/users/me'),
  myReviews: () => request('/api/reviews/me'),
  userProfile: (id) => request(`/api/users/${id}`),
  searchAlbums: (q) => request(`/api/albums/search?q=${encodeURIComponent(q)}`),
  getAlbum: (id) => request(`/api/albums/${id}`),
  saveReview: (payload) =>
    request('/api/reviews', { method: 'POST', body: JSON.stringify(payload) }),
  deleteReview: (albumId) =>
    request(`/api/reviews/${albumId}`, { method: 'DELETE' }),
};
