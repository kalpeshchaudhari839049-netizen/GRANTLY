# GRANTLY

GRANTLY is an independent scholarship discovery and student application-management demo built with React, Vite, TypeScript, Tailwind CSS, React Router, Framer Motion, Recharts, React Hook Form, and Zod.

## Run locally

```bash
npm install
npm run dev
```

Create a production build with `npm run build`, and run the linter with `npm run lint`.

## Deploy to Vercel

Import the GitHub repository into Vercel and use the Vite defaults:

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

The included `vercel.json` sends client-side routes back to the Vite entry point so direct links and refreshes work.

## Demo features

- Scholarship discovery with search and filters
- Transparent rule-based eligibility estimates
- Scholarship detail pages with sample requirements and safe application steps
- Saved opportunities, application tracking, and deadline reminders
- Document checklist that stores file metadata only; selected file contents are never uploaded or persisted
- Rule-based Grantly AI assistant
- Demo sign-in and registration, responsive layouts, and a light/dark workspace theme
- Browser-local persistence for demo profile and workspace data

All scholarship listings, providers, award amounts, dates, and criteria are illustrative sample data. They are not verified official opportunities. Confirm details directly with a provider. The demo does not submit applications, guarantee eligibility, or provide scholarship awards. Use sample information only; avoid storing sensitive information on shared devices.
