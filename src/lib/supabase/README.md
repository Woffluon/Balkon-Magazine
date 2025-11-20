# Supabase Client Implementation

This directory contains the Supabase client implementations for the application.

## Files

- `client.ts` - Browser client for client-side operations
- `server.ts` - Server clients (public, authenticated, with cookies)

## Documentation

**For complete documentation, usage patterns, and implementation details, see:**

📖 **[docs/SUPABASE.md](../../../docs/SUPABASE.md)**

The main documentation includes:
- Complete code implementations with explanations
- Database setup and configuration
- Client selection guide
- Session management flow
- Security best practices
- Troubleshooting guide

## Quick Reference

```typescript
// Client-side (browser)
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Server-side (public data, cached)
import { createPublicClient } from '@/lib/supabase/server'
const supabase = createPublicClient()

// Server-side (with session)
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Server-side (authenticated, auto-redirects)
import { getAuthenticatedClient } from '@/lib/supabase/server'
const supabase = await getAuthenticatedClient()
```

See the main documentation for detailed usage patterns and when to use each client type.
