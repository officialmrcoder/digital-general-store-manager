import React, { useState } from 'react';
import { Database, Copy, Check, Shield, Key, FileCode, CheckCircle2 } from 'lucide-react';
import { SUPABASE_SCHEMA_SQL } from '../../lib/supabase-schema-code';

export const SupabaseSchemaViewer: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'tables' | 'rls' | 'triggers'>('all');

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const schemaHighlights = [
    {
      title: 'Multi-Tenant Isolation via store_id',
      desc: 'Shared PostgreSQL database with hard tenant boundary. Every entity (products, orders, customers, khata_transactions) strictly references stores(id).',
    },
    {
      title: 'Comprehensive Row Level Security (RLS)',
      desc: 'All 10 tables enforce ENABLE ROW LEVEL SECURITY. Policies verify membership through store_users or auth.jwt() claims.',
    },
    {
      title: 'Atomic Double-Entry Khata Trigger',
      desc: 'trg_after_khata_insert ensures customer balances update atomically on credit/debit inserts without frontend race conditions.',
    },
    {
      title: 'Automated Unit Inventory Decrement',
      desc: 'trg_after_order_item_sold converts sold packaging units (e.g. 2 Cartons) into base inventory units (48 Packets) and decrements stock atomically.',
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900 text-slate-100">
      {/* Top Banner */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-800/80 text-emerald-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Supabase Multi-Tenant SQL Schema &amp; RLS</h2>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                PostgreSQL 15+ / Supabase
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Deliverable 1: Complete DDL tables, indexes, RBAC functions, and Row Level Security policies
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-200" />
              <span>SQL Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Full SQL Migration</span>
            </>
          )}
        </button>
      </div>

      {/* Architectural Highlights */}
      <div className="p-4 bg-slate-900/60 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {schemaHighlights.map((hl, idx) => (
          <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400 mb-1">
              <Shield className="w-3.5 h-3.5" />
              <span>{hl.title}</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">{hl.desc}</p>
          </div>
        ))}
      </div>

      {/* Code Viewer */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-emerald-400" />
              <span>supabase/migrations/20261025_kiryana_multitenant_schema.sql</span>
            </div>
            <span>PostgreSQL / PL/pgSQL</span>
          </div>

          <pre className="p-5 text-slate-300 leading-relaxed overflow-x-auto whitespace-pre selection:bg-emerald-600 selection:text-white">
            {SUPABASE_SCHEMA_SQL}
          </pre>
        </div>
      </div>
    </div>
  );
};
