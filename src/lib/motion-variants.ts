import type { Variants } from 'framer-motion';

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

export const staggerFast: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05 },
  },
};

export const heroStagger: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.3 },
  },
};

export const agentCardStagger: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

export const wordReveal: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

export const cardPulse: Variants = {
  rest: { scale: 1 },
  pulse: {
    scale: [1, 1.02, 1],
    transition: { duration: 0.6, ease: 'easeInOut' },
  },
};

export const slideUpPanel: Variants = {
  hidden: { y: '100%', opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2 },
  },
};

export const eventSlideIn: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
  exit: {
    opacity: 0,
    x: -24,
    transition: { duration: 0.2 },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
};

export const slideFromLeft: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

export const slideFromRight: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

export const timelineDraw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 1.5, ease: 'easeInOut' as const },
      opacity: { duration: 0.3 },
    },
  },
};

export const approvalSwipe = {
  approve: {
    scale: 0.8,
    opacity: 0,
    x: 200,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
  reject: {
    scale: 0.8,
    opacity: 0,
    x: -200,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};

export const springConfig = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
} as const;

export const glowPulse = {
  pulse: {
    boxShadow: [
      '0 0 0 0 rgba(16,185,129,0.4)',
      '0 0 0 12px rgba(16,185,129,0)',
      '0 0 0 0 rgba(16,185,129,0.4)',
    ],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const borderPulse = {
  pulse: {
    borderLeftColor: ['#F59E0B', 'transparent', '#F59E0B'],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
};

export const navItem: Variants = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
};

export const tabContent: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.15 },
  },
};

export const typingDot: Variants = {
  animate: {
    opacity: [0.3, 1, 0.3],
    transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
  },
};
