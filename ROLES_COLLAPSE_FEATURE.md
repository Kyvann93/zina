# 📦 Roles Section - Collapse/Expand Feature

## ✅ Feature Added

Added a collapse/expand (wrap/unwrap) toggle button to the **Rôles & Permissions** section for better space management.

---

## 🎯 What Changed

### 1. **HTML** (`templates/admin.html`)
- Added toggle button next to "Nouveau Rôle" button
- Button shows chevron icon that rotates when collapsed

### 2. **CSS** (`static/css/admin.css`)
- Added `#toggleRolesBtn` styles
- Added collapsed state styles for `#rolesGrid.collapsed`
- Compact view hides permission details, shows only essential info

### 3. **JavaScript** (`static/js/admin.js`)
- Added `toggleRolesExpand()` function
- Added `restoreRolesCollapsedState()` function
- State saved to localStorage (persists across page reloads)

---

## 🎨 How It Works

### Expanded View (Default)
```
┌─────────────────────────────────────────────────┐
│ Rôles & Permissions    [▲]  [+ Nouveau Rôle]   │
├─────────────────────────────────────────────────┤
│ ┌──────────────┐  ┌──────────────┐             │
│ │ Super Admin  │  │ Manager      │             │
│ │ 13/13 perms  │  │ 5/13 perms   │             │
│ │ [✓ Dashboard]│  │ [✓ Dashboard]│             │
│ │ [✓ Orders]   │  │ [✗ Orders]   │             │
│ │ [✓ Menu]     │  │ [✓ Menu]     │             │
│ │ ...          │  │ ...          │             │
│ │ [✏️ Modifier] │  │ [✏️ Modifier] │             │
│ └──────────────┘  └──────────────┘             │
└─────────────────────────────────────────────────┘
```

### Collapsed View (Compact)
```
┌─────────────────────────────────────────────────┐
│ Rôles & Permissions    [▼]  [+ Nouveau Rôle]   │
├─────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │Super Admin│ │ Manager  │ │ Caisse   │        │
│ │13/13 perms│ │5/13 perms│ │3/13 perms│        │
│ │[✏️][🗑️]  │ │[✏️][🗑️]  │ │[✏️][🗑️]  │        │
│ └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────┘
```

---

## 💡 User Experience

### Toggle Button
- **Location:** Top right of Roles section, next to "Nouveau Rôle"
- **Icon:** Chevron up (▲) when expanded, Chevron down (▼) when collapsed
- **Hover:** Turns primary color (burgundy) on hover
- **Click:** Instantly collapses/expands the grid

### Collapsed State Benefits
- ✅ **Saves vertical space** - Shows 3 columns instead of 2
- ✅ **Faster scanning** - See all roles at a glance
- ✅ **Cleaner view** - Hides detailed permissions
- ✅ **Persistent** - Remembers your preference (localStorage)

### Expanded State Benefits
- ✅ **Full details** - See all permissions for each role
- ✅ **Better overview** - Understand role capabilities
- ✅ **Easier editing** - Quick access to modify buttons

---

## 🔧 Technical Details

### CSS Classes
- `#toggleRolesBtn` - Toggle button styling
- `#toggleRolesBtn.collapsed` - Rotated icon state
- `#rolesGrid.collapsed` - Compact grid layout
- `.perm-summary-grid` (hidden when collapsed) - Permission chips

### JavaScript Functions
```javascript
// Toggle collapse/expand
toggleRolesExpand()

// Restore saved state (called when showing roles section)
restoreRolesCollapsedState()
```

### LocalStorage Key
- `rolesGridCollapsed` - Stores `'true'` or `'false'`

---

## 🎯 Usage

### For Users
1. Go to **Rôles & Permissions** section
2. Click the **chevron button** (▲) in the top right
3. Grid collapses to compact view
4. Click again (▼) to expand

### For Developers
```javascript
// Programmatically toggle
window.toggleRolesExpand()

// Check current state
const isCollapsed = document.getElementById('rolesGrid')
    .classList.contains('collapsed');
```

---

## 📱 Responsive Behavior

| Screen Size | Expanded Columns | Collapsed Columns |
|-------------|------------------|-------------------|
| Desktop (>1024px) | 2 columns | 3 columns |
| Tablet (768-1024px) | 2 columns | 2 columns |
| Mobile (<768px) | 1 column | 1 column |

---

## 🎨 Styling Changes

### Expanded → Collapsed
- **Grid:** `grid-template-columns: repeat(2, 1fr)` → `repeat(3, 1fr)`
- **Gap:** `2rem` → `1rem`
- **Card padding:** `2rem` → `1.25rem`
- **Permission chips:** Visible → Hidden
- **Title size:** Default → `1rem`
- **Text size:** Default → `11px`
- **Action buttons:** Default → Smaller (`4px 10px` padding)

---

## ✅ Testing Checklist

- [x] Toggle button appears in Roles section
- [x] Click collapses grid to compact view
- [x] Click again expands back to full view
- [x] Icon rotates correctly (▲ ↔ ▼)
- [x] State persists after page reload
- [x] Works on all screen sizes
- [x] Doesn't affect other sections
- [x] Smooth transitions

---

## 🚀 Future Enhancements

Possible improvements:
- [ ] Add keyboard shortcut (e.g., press 'R' to toggle)
- [ ] Add animation when collapsing/expanding
- [ ] Show role count in collapsed header
- [ ] Allow custom column count preference
- [ ] Add tooltip showing permissions on hover (collapsed mode)

---

**📍 Location:** Admin Dashboard → Rôles & Permissions section  
**🎯 Goal:** Better space management and cleaner UI  
**💾 Storage:** localStorage (client-side, no server impact)
