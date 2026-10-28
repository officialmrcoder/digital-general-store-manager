import React, { useState } from 'react';
import { FolderTree, Copy, Check, FileText, Smartphone, AlertTriangle, Layers, Terminal } from 'lucide-react';
import { NEXTJS_FOLDER_TREE, NEXT_CONFIG_CODE, MIDDLEWARE_CODE, MANIFEST_CODE } from '../../lib/nextjs-architecture-code';

export const NextjsStructureViewer: React.FC = () => {
  const [activeSnippet, setActiveSnippet] = useState<'tree' | 'nextconfig' | 'middleware' | 'manifest'>('tree');
  const [copied, setCopied] = useState(false);

  const getActiveCode = () => {
    switch (activeSnippet) {
      case 'tree':
        return NEXTJS_FOLDER_TREE;
      case 'nextconfig':
        return NEXT_CONFIG_CODE;
      case 'middleware':
        return MIDDLEWARE_CODE;
      case 'manifest':
        return MANIFEST_CODE;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-900 text-slate-100">
      {/* Top Banner */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-950 border border-blue-800/80 text-blue-400">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Next.js App Router + PWA Architecture</h2>
              <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                Next.js 15+ &amp; Serwist
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Deliverable 2: Production directory hierarchy, multi-tenant middleware, and PWA manifest
            </p>
          </div>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition shrink-0"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-blue-200" />
              <span>Copied to Clipboard!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copy Current Code</span>
            </>
          )}
        </button>
      </div>

      {/* PWA Best Practice Alert */}
      <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-start gap-3 text-xs">
        <Smartphone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-slate-200">
            PWA Implementation Standard: App Router + Serwist
          </p>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            Note: The legacy <code className="text-rose-400 bg-slate-800 px-1 rounded">next-pwa</code> package has been unmaintained since 2022 and causes Webpack 5 breakages in Next.js 14/15. The modern standard uses native Next.js <code className="text-emerald-400 bg-slate-800 px-1 rounded">app/manifest.ts</code> alongside <code className="text-emerald-400 bg-slate-800 px-1 rounded">@serwist/next</code> for full offline caching and background sync.
          </p>
        </div>
      </div>

      {/* Snippet Tabs */}
      <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSnippet('tree')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeSnippet === 'tree' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>Full Folder Structure</span>
        </button>

        <button
          onClick={() => setActiveSnippet('middleware')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeSnippet === 'middleware' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>middleware.ts (Tenant Routing)</span>
        </button>

        <button
          onClick={() => setActiveSnippet('nextconfig')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeSnippet === 'nextconfig' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>next.config.mjs (Serwist PWA)</span>
        </button>

        <button
          onClick={() => setActiveSnippet('manifest')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeSnippet === 'manifest' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>app/manifest.ts (Installable PWA)</span>
        </button>
      </div>

      {/* Code Display */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
          <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-slate-400 text-[11px]">
            <span>
              {activeSnippet === 'tree' && 'Directory Tree Blueprint'}
              {activeSnippet === 'middleware' && 'middleware.ts'}
              {activeSnippet === 'nextconfig' && 'next.config.mjs'}
              {activeSnippet === 'manifest' && 'app/manifest.ts'}
            </span>
            <span>TypeScript / Config</span>
          </div>

          <pre className="p-5 text-slate-300 leading-relaxed overflow-x-auto whitespace-pre selection:bg-blue-600 selection:text-white">
            {getActiveCode()}
          </pre>
        </div>
      </div>
    </div>
  );
};
