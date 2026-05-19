import { createFileRoute } from '@tanstack/react-router';
import { RecommendationEngine } from '@/components/recommendations/RecommendationEngine';

export const Route = createFileRoute('/dashboard/recommendations')({
  component: RecommendationEngine,
});
