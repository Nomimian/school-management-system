// Maps each app route to the permission "module" it belongs to. Kept in sync
// with the backend matrix (backend/config/permissions.js) by way of the
// `permissions` array the API returns at login — the frontend never invents
// access, it only reflects what the server granted. This map just tells the
// nav/guards WHICH module a given path needs.

export const ROUTE_MODULE = {
  '/':             'dashboard',
  '/students':     'students',
  '/parents':      'parents',
  '/teachers':     'teachers',
  '/classes':      'classes',
  '/admissions':   'admissions',
  '/attendance':   'attendance',
  '/timetable':    'timetable',
  '/homework':     'homework',
  '/promotions':   'promotions',
  '/exams':        'exams',
  '/result-card':  'results',
  '/fees':         'fees',
  '/accounts':     'accounts',
  '/library':      'library',
  '/transport':    'transport',
  '/hr':           'hr',
  '/certificates': 'certificates',
  '/notices':      'notices',
  '/messaging':    'messaging',
  '/reports':      'reports',
  '/calendar':     'calendar',
  '/settings':     'settings',
  '/hiring':       'hiring',
};

export const moduleForPath = (path) => ROUTE_MODULE[path] || null;

// Human-friendly role labels used across the staff UI.
export const ROLE_LABEL = {
  admin:      'Administrator',
  principal:  'Principal',
  accountant: 'Accountant',
  teacher:    'Teacher',
  frontdesk:  'Front Desk',
  parent:     'Parent',
  superadmin: 'Super Admin',
};
