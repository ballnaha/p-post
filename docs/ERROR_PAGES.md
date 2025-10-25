# Error Pages Documentation

## 📄 Available Error Pages

### 1. 404 Not Found (`/app/not-found.tsx`)
**Usage:** Automatically shown when route doesn't exist
- Clean search icon
- Friendly error message
- Back & Home buttons
- Minimal design

**Features:**
- ✅ Responsive layout
- ✅ Thai language
- ✅ Navigation options
- ✅ Professional appearance

---

### 2. Error Page (`/app/error.tsx`)
**Usage:** Handles unexpected runtime errors
- Shows error icon
- Try again functionality
- Error details in development
- Home navigation

**Features:**
- ✅ Error boundary
- ✅ Reset capability
- ✅ Development debugging
- ✅ Error digest tracking

**Props:**
```typescript
{
  error: Error & { digest?: string };
  reset: () => void;
}
```

---

### 3. Loading Page (`/app/loading.tsx`)
**Usage:** Global loading state during navigation
- Centered spinner
- Loading text
- Minimal design

**Features:**
- ✅ Smooth transitions
- ✅ Consistent branding
- ✅ Non-blocking UI

---

### 4. Unauthorized Page (`/app/unauthorized/page.tsx`)
**Usage:** Access denied (403 Forbidden)
- Lock icon indicator
- Permission message
- Navigation options

**Features:**
- ✅ Clear messaging
- ✅ User guidance
- ✅ Route: `/unauthorized`

**Redirect Example:**
```typescript
// In middleware or API route
if (!hasPermission) {
  router.push('/unauthorized');
}
```

---

## 🎨 Design Principles

All error pages follow:
- **Minimal** - Clean, no clutter
- **Professional** - Corporate-ready
- **Helpful** - Clear actions
- **Consistent** - Same visual language
- **Responsive** - Mobile-friendly

## 🔧 Customization

### Change Colors
```tsx
// In any error page
<ErrorIcon sx={{ color: 'error.main' }} />  // Change to your brand color
```

### Update Messages
Edit the `Typography` components with your preferred text.

### Add Logging
```tsx
// In error.tsx
useEffect(() => {
  // Send to your logging service
  logError(error);
}, [error]);
```

## 📱 Responsive Breakpoints

- **Mobile**: Clean single column
- **Tablet**: Centered with padding
- **Desktop**: Max-width container

## ✅ Testing

### Test 404
Visit: `http://localhost:3003/nonexistent-page`

### Test Error
Throw error in any component:
```tsx
throw new Error('Test error');
```

### Test Unauthorized
Visit: `http://localhost:3003/unauthorized`

## 🚀 Next.js Integration

These pages work with Next.js 14+ App Router:
- `not-found.tsx` - Auto-rendered for 404
- `error.tsx` - Auto-rendered for errors
- `loading.tsx` - Auto-rendered during loading
- Custom routes for specific errors

---

Built with Material-UI and Next.js App Router
