# RLS Migration Deployment Guide

This guide walks you through deploying the Row Level Security (RLS) migration for the Balkon Dergisi application.

## Prerequisites

- Access to your Supabase project dashboard
- At least one existing user account that should become an admin
- Backup of your database (recommended)

## Deployment Steps

### Step 1: Backup Your Database (Recommended)

Before applying any migration, create a backup:

1. Go to **Database** > **Backups** in Supabase dashboard
2. Click **Create Backup**
3. Wait for backup to complete

### Step 2: Apply the Migration

#### Using Supabase Dashboard

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Open the file `supabase/migrations/20241120000000_enable_rls_and_create_policies.sql`
5. Copy all contents
6. Paste into the SQL editor
7. Click **Run** to execute

You should see a success message. The migration will:
- Create the `user_profiles` table
- Enable RLS on `magazines` table
- Create security policies
- Set up automatic profile creation for new users

### Step 3: Create Admin User Profiles

After the migration, you need to grant admin access to at least one user.

#### Find Your User ID

First, find your user ID from the auth.users table:

```sql
SELECT id, email FROM auth.users;
```

Copy the `id` (UUID) of the user you want to make an admin.

#### Grant Admin Role

Run this SQL to grant admin role:

```sql
-- Replace with your admin email
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE email = 'your-admin@example.com';
```

If the user doesn't have a profile yet (for existing users before the migration):

```sql
-- Create profile and grant admin role
INSERT INTO public.user_profiles (user_id, email, role)
VALUES (
  'your-user-uuid-here',  -- Replace with UUID from step above
  'your-admin@example.com',  -- Replace with admin email
  'admin'
)
ON CONFLICT (user_id) 
DO UPDATE SET role = 'admin';
```

#### Grant Admin to Multiple Users

If you have multiple admins:

```sql
-- Create profiles for all existing users first
INSERT INTO public.user_profiles (user_id, email, role)
SELECT id, email, 'user' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Then grant admin role to specific users
UPDATE public.user_profiles 
SET role = 'admin' 
WHERE email IN (
  'admin1@example.com',
  'admin2@example.com',
  'admin3@example.com'
);
```

### Step 4: Verify the Migration

Run these verification queries to ensure everything is working:

#### Check User Profiles

```sql
-- View all user profiles
SELECT * FROM public.user_profiles ORDER BY created_at DESC;

-- Count admins
SELECT COUNT(*) as admin_count FROM public.user_profiles WHERE role = 'admin';
```

#### Test RLS Policies

```sql
-- This should work (returns published magazines)
SELECT * FROM public.magazines WHERE is_published = true;

-- This should show all policies are active
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'magazines';
```

### Step 5: Deploy Application Code

The authorization service has been updated to use the `user_profiles` table. Deploy your application:

```bash
# Build the application
npm run build

# Deploy to your hosting platform
# (Vercel, Netlify, etc.)
```

### Step 6: Test the Application

#### Test as Anonymous User

1. Open your application in an incognito/private window
2. Navigate to the home page
3. Verify you can see published magazines
4. Verify you cannot access `/admin` without logging in

#### Test as Non-Admin User

1. Create a new user account (or use an existing non-admin account)
2. Try to access `/admin`
3. You should see an "Unauthorized" error

#### Test as Admin User

1. Log in with the admin account you configured
2. Navigate to `/admin`
3. Verify you can:
   - Upload new magazines
   - Edit existing magazines
   - Delete magazines
   - See both published and unpublished magazines

## Troubleshooting

### Problem: "User profile not found" error when logging in as admin

**Solution**: The user doesn't have a profile in `user_profiles` table.

```sql
-- Create profile for the user
INSERT INTO public.user_profiles (user_id, email, role)
SELECT id, email, 'admin' FROM auth.users WHERE email = 'your-admin@example.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

### Problem: Admin can't create/update/delete magazines

**Solution**: Verify the user has admin role:

```sql
-- Check user's role
SELECT * FROM public.user_profiles WHERE email = 'your-admin@example.com';

-- If role is 'user', update it to 'admin'
UPDATE public.user_profiles SET role = 'admin' WHERE email = 'your-admin@example.com';
```

### Problem: Anonymous users can't see any magazines

**Solution**: Check if magazines are marked as published:

```sql
-- Check published status
SELECT id, title, issue_number, is_published FROM public.magazines;

-- Publish magazines if needed
UPDATE public.magazines SET is_published = true WHERE issue_number IN (1, 2, 3);
```

### Problem: RLS policies not working

**Solution**: Verify RLS is enabled and policies exist:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'magazines';

-- Should show rowsecurity = true

-- Check policies exist
SELECT policyname FROM pg_policies WHERE tablename = 'magazines';

-- Should show:
-- - Public can select published magazines
-- - Admins can insert magazines
-- - Admins can update magazines
-- - Admins can delete magazines
```

## Rollback Procedure

If you need to rollback the migration:

### Option 1: Restore from Backup

1. Go to **Database** > **Backups**
2. Find the backup created before migration
3. Click **Restore**

### Option 2: Manual Rollback

```sql
-- Drop new policies
DROP POLICY IF EXISTS "Public can select published magazines" ON public.magazines;
DROP POLICY IF EXISTS "Admins can insert magazines" ON public.magazines;
DROP POLICY IF EXISTS "Admins can update magazines" ON public.magazines;
DROP POLICY IF EXISTS "Admins can delete magazines" ON public.magazines;

-- Restore old policies
CREATE POLICY "Anon can select published magazines"
  ON public.magazines FOR SELECT TO anon
  USING (is_published = true);

CREATE POLICY "Authenticated can full access magazines"
  ON public.magazines FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Revert authorization service code
-- Change src/lib/services/authorization.ts back to:
-- return { userId, userEmail, userRole: 'admin' }
```

## Security Considerations

### After Deployment

1. **Review Admin Users**: Regularly audit who has admin access
   ```sql
   SELECT email, role, created_at FROM public.user_profiles WHERE role = 'admin';
   ```

2. **Monitor Failed Authorization Attempts**: Check application logs for unauthorized access attempts

3. **Test RLS Policies**: Periodically verify policies are working as expected

4. **Backup Regularly**: Set up automatic backups in Supabase dashboard

### Best Practices

- **Principle of Least Privilege**: Only grant admin role to users who need it
- **Regular Audits**: Review admin users quarterly
- **Secure Admin Emails**: Use strong passwords and 2FA for admin accounts
- **Monitor Changes**: Track who makes changes to magazine records

## Next Steps

After successful deployment:

1. ✅ Document admin user emails in a secure location
2. ✅ Set up monitoring/alerting for authorization errors
3. ✅ Train admin users on the new security model
4. ✅ Update any documentation that references the old "all authenticated = admin" model
5. ✅ Consider implementing audit logging for admin actions

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review Supabase logs in the dashboard
3. Check application logs for error messages
4. Refer to `supabase/migrations/README.md` for additional details

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- Security Hardening Requirements: `.kiro/specs/security-hardening/requirements.md`
- Security Hardening Design: `.kiro/specs/security-hardening/design.md`
