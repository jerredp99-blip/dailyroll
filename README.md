# dailyroll — Bonus tracker

Keep your daily sweepstakes casino bonuses in one place.

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Create a `.env.local` file with the following variables:

```text
# Required for sending magic-link emails
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=dailyroll <onboarding@resend.dev>

# Optional: Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Required for admin dashboard access
ADMIN_PASSWORD=your-secure-admin-password

# Optional: public app URL (used for magic-link and OAuth redirects)
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Optional: Upstash Redis for cross-device persistence in production
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

### Local development without Resend

If `RESEND_API_KEY` is not set, the magic-link email is not sent. Instead, the
sign-in link is logged to the server console. You can copy it from the terminal
and open it directly in your browser to complete sign-in.

## Auth

- **Email magic links** — passwordless sign-in via `/api/auth/email`. Links
  expire after 15 minutes and are single-use.
- **Google OAuth** — optional, enabled by setting `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET`.
- **Sessions** — stored in an httpOnly cookie (`dailyroll_session`) that lasts
  30 days. Sessions are persisted in the same store as the rest of the data.

## Data Store

- Local development: `data/store.json`
- Production: Upstash Redis (set `UPSTASH_REDIS_REST_URL` and
  `UPSTASH_REDIS_REST_TOKEN`)

## Admin

The admin email is `AdminJerredp99@gmail.com`. Set `ADMIN_PASSWORD` in `.env.local`
so that signing in with that email grants admin access to the dashboard at
`/dashboard`.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs) — learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) — an interactive Next.js tutorial.