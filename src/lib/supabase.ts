/**
 * Zero-dependency, lightweight Supabase Client
 * Uses native browser fetch() to talk to Supabase REST and Auth endpoints.
 * Never crashes Vite even if @supabase/supabase-js is not installed in node_modules!
 */

const DEFAULT_SUPABASE_URL = 'https://ljndqztwlltblsyedogl.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbmRxenR3bGx0YmxzeWVkb2dsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5MzgxNjIsImV4cCI6MjEwODUxNDE2Mn0.1P4f_jfhSctQC3yk3_mq8EIzhPeucGa2hlp8LAzPw5E';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('YOUR_PROJECT') &&
  supabaseUrl.startsWith('https://')
);

// Generic REST query builder for Supabase PostgREST
function createQueryBuilder(table: string) {
  let selectFields = '*';
  const filters: string[] = [];

  const headers = {
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };

  const builder = {
    select(fields = '*') {
      selectFields = fields;
      return builder;
    },
    eq(column: string, value: string | number) {
      filters.push(`${column}=eq.${encodeURIComponent(value)}`);
      return builder;
    },
    order(column: string, { ascending = true } = {}) {
      filters.push(`order=${encodeURIComponent(column)}.${ascending ? 'asc' : 'desc'}`);
      return builder;
    },
    async maybeSingle() {
      if (!isSupabaseConfigured) return { data: null, error: null };
      try {
        const query = filters.length > 0 ? `?${filters.join('&')}&limit=1` : '?limit=1';
        const res = await fetch(`${supabaseUrl}/rest/v1/${table}${query}`, {
          headers: { ...headers, 'Accept': 'application/vnd.pgrst.object+json' },
        });
        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          return { data: null, error: new Error(errJson?.message || res.statusText) };
        }
        const data = await res.json();
        return { data, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    },
    async then(resolve: (value: { data: any[] | null; error: any }) => void, reject?: (reason: any) => void) {
      if (!isSupabaseConfigured) {
        resolve({ data: [], error: null });
        return;
      }
      try {
        const query = filters.length > 0 ? `?select=${selectFields}&${filters.join('&')}` : `?select=${selectFields}`;
        const res = await fetch(`${supabaseUrl}/rest/v1/${table}${query}`, { headers });
        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          throw new Error(errJson?.message || res.statusText);
        }
        const data = await res.json();
        resolve({ data, error: null });
      } catch (err) {
        if (reject) {
          resolve({ data: null, error: err });
        } else {
          resolve({ data: null, error: err });
        }
      }
    },
    async insert(payload: Record<string, any> | Record<string, any>[], options?: { upsert?: boolean }) {
      if (!isSupabaseConfigured) return { data: null, error: null };
      try {
        // Use merge-duplicates for upsert behavior
        const reqHeaders: Record<string, string> = {
          ...headers,
          'Prefer': options?.upsert !== false
            ? 'resolution=merge-duplicates,return=representation'
            : 'return=representation',
        };
        const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          return { data: null, error: new Error(data?.message || data?.details || res.statusText) };
        }
        return { data, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    },
    async upsert(payload: Record<string, any> | Record<string, any>[]) {
      return builder.insert(payload, { upsert: true });
    },
    update(payload: Record<string, any>) {
      const updateFilters: string[] = [];
      let execPromise: Promise<{ data: any; error: any }> | null = null;

      const runUpdate = async () => {
        if (!isSupabaseConfigured) return { data: null, error: null };
        try {
          const query = updateFilters.length > 0 ? `?${updateFilters.join('&')}` : '';
          const res = await fetch(`${supabaseUrl}/rest/v1/${table}${query}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(payload),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) {
            return { data: null, error: new Error(data?.message || data?.details || res.statusText) };
          }
          return { data, error: null };
        } catch (err) {
          return { data: null, error: err };
        }
      };

      const getExecPromise = () => {
        if (!execPromise) {
          execPromise = runUpdate();
        }
        return execPromise;
      };

      // In case caller doesn't await or .then()
      queueMicrotask(() => {
        getExecPromise();
      });

      const updateBuilder = {
        eq(column: string, value: string | number) {
          updateFilters.push(`${column}=eq.${encodeURIComponent(value)}`);
          return updateBuilder;
        },
        then(resolve: (value: { data: any; error: any }) => void, reject?: (reason: any) => void) {
          return getExecPromise().then(resolve, reject);
        },
      };
      return updateBuilder;
    },
    delete() {
      const deleteFilters: string[] = [];
      let execPromise: Promise<{ data: any; error: any }> | null = null;

      const runDelete = async () => {
        if (!isSupabaseConfigured) return { data: null, error: null };
        try {
          const query = deleteFilters.length > 0 ? `?${deleteFilters.join('&')}` : '';
          const res = await fetch(`${supabaseUrl}/rest/v1/${table}${query}`, {
            method: 'DELETE',
            headers,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            return { data: null, error: new Error(data?.message || res.statusText) };
          }
          return { data: null, error: null };
        } catch (err) {
          return { data: null, error: err };
        }
      };

      const getExecPromise = () => {
        if (!execPromise) {
          execPromise = runDelete();
        }
        return execPromise;
      };

      // In case caller doesn't await or .then()
      queueMicrotask(() => {
        getExecPromise();
      });

      const deleteBuilder = {
        eq(column: string, value: string | number) {
          deleteFilters.push(`${column}=eq.${encodeURIComponent(value)}`);
          return deleteBuilder;
        },
        then(resolve: (value: { data: any; error: any }) => void, reject?: (reason: any) => void) {
          return getExecPromise().then(resolve, reject);
        },
      };
      return deleteBuilder;
    },
  };

  return builder;
}

export const supabase = {
  from(table: string) {
    return createQueryBuilder(table);
  },
  auth: {
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      if (!isSupabaseConfigured) {
        return { data: { user: { id: `local-${Date.now()}`, email } }, error: null };
      }
      try {
        const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error_description || json.msg || 'Login failed');
        return { data: { user: json.user, session: json }, error: null };
      } catch (err: any) {
        return { data: { user: null }, error: err };
      }
    },
    async signUp({ email, password, options }: { email: string; password: string; options?: any }) {
      if (!isSupabaseConfigured) {
        return { data: { user: { id: `local-${Date.now()}`, email } }, error: null };
      }
      try {
        const res = await fetch(`${supabaseUrl}/auth/v1/signup`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, data: options?.data }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error_description || json.msg || 'Sign up failed');
        return { data: { user: json.user || json }, error: null };
      } catch (err: any) {
        return { data: { user: null }, error: err };
      }
    },
    async signOut() {
      return { error: null };
    },
  },
};
