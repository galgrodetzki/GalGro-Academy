# GalGro's Academy

Goalkeeper coaching portal for building sessions, tracking players, reviewing training history, exporting PDFs, and approving AI-proposed custom drills.

Live site: https://gal-gro-academy.vercel.app

## Stack

- React 19 + Vite 8
- Tailwind CSS v3 with a custom dark navy theme
- Framer Motion for page, modal, and interaction polish
- @dnd-kit for drag-and-drop session building
- Supabase for auth, data, invites, profiles, RLS-backed access, and custom drills
- jsPDF for session PDF exports
- Vercel production deploys from `main`

## Local Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npm run build
```

## Source Map

```text
src/
  lib/supabase.js
  context/
    AuthContext.jsx
    DataContext.jsx
  hooks/
    useSession.js
    useScrollLock.js
    useLocalStorage.js
  pages/
    Login.jsx
    Dashboard.jsx
    DrillLibrary.jsx
    SessionBuilder.jsx
    MySessions.jsx
    Players.jsx
    Admin.jsx
  components/
    Sidebar.jsx
    BottomNav.jsx
    MobileHeader.jsx
    SettingsModal.jsx
    PageHeader.jsx
    CategoryIcon.jsx
  data/
    drills.js
  utils/
    drillUtils.js
    exportPDF.js
```

## App Model

The app is a single-page React app without React Router. Page navigation is controlled by a `page` state string in `App.jsx`.

```jsx
<AuthProvider>
  <DataProvider>
    <AppInner />
  </DataProvider>
</AuthProvider>
```

`AuthContext` owns the signed-in user, profile, sign-out, and role helpers such as `isCoach` and `canEdit`.

`DataContext` owns CRUD for sessions, players, templates, settings, agent proposals, and custom drills. Supabase uses snake_case columns; React uses camelCase objects, with mappers in `DataContext.jsx`.

## Design System

Shared classes live in `src/index.css`:

- `card`
- `btn`, `btn-primary`, `btn-secondary`, `btn-ghost`
- `input`
- `label`
- `tag`

Tailwind theme tokens live in `tailwind.config.js`, centered on a dark navy interface with green primary actions and blue secondary accents.

## Mobile Layout

- Desktop uses the fixed left `Sidebar`.
- Mobile uses `MobileHeader` and fixed `BottomNav`.
- Modal surfaces use the bottom-sheet pattern on mobile and centered modals on desktop.
- Every modal should use `useScrollLock(open)`.

## Custom Drills

Static drills live in `src/data/drills.js`. Approved agent proposals are inserted into Supabase `custom_drills`, loaded through `DataContext`, and merged with the static drill list where drills are displayed or used:

```js
const allDrills = [...DRILLS, ...customDrills];
```

Saved-session views and PDF export should always resolve drills from the merged list.

## Product Roadmap

- Motion polish: continue tuning micro-interactions after real-device testing.
- PWA support: installable app shell, manifest, icons, and offline static shell cache.
- Logo and branding: replace the temporary `GG` mark in Login, Sidebar, MobileHeader, and PDF export.
- Keeper-facing features: personal keeper dashboard, attended-session history, attendance rate, and keeper notes.
- Performance: split page-level chunks so the main app bundle stays lean.
- Access hardening: keep UI role gates aligned with Supabase RLS policies.
