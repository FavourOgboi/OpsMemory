import { motion } from 'framer-motion';
import { useOnboarding } from '@/store/useOnboarding';
import { Upload } from 'lucide-react';
import { useState, useRef } from 'react';
import { saveOnboardingProgress, uploadCatalogPdf } from '@/lib/onboarding-api';

export function Step4Catalog() {
  const {
    catalogUrl,
    catalogUploaded,
    businessDescription,
    productsText,
    setField,
  } = useOnboarding();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      await saveOnboardingProgress(useOnboarding.getState() as Record<string, unknown>, 4);
      const result = await uploadCatalogPdf(file);
      setField('catalogUploaded', true);
      if (result.chunks_stored) {
        setField('productsText', `${productsText}\n# PDF catalog indexed (${result.chunks_stored} sections)`.trim());
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleBlurSave = async () => {
    if (!productsText.trim() && !businessDescription.trim() && !catalogUrl) return;
    setSaving(true);
    try {
      await saveOnboardingProgress(useOnboarding.getState() as Record<string, unknown>, 4);
    } catch {
      // Non-blocking; full sync on complete
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        className="mb-6 text-center text-4xl"
      >
        📋
      </motion.div>
      <h2 className="text-center text-2xl font-semibold text-foreground">
        Teach your agent what you sell.
      </h2>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        This goes straight into your knowledge base — WhatsApp customers get answers from here.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-muted p-6 space-y-6">
        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            About your business
          </label>
          <textarea
            value={businessDescription}
            onChange={(e) => setField('businessDescription', e.target.value)}
            onBlur={handleBlurSave}
            rows={3}
            placeholder="e.g. We supply agro inputs across Lagos and Ogun. Delivery in 24–48 hours."
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:border-emerald-500 focus:outline-none resize-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Products & prices <span className="text-muted-foreground font-normal">(one per line)</span>
          </label>
          <textarea
            value={productsText}
            onChange={(e) => setField('productsText', e.target.value)}
            onBlur={handleBlurSave}
            rows={6}
            placeholder={'Rice 50kg - ₦45,000\nBeans 25kg - ₦32,000\nFertilizer NPK - ₦18,500'}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-mono text-foreground placeholder-muted-foreground focus:border-emerald-500 focus:outline-none resize-none"
          />
          {saving && (
            <p className="mt-1 text-xs text-muted-foreground">Saving to database…</p>
          )}
        </div>

        <div>
          <div className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Option A: Upload PDF catalog
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.txt,.md" onChange={handleFileChange} className="hidden" />
          {catalogUploaded ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
              <span className="text-emerald-400 text-sm">Catalog indexed for WhatsApp replies</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full rounded-xl border-2 border-dashed border-border bg-background/50 py-8 text-center transition hover:border-emerald-500/50"
            >
              {uploading ? (
                <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">PDF, TXT, or MD — embedded for search</span>
                </div>
              )}
            </button>
          )}
          {uploadError && <p className="mt-2 text-xs text-rose-400">{uploadError}</p>}
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">OR</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div>
          <div className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Option B: Catalog link
          </div>
          <input
            type="url"
            value={catalogUrl}
            onChange={(e) => setField('catalogUrl', e.target.value)}
            onBlur={handleBlurSave}
            placeholder="Google Drive / website catalog"
            className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-sm text-foreground placeholder-muted-foreground focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
