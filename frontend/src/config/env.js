// Central runtime config.
// Set VITE_API_URL at build/deploy time (Vercel → Settings → Environment
// Variables) to your deployed backend, e.g.  https://your-backend.onrender.com/api
// Locally it falls back to the dev server.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Origin used for static assets served by the backend (/uploads/logo.png, etc.).
// It's just API_URL without the trailing "/api".
export const SERVER_URL = API_URL.replace(/\/api\/?$/, '');
