# VS Recorder Frontend Rewrite

Complete frontend rewrite using TailAdmin as the base dashboard template.

## Why

The current frontend was built manually with React + Tailwind and lacks proper mobile responsiveness. TailAdmin provides a production-ready, mobile-first dashboard foundation that fits our data analysis use case.

## TailAdmin

- **Site**: https://tailadmin.com
- **GitHub (free)**: https://github.com/TailAdmin/tailadmin-free-tailwind-dashboard-template
- **Stack**: React / Next.js, TypeScript, Tailwind CSS
- **Includes**: 500+ UI components, dark/light mode, ApexCharts, 7 dashboard variants (Analytics, CRM, etc.)
- **License**: Free tier available, Pro for additional pages/components

### Relevant Dashboard Variants
- **Analytics** — stats cards, charts, data tables (closest to our replay/matchup analysis)
- **CRM** — tabular data, filtering, detail views (similar to team/game plan management)

## General Requirements

### Must Have
- Mobile-friendly responsive layout (primary motivation for the rewrite)
- Dark mode support (already used in current app)
- All existing pages: Home, Team, Replays, Analytics, Game Plans, Calculator, Export/Import
- JWT auth flow (login, register, token refresh)
- Damage calculator iframe embed (keep existing bridge architecture)

### Nice to Have
- Improved data tables with sorting/filtering for replays and matchups
- Better chart components for win rate and usage stats (ApexCharts from TailAdmin)
- Sidebar navigation with collapsible mobile drawer
- Loading skeletons / better loading states

### Carry Over From Current App
- Axios API layer (`services/api/`)
- AuthContext pattern
- Backend API contract (no backend changes needed)
- Calculator embed files (`public/calc/`, bridge, theme CSS)
- Pokemon sprite assets (`public/sprites/`)

## Approach

1. Set up TailAdmin React template as the base
2. Adapt layout/navigation to VS Recorder pages
3. Migrate page-by-page from old frontend, reusing API services and hooks
4. Integrate calculator embed into new layout
5. Test mobile responsiveness throughout
