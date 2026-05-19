import { motion } from 'framer-motion';
import { useOnboarding } from '@/store/useOnboarding';

export function Step2Presence() {
  const { websiteUrl, instagramHandle, otherLink, setField } = useOnboarding();

  return (
    <div>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        className="mb-6 text-center text-4xl"
      >
        🌐
      </motion.div>

      <h2 className="text-center text-2xl font-semibold text-[#F8FAFC]">
        Where can customers find you?
      </h2>
      <p className="mt-2 text-center text-sm text-[#94A3B8]">
        Your agent will share these links with customers who ask about your business. All fields are
        optional.
      </p>

      <div className="mt-8 space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium text-[#F8FAFC]">
            Website URL <span className="ml-1 font-normal text-[#475569]">(optional)</span>
          </label>
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setField('websiteUrl', e.target.value)}
            placeholder="https://yourbusiness.com"
            className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3.5 text-sm text-[#F8FAFC] placeholder-[#475569] transition-colors duration-150 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[#F8FAFC]">
            Instagram Handle <span className="ml-1 font-normal text-[#475569]">(optional)</span>
          </label>
          <input
            type="text"
            value={instagramHandle}
            onChange={(e) => setField('instagramHandle', e.target.value)}
            placeholder="@yourhandle"
            className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3.5 text-sm text-[#F8FAFC] placeholder-[#475569] transition-colors duration-150 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[#F8FAFC]">
            Other Link (Facebook, LinkedIn...)
            <span className="ml-1 font-normal text-[#475569]">(optional)</span>
          </label>
          <input
            type="url"
            value={otherLink}
            onChange={(e) => setField('otherLink', e.target.value)}
            placeholder="https://"
            className="w-full rounded-xl border border-[#334155] bg-[#1E293B] px-4 py-3.5 text-sm text-[#F8FAFC] placeholder-[#475569] transition-colors duration-150 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-[#1E293B] bg-[#0F172A] p-4">
        <p className="text-xs leading-relaxed text-[#64748B]">
          💡 When a customer asks "where can I see your products?" your agent will automatically
          share these links.
        </p>
      </div>
    </div>
  );
}
