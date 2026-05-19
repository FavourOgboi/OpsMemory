import { motion } from 'framer-motion';
import { useOnboarding } from '@/store/useOnboarding';
import { useAuth } from '@/store/useAuth';
import { useEffect } from 'react';

const BUSINESS_TYPES = [
  { emoji: '🛒', label: 'Trading / Distribution' },
  { emoji: '🚚', label: 'Logistics & Delivery' },
  { emoji: '🍽️', label: 'Food & Beverage' },
  { emoji: '🏥', label: 'Healthcare / Clinic' },
  { emoji: '🏗️', label: 'Construction / Contracting' },
  { emoji: '💼', label: 'Professional Services' },
  { emoji: '🎓', label: 'Education / Training' },
  { emoji: '🏠', label: 'Real Estate' },
  { emoji: '🏭', label: 'Manufacturing' },
  { emoji: '🛍️', label: 'Retail / E-commerce' },
  { emoji: '📦', label: 'Other' },
];

export function Step1Identity() {
  const { businessName, ownerName, businessType, city, setField } = useOnboarding();
  const { user } = useAuth();

  // Pre-fill owner name from auth if available
  useEffect(() => {
    if (user?.name && !ownerName) {
      setField('ownerName', user.name);
    }
  }, [user, ownerName, setField]);

  return (
    <div>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        className="mb-6 text-center text-4xl"
      >
        🏢
      </motion.div>

      <h2 className="text-center text-2xl font-semibold text-[#F8FAFC]">
        Let's set up your business.
      </h2>
      <p className="mt-2 text-center text-sm text-[#94A3B8]">
        Tell us a bit about your business so your agent knows who it's representing.
      </p>

      <div className="mt-8 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-[#F8FAFC]">
            Business Name <span className="text-[#EF4444]">*</span>
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setField('businessName', e.target.value)}
            placeholder="e.g. Bola Agro Supplies Ltd"
            className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3.5 text-sm text-[#F8FAFC] placeholder-[#475569] transition-colors duration-150 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[#F8FAFC]">
            Your Name <span className="text-[#EF4444]">*</span>
          </label>
          <input
            type="text"
            value={ownerName}
            onChange={(e) => setField('ownerName', e.target.value)}
            placeholder="e.g. Bola Adeyemi"
            className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3.5 text-sm text-[#F8FAFC] placeholder-[#475569] transition-colors duration-150 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[#F8FAFC]">
            Business Type <span className="text-[#EF4444]">*</span>
          </label>
          <select
            value={businessType}
            onChange={(e) => setField('businessType', e.target.value)}
            className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3.5 text-sm text-[#F8FAFC] transition-colors duration-150 focus:border-emerald-500 focus:outline-none appearance-none"
          >
            <option value="">Select your industry</option>
            {BUSINESS_TYPES.map((bt) => (
              <option key={bt.label} value={bt.label}>
                {bt.emoji} {bt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[#F8FAFC]">
            City / State <span className="text-[#EF4444]">*</span>
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setField('city', e.target.value)}
            placeholder="e.g. Lagos"
            className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3.5 text-sm text-[#F8FAFC] placeholder-[#475569] transition-colors duration-150 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
