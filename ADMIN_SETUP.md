# ZINA Cantine BAD - Admin Setup Guide

## 🔐 Important Security Update

**Fallback admin credentials have been removed.** You must now create your first admin user through the registration form and approve it in the database.

👉 **See:** [`CREATE_FIRST_ADMIN.md`](CREATE_FIRST_ADMIN.md) for complete instructions.

---

## 🚀 Quick Start

### Step 1: Register Your First Admin
1. Go to: `http://localhost:5000/admin`
2. Click **"Demander un accès administrateur"**
3. Fill in the registration form
4. Submit the form

### Step 2: Approve in Database
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Open SQL Editor
3. Run:
```sql
UPDATE admin
SET is_approved = true,
    role_id = (SELECT id FROM admin_roles WHERE role_name = 'Super Admin' LIMIT 1)
WHERE username = 'your_username';
```

### Step 3: Login
- Use the credentials you just created
- ✅ You should see the green success toast!

---

---

## 🎯 What Was Fixed

### 1. Toast Notifications Now Visible
- **File:** `static/css/admin.css`
- **Change:** Increased toast container z-index from `3000` to `99999`
- **Result:** Success/error toasts now appear above the login overlay

### 2. JSON Parsing Error Fixed
- **File:** `zina_app/api/admin/routes.py`
- **Change:** Added try-catch for JSON parsing of permissions
- **Result:** No more "Expecting value: line 1 column 1" errors

### 3. Environment Configuration Created
- **File:** `.env`
- **Contains:** Fallback admin credentials and app configuration

### 4. Database Migration Script
- **File:** `database/admin_init.sql`
- **Purpose:** Initialize admin roles and default user

---

## 🧪 Testing Toast Notifications

Once logged in, you should see toast notifications for:

| Action | Expected Toast |
|--------|----------------|
| Successful login | ✅ Green "Connexion réussie !" |
| Failed login | ❌ Red error message |
| Create menu item | ✅ Green "Plat créé" |
| Delete menu item | ✅ Green "Plat supprimé" |
| Update settings | ✅ Green "Paramètres enregistrés" |
| Network error | ❌ Red "Erreur réseau" |

---

## 📋 Troubleshooting

### Toast still not showing?
1. Clear browser cache (Ctrl+Shift+R)
2. Check browser console for errors
3. Verify `.env` file exists

### Login fails with 401?
1. Check Supabase credentials in `.env`
2. Verify `admin` table exists in Supabase
3. Run the SQL migration script

### "Permissions" error?
1. Make sure `permissions` column in `admin_roles` contains valid JSON
2. Use empty object `{}` for no permissions
3. Example: `{"dashboard": true, "orders": false}`

---

## 🔒 Security Notes

- Change default password immediately
- Use strong passwords in production
- Never commit `.env` to version control
- Set `FLASK_DEBUG=false` in production
