const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Fehler ${res.status}`);
  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  me: () => request('GET', '/auth/me'),
  changePassword: (oldPassword, newPassword) => request('PUT', '/auth/change-password', { oldPassword, newPassword }),

  // Mitarbeiter
  getUsers: () => request('GET', '/users'),
  createUser: (data) => request('POST', '/users', data),
  updateUser: (id, data) => request('PUT', `/users/${id}`, data),
  deleteUser: (id) => request('DELETE', `/users/${id}`),

  // Zeiteinträge
  getEntries: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/time-entries${q ? '?' + q : ''}`);
  },
  createEntry: (data) => request('POST', '/time-entries', data),
  updateEntry: (id, data) => request('PUT', `/time-entries/${id}`, data),
  deleteEntry: (id) => request('DELETE', `/time-entries/${id}`),
  getSalaryReport: (month, year) => request('GET', `/time-entries/report/salary?month=${month}&year=${year}`),

  // Kunden
  getClients: () => request('GET', '/clients'),
  getClient: (id) => request('GET', `/clients/${id}`),
  createClient: (data) => request('POST', '/clients', data),
  updateClient: (id, data) => request('PUT', `/clients/${id}`, data),
  deleteClient: (id) => request('DELETE', `/clients/${id}`),
};
