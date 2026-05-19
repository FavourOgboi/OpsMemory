import { motion } from 'framer-motion';
import { useOnboarding } from '@/store/useOnboarding';
import { Upload } from 'lucide-react';
import { useState, useRef } from 'react';

export function Step4Catalog() {
  const { catalogUrl, catalogUploaded, setField } = useOnboarding();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async () => {
    setUploading(true);
    setTimeout(() => { setField('catalogUploaded', true); setUploading(false); }, 1500);
  };

  return (
    <div>
      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }} className="mb-6 text-center text-4xl">📋</motion.div>
      <h2 className="text-center text-2xl font-semibold text-[#F8FAFC]">Share your product catalog.</h2>
      <p className="mt-2 text-center text-sm text-[#94A3B8]">Upload your catalog, paste a link, or skip.</p>
      <div className="mt-8 rounded-xl border border-[#1E293B] bg-[#0F172A] p-6 space-y-6">
        <div>
          <div className="mb-3 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Option A: Upload PDF</div>
          <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
          {catalogUploaded ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
              <span className="text-emerald-400 text-sm">✅ Catalog uploaded</span>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="w-full rounded-xl border-2 border-dashed border-[#334155] bg-[#1E293B]/50 py-8 text-center transition hover:border-[#475569]">
              {uploading ? <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              : <div className="flex flex-col items-center gap-2"><Upload className="h-8 w-8 text-[#475569]" /><span className="text-sm text-[#94A3B8]">Drop PDF here or click to browse</span></div>}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3"><div className="h-px flex-1 bg-[#334155]" /><span className="text-xs text-[#475569]">OR</span><div className="h-px flex-1 bg-[#334155]" /></div>
        <div>
          <div className="mb-3 text-xs font-medium text-[#94A3B8] uppercase tracking-wider">Option B: Paste a link</div>
          <input type="url" value={catalogUrl} onChange={(e) => setField('catalogUrl', e.target.value)} placeholder="Google Drive / catalog link"
            className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3.5 text-sm text-[#F8FAFC] placeholder-[#475569] focus:border-emerald-500 focus:outline-none" />
        </div>
      </div>
    </div>
  );
}
