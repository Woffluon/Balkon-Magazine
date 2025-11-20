# RLS Migration Summary

## Overview

This migration implements Row Level Security (RLS) policies for the Balkon Dergisi application, fulfilling requirements 14.1-14.6 from the security hardening specification.

## What Was Created

### 1. Migration File
**File**: `supabase/migrations/20241120000000_enable_rls_and_create_policies.sql`

This SQL migration file:
- Creates `user_profiles` table for role-based access control
- Enables RLS on the `magazines` table
- Creates security policies for SELECT, INSERT, UPDATE, and DELETE operations
- Sets up automatic profile creation for new users via trigger
- Grants necessary permissions

### 2. Documentation Files

**File**: `supabase/migrations/README.md`
- Explains how to apply migrations
- Documents post-migration steps
- Provides verification queries
- Includes troubleshooting guide

**File**: `supabase/DEPLOYMENT_GUIDE.md`
- Step-by-step deployment instructions
- Admin user setup procedures
- Testing procedures
- Rollback instructions
- Security best practices

### 3. Code Updates

**File**: `src/lib/services/authorization.ts`
- Updated `requireAdmin()` function to query `user_profiles` table
- Removed temporary "all authenticated = admin" logic
- Now properly verifies admin role from database

**File**: `docs/SUPABASE.md`
- Updated to reference new migration system
- Added production setup instructions
- Maintained backward compatibility with basic setup

## Security Policies Implemented

### Public SELECT Policy (Requirement 14.1, 14.2)
```sql
CREATE POLICY "Public can select published magazines"
  ON public.magazines FOR SELECT TO public
  USING (is_published = true);
```
- Anonymous and authenticated users can only see published magazines
- Unpublished magazines are hidden from non-admins

### Admin INSERT Policy (Requirement 14.3)
```sql
CREATE POLICY "Admins can insert magazines"
  ON public.magazines FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```
- Only users with admin role can create new magazines
- Verified against `user_profiles` table

### Admin UPDATE Policy (Requirement 14.4)
```sql
CREATE POLICY "Admins can update magazines"
  ON public.magazines FOR UPDATE TO authenticated
  USING (...) WITH CHECK (...);
```
- Only users with admin role can update magazines
- Both USING and WITH CHECK clauses verify admin role

### Admin DELETE Policy (Requirement 14.5)
```sql
CREATE POLICY "Admins can delete magazines"
  ON public.magazines FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
```
- Only users with admin role can delete magazines
- Prevents accidental or malicious deletions by non-admins

## Database Schema Changes

### New Table: user_profiles

```sql
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_profiles_user_id_unique UNIQUE (user_id),
  CONSTRAINT user_profiles_email_unique UNIQUE (email)
);
```

**Indexes**:
- `idx_user_profiles_user_id` - Fast lookups by user ID
- `idx_user_profiles_role` - Fast filtering by role

**RLS Policies**:
- Users can read their own profile
- Admins can read all profiles
- Only admins can update profiles

### Automatic Profile Creation

A trigger automatically creates a user profile when a new user signs up:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

New users get 'user' role by default and must be explicitly granted 'admin' role.

## Requirements Fulfilled

✅ **Requirement 14.1**: Public SELECT policy implemented - only published magazines visible to public
✅ **Requirement 14.2**: RLS enabled on magazines table
✅ **Requirement 14.3**: Admin INSERT policy - verifies admin role from user_profiles
✅ **Requirement 14.4**: Admin UPDATE policy - verifies admin role from user_profiles
✅ **Requirement 14.5**: Admin DELETE policy - verifies admin role from user_profiles
✅ **Requirement 14.6**: Migration created and documented for database deployment

## Deployment Status

⚠️ **Migration Not Yet Applied**

The migration files have been created but need to be applied to the Supabase database. Follow these steps:

1. **Review the migration**: Check `supabase/migrations/20241120000000_enable_rls_and_create_policies.sql`
2. **Read deployment guide**: Follow `supabase/DEPLOYMENT_GUIDE.md`
3. **Apply migration**: Use Supabase dashboard SQL editor or CLI
4. **Create admin users**: Grant admin role to at least one user
5. **Test thoroughly**: Verify all policies work as expected

## Testing Checklist

After deployment, verify:

- [ ] Anonymous users can only see published magazines
- [ ] Anonymous users cannot create/update/delete magazines
- [ ] Non-admin authenticated users can only see published magazines
- [ ] Non-admin authenticated users cannot create/update/delete magazines
- [ ] Admin users can see all magazines (published and unpublished)
- [ ] Admin users can create new magazines
- [ ] Admin users can update existing magazines
- [ ] Admin users can delete magazines
- [ ] New user signups automatically create user_profiles entry with 'user' role
- [ ] Authorization service properly checks admin role

## Security Benefits

1. **Principle of Least Privilege**: Users only get the access they need
2. **Defense in Depth**: Database-level security in addition to application-level checks
3. **Audit Trail**: User roles tracked in database
4. **Automatic Protection**: RLS enforced even if application code has bugs
5. **Explicit Admin Grants**: Admins must be explicitly designated, not automatic

## Next Steps

1. Apply the migration to your Supabase database
2. Grant admin role to authorized users
3. Test all functionality thoroughly
4. Monitor for any authorization errors
5. Update any additional documentation as needed

## Support

For issues or questions:
- See `supabase/migrations/README.md` for troubleshooting
- See `supabase/DEPLOYMENT_GUIDE.md` for deployment help
- Check Supabase dashboard logs for errors
- Review application logs for authorization failures

## References

- Security Requirements: `.kiro/specs/security-hardening/requirements.md`
- Security Design: `.kiro/specs/security-hardening/design.md`
- Task List: `.kiro/specs/security-hardening/tasks.md`
- Supabase RLS Docs: https://supabase.com/docs/guides/auth/row-level-security
