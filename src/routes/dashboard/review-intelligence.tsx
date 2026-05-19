import { createFileRoute } from '@tanstack/react-router';
import { ReviewIntelligence } from '@/components/review/ReviewIntelligence';

export const Route = createFileRoute('/dashboard/review-intelligence')({
  component: ReviewIntelligence,
});
