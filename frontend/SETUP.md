# EduManage Pro v4 — Complete Setup Guide

## Project Structure
```
EduManagePro-v4-SuperAdmin/
├── school-backend-final/     ← Node.js + Express + MongoDB API
└── school-ms-final/          ← React + Vite + Tailwind Frontend
```

## Step 1 — Install MongoDB
Download: https://www.mongodb.com/try/download/community
```bash
# Windows (run as Admin)
net start MongoDB
```

## Step 2 — Backend Setup
```bash
cd school-backend-final
npm install

# Create .env from example
copy .env.example .env

# Edit .env — change these:
# SA_EMAIL=superadmin@yourdomain.com
# SA_PASSWORD=YourStrongPassword123!
# JWT_SECRET=your_64_char_random_string_here

# Seed database with sample data
npm run seed

# Start backend
npm run dev
# → http://localhost:5000
```

## Step 3 — Frontend Setup
```bash
cd school-ms-final
npm install
npm run dev
# → http://localhost:5175
```

## Two Portals

### 🔐 SuperAdmin Portal
URL: http://localhost:5175/superadmin/login
Email: superadmin@edumanage.pro
Password: SuperAdmin@123

### 🏫 School Portal
URL: http://localhost:5175/login
Email: admin@school.edu (set by superadmin when creating school)
Password: admin123 (set by superadmin, school changes it in Settings)

## Demo School Login
After running `npm run seed`:
- URL: http://localhost:5175/login
- Email: admin@school.edu
- Password: admin123

## Adding a New School (for selling to clients)
1. Login to SuperAdmin Portal
2. Go to Schools → Add New School
3. Fill school details + set admin email/password
4. Copy the credentials → share with school owner
5. School logs in at /login and configures their profile

## Folder rename note
The ZIP contains school-ms-final/ and school-backend-final/
You can rename these to school-ms/ and school-backend/ if preferred.
