import { createFileRoute } from '@tanstack/react-router';
import { KnowledgeBase } from '@/components/knowledge/KnowledgeBase';

export const Route = createFileRoute('/dashboard/knowledge')({
  component: KnowledgeBase,
});
