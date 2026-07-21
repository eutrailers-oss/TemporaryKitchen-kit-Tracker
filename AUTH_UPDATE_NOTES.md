# Authentication update

Added a complete Supabase password recovery flow:

- Forgot password link on the login screen
- Reset email sent with `/update-password` redirect
- Recovery-link detection
- New password and confirmation form
- Password update through `supabase.auth.updateUser()`
- Return to the app after a successful password change

## Supabase setting

In Supabase Authentication URL Configuration, ensure this redirect URL is allowed:

`https://temporarykitchenskitlist.netlify.app/update-password`

The Netlify SPA redirect in `netlify.toml` already supports this route.
