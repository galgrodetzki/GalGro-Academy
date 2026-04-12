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
- Manual PWA manifest + service worker for installable shell caching
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
    BrandMark.jsx
    CategoryIcon.jsx
  data/
    drills.js
  utils/
    drillUtils.js
    exportPDF.js
    motion.js
public/
  manifest.webmanifest
  sw.js
  brand/
    galgro-mark.svg
    galgro-icon-192.png
    galgro-icon-512.png
    galgro-maskable-512.png
    apple-touch-icon.png
supabase/
  rls_policies.sql
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

## PWA And Branding

The app uses a manual PWA setup because the current `vite-plugin-pwa` release does not yet declare Vite 8 peer support. PWA metadata lives in `public/manifest.webmanifest`, the runtime cache is handled by `public/sw.js`, and registration happens in `src/main.jsx`.

The shared logo component is `src/components/BrandMark.jsx`. Public app icons live in `public/brand` and should stay visually aligned with the in-app mark and PDF export header.

## Supabase Security

The app-side role checks live in `AuthContext` and `DataContext`, but Supabase RLS is the real data boundary. The baseline policy script is `supabase/rls_policies.sql` and should be applied in the Supabase SQL editor for the production project.

The signup flow calls the `is_first_account()` RPC from that SQL file when available, with a legacy profile-count fallback so the current live database keeps working until the policy script is applied.

## Product Roadmap

- Motion polish: continue tuning micro-interactions after real-device testing.
- PWA support: test Add to Home Screen on iPhone and Android after each icon or cache-policy change.
- Logo and branding: refine the mark after real-device review and apply it to future keeper-facing surfaces.
- Keeper-facing features: personal keeper dashboard, attended-session history, attendance rate, and keeper notes.
- Performance: split page-level chunks so the main app bundle stays lean.
- Access hardening: keep UI role gates aligned with Supabase RLS policies.
