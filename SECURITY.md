# Security notes

- The browser app uses the Supabase publishable key only. This key is public by design, but it must be protected with Row Level Security policies.
- Never commit a Supabase `service_role` key, database password, or JWT signing secret to this repository.
- Run `supabase/schema.sql` in the Supabase SQL editor before opening the site to public users.
- Create the first administrator through Supabase Auth, then set that row in `profiles.role` to `admin` from the Supabase dashboard.
- If any private key was shared publicly by mistake, rotate it from the Supabase dashboard before deploying.
