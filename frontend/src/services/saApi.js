const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function saRequest(method, path, body = null, params = {}) {
  const token = localStorage.getItem('sa_token');
  const query = Object.keys(params).length
    ? '?' + new URLSearchParams(params).toString()
    : '';

  const res = await fetch(`${BASE_URL}/superadmin${path}${query}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

const saGet    = (p, params) => saRequest('GET',    p, null, params);
const saPost   = (p, body)   => saRequest('POST',   p, body);
const saPut    = (p, body)   => saRequest('PUT',    p, body);
const saPatch  = (p, body)   => saRequest('PATCH',  p, body);
const saDel    = (p)         => saRequest('DELETE', p);

export const saAPI = {
  // Auth
  login:            (data)           => saPost('/login', data),

  // Stats
  getStats:         ()               => saGet('/stats'),

  // Schools
  getSchools:       (params)         => saGet('/schools', params),
  getSchool:        (id)             => saGet(`/schools/${id}`),
  createSchool:     (data)           => saPost('/schools', data),
  updateSchool:     (id, data)       => saPut(`/schools/${id}`, data),
  toggleSchool:     (id)             => saPatch(`/schools/${id}/toggle`),
  deleteSchool:     (id)             => saDel(`/schools/${id}`),
  resetPassword:    (id, data)       => saPost(`/schools/${id}/reset-password`, data),
  impersonate:      (id)             => saPost(`/schools/${id}/impersonate`),

  // Plans
  getPlans:         ()               => saGet('/plans'),
  assignPlan:       (schoolId, data) => saPost(`/schools/${schoolId}/assign-plan`, data),

  // Activity
  getActivity:      (params)         => saGet('/activity', params),

  // Announcements
  getAnnouncements: ()               => saGet('/announcements'),
  sendAnnouncement: (data)           => saPost('/announcements', data),
};
