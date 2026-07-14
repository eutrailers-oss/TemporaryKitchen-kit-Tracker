# Kitchen Kit Tracker

A maintainable React + Vite application backed by the existing Supabase project.

## Included in this milestone

- Supabase email/password authentication
- Shared dashboard with live job and asset counts
- 35-day jobs calendar
- Jobs with customer linking and asset allocation
- Double-booking protection in the asset picker
- Asset register and QR labels
- Customers
- Damage log
- CSV asset import with duplicate-code deduplication
- CSV exports
- Netlify configuration

## Local setup

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. Add the Supabase URL and anon public key.
4. Run:

```bash
npm install
npm run dev
```

## GitHub + Netlify deployment

1. Create a new GitHub repository and upload the contents of this folder.
2. In Netlify choose **Add new project → Import an existing project → GitHub**.
3. Select the repository.
4. Netlify reads `netlify.toml`; the build command is `npm run build` and the publish folder is `dist`.
5. Add these environment variables in Netlify:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy.
7. In Supabase Authentication → URL Configuration, set the site URL and redirect URL to the Netlify address.

## Data

The app uses the existing tables: `assets`, `jobs`, `job_assets`, `customers`, `damage_logs`, and `app_users`. It does not delete or replace existing data.

## Asset CSV import

Use Admin → Asset import. Export an Excel sheet as CSV first. Recommended headers:

`code,old_code,name,category,status,condition,location,serial,replacement_value,notes`
