# Parlo — Standalone Deploy

This folder is a self-contained, Vercel-ready build of the Parlo app.
No monorepo, no pnpm workspaces — just plain npm.

## Deploy to Vercel

1. In Vercel dashboard → your project → **Settings → General → Root Directory**, set it to `deploy`
2. Vercel will auto-detect Vite and use:
   - Install: `npm install`
   - Build: `npm run build`
   - Output: `dist`
3. Add environment variables in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## Local dev

```bash
cd deploy
cp .env.example .env.local   # fill in your Supabase values
npm install
npm run dev
```
