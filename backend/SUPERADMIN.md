# 🔐 EduManage Pro — SuperAdmin System

## Overview

EduManage Pro uses a **two-level architecture**:

```
SuperAdmin (You — Software Provider)
    │
    ├── School A (Beaconhouse)  → admin@beaconhouse.edu / Pass123
    ├── School B (City School)  → admin@cityschool.edu / Pass456
    ├── School C (Allied School)→ admin@allied.edu / Pass789
    └── School N (...)
```

Each school is **completely isolated** — their students, teachers, fees, data — nothing crosses over.

---

## 🚀 Two Separate Login URLs

| Who | URL | Credentials |
|-----|-----|-------------|
| **SuperAdmin** | `http://localhost:5175/superadmin/login` | superadmin@edumanage.pro / SuperAdmin@123 |
| **School Admin** | `http://localhost:5175/login` | Set by SuperAdmin when creating school |

---

## 🏫 How to Add a New School (Step by Step)

1. Go to `http://localhost:5175/superadmin/login`
2. Sign in as SuperAdmin
3. Click **Schools → Add New School**
4. Fill in:
   - School name, city, phone, email, address
   - Admin name + **admin email** + **admin password** (you set this)
   - Select a **subscription plan**
5. Click **Create School** → credentials are shown
6. Share the credentials with the school owner

The school admin logs into `http://localhost:5175/login` with the email/password you set.
They then go to **Settings → School Profile** to enter their school info, logo, stamp etc.

---

## 🔑 SuperAdmin Credentials (Change in .env)

```env
SA_EMAIL=superadmin@edumanage.pro
SA_PASSWORD=SuperAdmin@123
```

**Change these immediately** after deployment!

---

## ⚡ SuperAdmin Powers

| Feature | What it does |
|---------|-------------|
| **View All Schools** | See every school, their plan, status, expiry |
| **Add School** | Create school + admin account in one form |
| **Edit School** | Update school name, city, contact info |
| **Change Plan** | Upgrade/downgrade subscription, extend license |
| **Reset Password** | Reset a school admin's password |
| **Activate/Deactivate** | Block school access without deleting data |
| **Impersonate** | Login AS the school admin (for support) |
| **Activity Log** | Every superadmin action is logged with timestamp |
| **Announcements** | Broadcast messages to all school admins |
| **Revenue Dashboard** | See MRR, ARR, plan distribution, growth charts |

---

## 📊 Subscription Plans

| Plan | Price/Year | Students | Teachers |
|------|-----------|----------|----------|
| Free Trial | Rs 0 (30 days) | 100 | 10 |
| Basic | Rs 2,999 | 300 | 25 |
| Pro | Rs 5,999 | 1,000 | 80 |
| Enterprise | Rs 14,999 | 5,000 | 500 |

---

## 🔄 Impersonation Feature

When a school reports an issue, you can click **"Login as Admin"** to enter their dashboard and troubleshoot — **without knowing their password**.

This creates a temporary 4-hour token for their account.

---

## 🚢 Deployment for Multiple Schools

Deploy once on a VPS/server:
- Backend: `school-backend/` → runs on port 5000
- Frontend: `school-ms/` → build with `npm run build` → serve on port 80/443

All schools use the **same deployment**. Each school's data is isolated by the `school` field in MongoDB.

```
Your Server (e.g. DigitalOcean Rs 2,000/mo)
├── MongoDB: school_management database
├── Node.js API: api.yourdomain.com
└── React App: app.yourdomain.com
       ├── /login           → School login
       └── /superadmin/login → SuperAdmin login
```

---

## 🔒 Security Notes

- SuperAdmin token expires in **12 hours**
- School admin tokens expire in **7 days**
- Impersonation tokens expire in **4 hours**
- All actions logged in Activity Log
- Schools cannot see each other's data (filtered by school ID in all queries)
