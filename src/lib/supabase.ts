/**
 * Zero-dependency, lightweight Supabase Client
 * Uses native browser fetch() to talk to Supabase REST and Auth endpoints.
 * Never crashes Vite even if @supabase/supabase-js is not installed in node_modules!
 */

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
    async maybeSingle() {
      if (!isSupabaseConfigured) return { data: null, error: null };
      try {
        const query = filters.length > 0 ? `?${filters.join('&')}&limit=1` : '?limit=1';
        const res = await fetch(`${supabaseUrl}/rest/v1/${table}${query}`, {
          headers: { ...headers, 'Accept': 'application/vnd.pgrst.object+json' },
        });
        if (!res.ok) return { data: null, error: new Error(res.statusText) };
        const data = await res.json();
        return { data, error: null };
      } catch (err) {
        return { data: null, error: err };
      }
    },
    async then(resolve: (value: { data: any[] | null; error: any }) => void) {
      if (!isSupabaseConfigured) {
        resolve({ data: [], error: null });
        return;
      }
      try {
        const query = filters.length > 0 ? `?select=${selectFields}&${filters.join('&')}` : `?select=${selectFields}`;
        const res = await fetch(`${supabaseUrl}/rest/v1/${table}${query}`, { headers });
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        resolve({ data, error: null });
      } catch (err) {
        resolve({ data: null, error: err });
      }
    },
    async insert(payload: Record<string, any> | Record<string, any>[]) {
      if (!isSupabaseConfigured) return { data: null, error: null };
      try {
        const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        return { data, error: res.ok ? null : new Error(res.statusText) };
      } catch (err) {
        return { data: null, error: err };
      }
    },
    async update(payload: Record<string, any>) {
      const updateBuilder = {
        eq(column: string, value: string | number) {
          filters.push(`${column}=eq.${encodeURIComponent(value)}`);
          return updateBuilder;
        },
        async then(resolve: (value: { data: any; error: any }) => void) {
          if (!isSupabaseConfigured) {
            resolve({ data: null, error: null });
            return;
          }
          try {
            const query = filters.length > 0 ? `?${filters.join('&')}` : '';
            const res = await fetch(`${supabaseUrl}/rest/v1/${table}${query}`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => null);
            resolve({ data, error: res.ok ? null : new Error(res.statusText) });
          } catch (err) {
            resolve({ data: null, error: err });
          }
        },
      };
      return updateBuilder;
    },
    async delete() {
      const deleteBuilder = {
        eq(column: string, value: string | number) {
          filters.push(`${column}=eq.${encodeURIComponent(value)}`);
          return deleteBuilder;
        },
        async then(resolve: (value: { data: any; error: any }) => void) {
          if (!isSupabaseConfigured) {
            resolve({ data: null, error: null });
            return;
          }
          try {
            const query = filters.length > 0 ? `?${filters.join('&')}` : '';
            const res = await fetch(`${supabaseUrl}/rest/v1/${table}${query}`, {
              method: 'DELETE',
              headers,
            });
            resolve({ data: null, error: res.ok ? null : new Error(res.statusText) });
          } catch (err) {
            resolve({ data: null, error: err });
          }
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
