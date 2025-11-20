# Supabase Migrations

This directory contains SQL migration files for the Balkon Dergisi database schema.

## Migration Files

- `20241120000000_enable_rls_and_create_policies.sql` - Enables Row Level Security (RLS) and creates security policies for the magazines table

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Recommended for existing projects)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the contents of the migration file
5. Paste into the SQL editor
6. Click **Run** to execute the migration

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed and initialized:

```bash
# Apply all pending migrations
supabase db push

# Or apply a specific migration
supabase db execute --file supabase/migrations/20241120000000_enable_rls_and_create_policies.sql
```

## Post-Migration Steps

After applying the RLS migration (`20241120000000_enable_rls_and_create_policies.sql`):

### 1. Create Admin User Profile

At least one user needs to be granted admin role. Run this SQL in the Supabase SQL Editor:

```sql
-- Replace with your admin email
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE email = 'your-admin@example.com';
```

If the user doesn't exist in `user_profiles` yet, you can manually insert:

```sql
-- Replace with your admin user's ID and email
INSERT INTO public.user_profiles (user_id, email, role)
VALUES (
  'your-user-uuid-here',  -- Get this from auth.users table
  'your-admin@example.com',
  'admin'
)
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

### 2. Update Authorization Service

Update `src/lib/services/authorization.ts` to uncomment the `user_profiles` query logic in the `requireAdmin()` function. The migration creates the necessary table structure.

### 3. Verify RLS Policies

Test the following scenarios:

#### Anonymous Users
```sql
-- Should only return published magazines
SELECT * FROM public.magazines;
```

#### Authenticated Non-Admin Users
```sql
-- Should only return published magazines
SELECT * FROM public.magazines;

-- Should fail with RLS error
INSERT INTO public.magazines (title, issue_number, publication_date) 
VALUES ('Test', 1, '2024-01-01');
```

#### Authenticated Admin Users
```sql
-- Should return all magazines (published and unpublished)
SELECT * FROM public.magazines;

-- Should succeed
INSERT INTO public.magazines (title, issue_number, publication_date, is_published) 
VALUES ('Test', 999, '2024-01-01', false);

-- Should succeed
UPDATE public.magazines SET title = 'Updated' WHERE issue_number = 999;

-- Should succeed
DELETE FROM public.magazines WHERE issue_number = 999;
```

## Migration Details

### What the RLS Migration Does

1. **Creates `user_profiles` table**
   - Stores user roles (admin/user)
   - Links to `auth.users` via `user_id`
   - Automatically creates profile for new users via trigger

2. **Enables RLS on `magazines` table**
   - Replaces old "authenticated = admin" model
   - Implements proper role-based access control

3. **Creates Security Policies**
   - Public SELECT: Only published magazines visible to everyone
   - Admin INSERT: Only admins can create magazines
   - Admin UPDATE: Only admins can update magazines
   - Admin DELETE: Only admins can delete magazines

4. **Sets up automatic profile creation**
   - Trigger creates user profile when user signs up
   - Default role is 'user' (not admin)

### Security Benefits

- **Principle of Least Privilege**: Users only get access they need
- **Defense in Depth**: Database-level security in addition to application-level
- **Audit Trail**: Role changes tracked in `user_profiles` table
- **Automatic Protection**: RLS enforced even if application code has bugs

## Rollback

If you need to rollback the RLS migration:

```sql
-- Drop policies
DROP POLICY IF EXISTS "Public can select published magazines" ON public.magazines;
DROP POLICY IF EXISTS "Admins can insert magazines" ON public.magazines;
DROP POLICY IF EXISTS "Admins can update magazines" ON public.magazines;
DROP POLICY IF EXISTS "Admins can delete magazines" ON public.magazines;

-- Restore old policies (if needed)
CREATE POLICY "Anon can select published magazines"
  ON public.magazines FOR SELECT TO anon
  USING (is_published = true);

CREATE POLICY "Authenticated can full access magazines"
  ON public.magazines FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Optionally drop user_profiles table
-- WARNING: This will delete all role data
-- DROP TABLE IF EXISTS public.user_profiles CASCADE;
```

## Troubleshooting

### Issue: "new row violates row-level security policy"

**Cause**: User doesn't have admin role in `user_profiles` table

**Solution**: Grant admin role to the user:
```sql
UPDATE public.user_profiles SET role = 'admin' WHERE email = 'user@example.com';
```

### Issue: "relation 'public.user_profiles' does not exist"

**Cause**: Migration hasn't been applied yet

**Solution**: Apply the migration using one of the methods above

### Issue: Existing users can't access admin panel

**Cause**: Existing users don't have entries in `user_profiles` table

**Solution**: The trigger only creates profiles for new users. For existing users:
```sql
-- Create profiles for all existing users
INSERT INTO public.user_profiles (user_id, email, role)
SELECT id, email, 'user' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Then grant admin role to specific users
UPDATE public.user_profiles SET role = 'admin' WHERE email IN (
  'admin1@example.com',
  'admin2@example.com'
);
```

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase CLI Documentation](https://supabase.com/docs/guides/cli)
