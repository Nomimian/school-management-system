// src/services/api.js
// Central API service — all backend calls go through here

import { API_URL as BASE_URL } from '../config/env.js';

// ─── HTTP helper ──────────────────────────────────────────────────────────────
async function request(method, path, body = null, params = {}) {
  const token = localStorage.getItem('token');
  const query = Object.keys(params).length
    ? '?' + new URLSearchParams(params).toString()
    : '';

  const res = await fetch(`${BASE_URL}${path}${query}`, {
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

const get    = (path, params)  => request('GET',    path, null, params);
const post   = (path, body)    => request('POST',   path, body);
const put    = (path, body)    => request('PUT',    path, body);
const patch  = (path, body)    => request('PATCH',  path, body);
const del    = (path)          => request('DELETE', path);

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  login:          (data)        => post('/auth/login', data),
  me:             ()            => get('/auth/me'),
  changePassword: (data)        => put('/auth/change-password', data),
  forgotPassword: (data)        => post('/auth/forgot-password', data),
  resetPassword:  (token, data) => post(`/auth/reset-password/${token}`, data),
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
export const dashboardAPI = {
  getStats: () => get('/dashboard/stats'),
};

// ─── STAFF USER ACCOUNTS (operators only) ──────────────────────────────────────
export const userAPI = {
  getAll:        ()          => get('/users'),
  create:        (data)      => post('/users', data),
  update:        (id, data)  => put(`/users/${id}`, data),
  resetPassword: (id, data)  => put(`/users/${id}/password`, data),
  delete:        (id)        => del(`/users/${id}`),
};

// ─── PARENT ACCOUNTS (operator management: admin/principal/frontdesk) ───────────
export const parentAdminAPI = {
  getAll:        ()          => get('/parents'),
  create:        (data)      => post('/parents', data),
  update:        (id, data)  => put(`/parents/${id}`, data),
  resetPassword: (id, data)  => put(`/parents/${id}/password`, data),
  delete:        (id)        => del(`/parents/${id}`),
};

// ─── PARENT PORTAL (role: parent — data scoped to own children) ─────────────────
export const portalAPI = {
  overview: ()   => get('/portal/overview'),
  child:    (id) => get(`/portal/child/${id}`),
};

// ─── CHAT / MESSAGING (all authenticated users) ─────────────────────────────────
export const chatAPI = {
  recipients:      ()          => get('/chat/recipients'),
  unreadCount:     ()          => get('/chat/unread-count'),
  conversations:   ()          => get('/chat/conversations'),
  createConvo:     (data)      => post('/chat/conversations', data),
  getConvo:        (id)        => get(`/chat/conversations/${id}`),
  sendMessage:     (id, body, attachments = []) => post(`/chat/conversations/${id}/messages`, { body, attachments }),
};

// ─── OUTBOUND EMAIL / WHATSAPP (staff only) ─────────────────────────────────────
export const outboundAPI = {
  status: ()     => get('/outbound/status'),
  send:   (data) => post('/outbound/send', data),
};

// ─── ATTACHMENTS (images + documents, for chat & outbound) ──────────────────────
export const attachmentAPI = {
  upload: (formData) => {
    const token = localStorage.getItem('token');
    return fetch(`${BASE_URL}/attachments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.message || 'Upload failed'); return d; });
  },
};

// ─── NOTIFICATIONS (all authenticated users) ────────────────────────────────────
export const notificationAPI = {
  list:        ()   => get('/notifications'),
  unreadCount: ()   => get('/notifications/unread-count'),
  markRead:    (id) => patch(`/notifications/${id}/read`),
  markAllRead: ()   => patch('/notifications/read-all'),
};

// ─── STUDENTS ─────────────────────────────────────────────────────────────────
export const studentAPI = {
  getAll:    (params) => get('/students', params),
  getOne:    (id)     => get(`/students/${id}`),
  create:    (data)   => post('/students', data),
  update:    (id, data) => put(`/students/${id}`, data),
  delete:    (id)     => del(`/students/${id}`),
  getStats:  ()       => get('/students/stats'),
};

// ─── TEACHERS ─────────────────────────────────────────────────────────────────
export const teacherAPI = {
  getAll:  (params)   => get('/teachers', params),
  getOne:  (id)       => get(`/teachers/${id}`),
  create:  (data)     => post('/teachers', data),
  update:  (id, data) => put(`/teachers/${id}`, data),
  delete:  (id)       => del(`/teachers/${id}`),
};

// ─── FEES ─────────────────────────────────────────────────────────────────────
export const feeAPI = {
  getAll:   (params)  => get('/fees', params),
  getOne:   (id)      => get(`/fees/${id}`),
  create:   (data)    => post('/fees', data),
  update:   (id, data)=> put(`/fees/${id}`, data),
  markPaid: (id, data)=> patch(`/fees/${id}/pay`, data),
  delete:   (id)      => del(`/fees/${id}`),
  getStats: (params)  => get('/fees/stats', params),
  // Challan generation (single / bulk)
  previewGenerate: (params) => get('/fees/generate/preview', params),
  generate:        (data)   => post('/fees/generate', data),
};

// ─── FEE HEADS (fee-type master: Tuition, Exam, AC …) ───────────────────────────
export const feeHeadAPI = {
  getAll: ()         => get('/fee-heads'),
  create: (data)     => post('/fee-heads', data),
  update: (id, data) => put(`/fee-heads/${id}`, data),
  delete: (id)       => del(`/fee-heads/${id}`),
};

// ─── ENROLLMENT GROUPS (dynamic Group/House/Shift categories) ───────────────────
export const enrollmentGroupAPI = {
  getAll: ()         => get('/enrollment-groups'),
  create: (data)     => post('/enrollment-groups', data),
  update: (id, data) => put(`/enrollment-groups/${id}`, data),
  delete: (id)       => del(`/enrollment-groups/${id}`),
};

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────
export const attendanceAPI = {
  getAll:       (params) => get('/attendance', params),
  markBulk:     (data)   => post('/attendance/bulk', data),
  getSummary:   (params) => get('/attendance/summary', params),
  getTrend:     ()       => get('/attendance/trend'),
};

// ─── EXAMS ────────────────────────────────────────────────────────────────────
export const examAPI = {
  getAll:      ()          => get('/exams'),
  create:      (data)      => post('/exams', data),
  update:      (id, data)  => put(`/exams/${id}`, data),
  delete:      (id)        => del(`/exams/${id}`),
  getResults:  (examId)    => get(`/exams/${examId}/results`),
  addResult:   (examId, d) => post(`/exams/${examId}/results`, d),
};

// ─── NOTICES ─────────────────────────────────────────────────────────────────
export const noticeAPI = {
  getAll:  ()        => get('/notices'),
  create:  (data)    => post('/notices', data),
  update:  (id, data)=> put(`/notices/${id}`, data),
  delete:  (id)      => del(`/notices/${id}`),
};

// ─── CLASSES ─────────────────────────────────────────────────────────────────
export const classAPI = {
  getAll:  ()        => get('/classes'),
  create:  (data)    => post('/classes', data),
  update:  (id, data)=> put(`/classes/${id}`, data),
  delete:  (id)      => del(`/classes/${id}`),
};

// ─── STAFF / HR ───────────────────────────────────────────────────────────────
export const staffAPI = {
  getAll:  ()          => get('/staff'),
  create:  (data)      => post('/staff', data),
  update:  (id, data)  => put(`/staff/${id}`, data),
  delete:  (id)        => del(`/staff/${id}`),
};

// ─── LIBRARY ─────────────────────────────────────────────────────────────────
export const bookAPI = {
  getAll:  (params)  => get('/books', params),
  create:  (data)    => post('/books', data),
  update:  (id, data)=> put(`/books/${id}`, data),
  issue:   (id)      => patch(`/books/${id}/issue`),
  return:  (id)      => patch(`/books/${id}/return`),
  delete:  (id)      => del(`/books/${id}`),
};

// ─── EVENTS ───────────────────────────────────────────────────────────────────
export const eventAPI = {
  getAll:  ()        => get('/events'),
  create:  (data)    => post('/events', data),
  update:  (id, data)=> put(`/events/${id}`, data),
  delete:  (id)      => del(`/events/${id}`),
};

// ─── ADMISSIONS ───────────────────────────────────────────────────────────────
export const admissionAPI = {
  getAll:  (params) => get('/admissions', params),
  create:  (data)   => post('/admissions', data),
  update:  (id, d)  => put(`/admissions/${id}`, d),
  delete:  (id)     => del(`/admissions/${id}`),
};

// ─── TRANSPORT ────────────────────────────────────────────────────────────────
export const transportAPI = {
  getRoutes:     ()      => get('/transport/routes'),
  createRoute:   (data)  => post('/transport/routes', data),
  updateRoute:   (id,d)  => put(`/transport/routes/${id}`, d),
  deleteRoute:   (id)    => del(`/transport/routes/${id}`),
  getAssignments:(params)=> get('/transport/students', params),
  assign:        (data)  => post('/transport/assign', data),
};

// ─── HOMEWORK ─────────────────────────────────────────────────────────────────
export const homeworkAPI = {
  getAll:  (params) => get('/homework', params),
  create:  (data)   => post('/homework', data),
  update:  (id,d)   => put(`/homework/${id}`, d),
  delete:  (id)     => del(`/homework/${id}`),
};

// ─── MESSAGES ─────────────────────────────────────────────────────────────────
export const messageAPI = {
  getAll:  () => get('/messages'),
  send:    (data) => post('/messages', data),
  delete:  (id) => del(`/messages/${id}`),
};

// ─── ACCOUNTS ─────────────────────────────────────────────────────────────────
export const accountAPI = {
  getAll:   (params)  => get('/accounts', params),
  create:   (data)    => post('/accounts', data),
  update:   (id, data)=> put(`/accounts/${id}`, data),
  delete:   (id)      => del(`/accounts/${id}`),
  getStats: ()        => get('/accounts/stats'),
};

// ─── SUBJECTS ─────────────────────────────────────────────────────────────────
export const subjectAPI = {
  getAll:  (params) => get('/subjects', params),
  create:  (data)   => post('/subjects', data),
  delete:  (id)     => del(`/subjects/${id}`),
};

// ─── FEE STRUCTURES ───────────────────────────────────────────────────────────
export const feeStructureAPI = {
  getAll: (params) => get('/fee-structures', params),
  save:   (data)   => post('/fee-structures', data),
};

// ─── TEACHER HIRING ───────────────────────────────────────────────────────────
export const hiringAPI = {
  getAll: (params)  => get('/hiring', params),
  create: (data)    => post('/hiring', data),
  update: (id, data)=> put(`/hiring/${id}`, data),
  delete: (id)      => del(`/hiring/${id}`),
};

// ─── TIMETABLE ────────────────────────────────────────────────────────────────
export const timetableAPI = {
  getAll: (params) => get('/timetable-db', params),
  save:   (data)   => post('/timetable-db', data),
};

// ─── PROMOTIONS ───────────────────────────────────────────────────────────────
export const promotionAPI = {
  getAll:   (params) => get('/promotions', params),
  promote:  (data)   => post('/promotions/promote', data),
};

// ─── CERTIFICATES ─────────────────────────────────────────────────────────────
export const certificateAPI = {
  getAll:  (params) => get('/certificates', params),
  create:  (data)   => post('/certificates', data),
  delete:  (id)     => del(`/certificates/${id}`),
};

// ─── REPORT CARD ──────────────────────────────────────────────────────────────
export const reportCardAPI = {
  generate: (params) => get('/report-card', params),
};

// ─── REPORTS ──────────────────────────────────────────────────────────────────
export const reportsAPI = {
  subjectPerformance: () => get('/reports/subject-performance'),
};

// ─── HEALTH ───────────────────────────────────────────────────────────────────
export const healthAPI = {
  get:  (studentId)       => get(`/health/${studentId}`),
  save: (studentId, data) => put(`/health/${studentId}`, data),
};

// ─── SCHOOL / TENANT ──────────────────────────────────────────────────────────
export const schoolAPI = {
  get:           ()         => get('/school'),
  // Public branding for the login screen (no auth). Optionally scoped by slug.
  public:        (slug)     => get('/school/public', slug ? { slug } : {}),
  create:        (data)     => post('/school', data),
  update:        (data)     => put('/school', data),
  uploadLogo:    (formData) => {
    const token = localStorage.getItem('token');
    return fetch(`${BASE_URL}/school/upload-logo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(r => r.json());
  },
  uploadStamp: (formData) => {
    const token = localStorage.getItem('token');
    return fetch(`${BASE_URL}/school/upload-stamp`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(r => r.json());
  },
  uploadStudentPhoto: (formData) => {
    const token = localStorage.getItem('token');
    return fetch(`${BASE_URL}/school/upload-student-photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }).then(r => r.json());
  },
  // NOTE: listing/provisioning schools is a SuperAdmin-only capability and
  // lives in services/saApi.js — intentionally not exposed to the school app.
};
