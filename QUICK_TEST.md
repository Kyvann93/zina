# 🎉 Quick Test Guide

## ✅ Admin Login & Toast Test

### Step 1: Start the Application
```bash
python app.py
```
Server should start on: `http://127.0.0.1:5000`

### Step 2: Test Admin Login
1. Go to: `http://127.0.0.1:5000/admin`
2. Login with:
   - **Username:** `admin`
   - **Password:** `admin123`
3. **Expected Result:**
   - ✅ Green toast appears: "Connexion réussie !"
   - ✅ Redirects to admin dashboard
   - ✅ Can see dashboard with KPIs

### Step 3: Test Login Error
1. Logout from admin
2. Try wrong credentials:
   - **Username:** `admin`
   - **Password:** `wrongpassword`
3. **Expected Result:**
   - ❌ Red toast appears: "Identifiant ou mot de passe incorrect"
   - ✅ Form clears
   - ✅ Can try again

### Step 4: Test Toast in Dashboard
Once logged in:
1. Go to **Plats & Menus**
2. Click **"Ajouter un plat"**
3. Fill in the form
4. Click **Enregistrer**
5. **Expected Result:**
   - ✅ Green toast: "Plat créé"

---

## 🔍 Troubleshooting

### Toast Not Showing?
1. **Clear browser cache:** `Ctrl + Shift + R`
2. **Check console:** `F12` → Console tab
3. **Verify CSS loaded:** Check Network tab for `admin.css`

### Login Fails?
1. **Check `.env` exists** in project root
2. **Verify credentials:** `admin` / `admin123`
3. **Check server logs** for errors

### Server Won't Start?
```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill the process if needed
taskkill /F /PID <PID>
```

---

## 📋 What's Working Now

| Feature | Status | Notes |
|---------|--------|-------|
| Admin Login | ✅ Works | Toast notifications visible |
| Admin Dashboard | ✅ Works | All sections accessible |
| Toast Notifications | ✅ Works | Success, error, warning, info |
| User Login | ⚠️ Limited | Requires Supabase |
| User Registration | ⚠️ Limited | Requires Supabase |
| Menu Display | ⚠️ Limited | Requires Supabase |
| Ordering | ⚠️ Limited | Requires Supabase |

---

## 🚀 Enable Full Features

To enable user-facing features, configure Supabase:

1. Create account at https://supabase.com
2. Create new project
3. Copy credentials to `.env`:
   ```env
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_KEY=your-anon-key
   ```
4. Run SQL migrations from `database/admin_init.sql`
5. Restart Flask: `python app.py`

---

## 📸 Expected Toast Examples

### Success Toast (Green)
```
┌─────────────────────────────────┐
│ ✓ Connexion réussie !           │
└─────────────────────────────────┘
```

### Error Toast (Red)
```
┌─────────────────────────────────┐
│ ⚠ Identifiant ou mot de passe   │
│   incorrect                     │
└─────────────────────────────────┘
```

### Warning Toast (Yellow)
```
┌─────────────────────────────────┐
│ ⚠ Plat enregistré (image non    │
│   uploadée)                     │
└─────────────────────────────────┘
```

---

**🎯 Goal:** You should see toast notifications for all admin actions!
