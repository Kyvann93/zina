# 🔐 Create First Super Admin

## Overview
The fallback admin credentials have been removed. You must now create your first admin user through the registration form and approve it in the database.

---

## Method 1: Register + SQL Approval (Recommended)

### Step 1: Register via the Form
1. Go to: `http://localhost:5000/admin`
2. Click **"Demander un accès administrateur"**
3. Fill in the form:
   - **Identifiant:** `your_username` (e.g., `admin`)
   - **Email:** `your@email.com`
   - **Mot de passe:** `your_secure_password` (min 8 characters)
   - **Confirmer le mot de passe:** (same as above)
4. Click **"Envoyer la demande"**
5. ✅ You should see: "Demande envoyée. Un Super Admin doit approuver votre compte."

### Step 2: Approve in Supabase
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `bsjwmymacjisilmakubs`
3. Go to **SQL Editor**
4. Run this query (replace `your_username` with your actual username):

```sql
-- Find your user
SELECT id, username, email, is_approved, created_at 
FROM admin 
WHERE username = 'your_username';

-- Approve your user and assign Super Admin role
UPDATE admin 
SET is_approved = true, 
    role_id = (SELECT id FROM admin_roles WHERE role_name = 'Super Admin' LIMIT 1)
WHERE username = 'your_username';

-- Verify the update
SELECT 
    a.username,
    a.email,
    a.is_approved,
    r.role_name,
    r.is_super_admin
FROM admin a
LEFT JOIN admin_roles r ON a.role_id = r.id
WHERE a.username = 'your_username';
```

### Step 3: Login
1. Go back to: `http://localhost:5000/admin`
2. Login with your credentials
3. ✅ You should see the green success toast and be redirected to the dashboard!

---

## Method 2: Run Complete Setup Script

If you want to create a default admin immediately:

### Step 1: Go to Supabase SQL Editor
1. https://supabase.com/dashboard/project/bsjwmymacjisilmakubs
2. SQL Editor

### Step 2: Run This SQL
```sql
-- Create Super Admin role if not exists
INSERT INTO admin_roles (role_name, permissions, is_super_admin) 
VALUES (
    'Super Admin', 
    '{"dashboard": true, "orders": true, "orders_manage": true, "menu": true, "menu_manage": true, "categories": true, "categories_manage": true, "users": true, "admins": true, "admins_manage": true, "roles": true, "roles_manage": true, "settings": true, "settings_manage": true}',
    true
)
ON CONFLICT (role_name) DO NOTHING;

-- Create admin user with password: admin123
-- ⚠️ CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!
INSERT INTO admin (username, email, password, is_approved, role_id) 
SELECT 
    'admin',
    'admin@zina-cantine.ci',
    'scrypt:32768:8:1$lCQwsk0DomZZqsQc$4b09707d112cc70f3265b48769c95bb94858d6352e8f2d5431c6d48fd0d172f59b88412efbf50a676af743d920334f70ca73b2e3f6edee115e04fa15eb6c33c0',
    true,
    (SELECT id FROM admin_roles WHERE role_name = 'Super Admin' LIMIT 1)
ON CONFLICT (username) DO NOTHING;

-- Verify
SELECT username, email, is_approved FROM admin WHERE username = 'admin';
```

### Step 3: Login
- **Username:** `admin`
- **Password:** `admin123`
- ⚠️ **Change password immediately after login!**

---

## Generate Custom Password Hash

To create a password hash for a custom password:

### Option 1: Python One-Liner
```bash
python -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('your_password'))"
```

### Option 2: Python Interactive
```python
from werkzeug.security import generate_password_hash
password = 'your_secure_password'
hash = generate_password_hash(password)
print(hash)
```

Then use the hash in SQL:
```sql
UPDATE admin 
SET password = 'paste_your_hash_here'
WHERE username = 'your_username';
```

---

## Troubleshooting

### "Base de données non configurée"
- ✅ Check `.env` has valid `SUPABASE_URL` and `SUPABASE_KEY`
- ✅ Restart Flask server

### "Identifiant ou mot de passe incorrect"
- ✅ Verify username is correct (case-sensitive)
- ✅ Check password hash in database
- ✅ Ensure `is_approved = true`

### "Votre compte est en attente d'approbation"
- ✅ Run the UPDATE SQL to set `is_approved = true`

### Can't access Supabase Dashboard?
- ✅ Check your Supabase credentials in `.env` are correct
- ✅ Verify you're logged into the correct Supabase account

---

## Security Best Practices

1. ✅ **Change default password** immediately after first login
2. ✅ **Use strong passwords** (min 12 characters, mix of upper/lower/numbers/symbols)
3. ✅ **Never commit** passwords or hashes to version control
4. ✅ **Limit Super Admin accounts** to 1-2 trusted users
5. ✅ **Regular password rotation** every 90 days

---

## Quick Reference

| Action | Command/SQL |
|--------|-------------|
| Register | `/admin` → "Demander un accès" |
| Find user | `SELECT * FROM admin WHERE username = 'name';` |
| Approve user | `UPDATE admin SET is_approved = true WHERE username = 'name';` |
| Assign role | `UPDATE admin SET role_id = 1 WHERE username = 'name';` |
| Generate hash | `python -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('pass'))"` |

---

**🎯 Next:** After creating your Super Admin, you can approve other admins from the dashboard!
