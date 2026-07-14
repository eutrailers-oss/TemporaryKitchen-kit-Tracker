# Kitchen Kit Tracker — final launch build

A deliberately simple React + Vite app using the existing Supabase database.

## What is included

- Shared email/password login
- Dashboard with upcoming jobs and a 35-day calendar
- Jobs and customer records
- Equipment allocation with date-clash prevention
- Assets, statuses and QR labels
- Damage records
- CSV asset import and export
- Responsive mobile layout

## Netlify deployment

1. Upload all files in this folder to one GitHub repository.
2. In Netlify, import that repository.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy.

`netlify.toml` already contains the build settings and single-page-app redirect.

## Supabase

The app uses the existing tables created by `supabase-schema.sql`. Do not rerun destructive replacement scripts. The app does not delete existing asset data during CSV import.

## Asset import

In Excel, save your asset sheet as CSV. In the app, open Admin and choose the CSV. Recommended headers:

`code,old_code,name,category,status,condition,location,serial,replacement_value,notes`

Existing asset codes are updated; new codes are inserted. Duplicate codes in the CSV are deduplicated before upload.
