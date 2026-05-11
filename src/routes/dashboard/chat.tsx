import { createFileRoute } from '@tanstack/react-router';
import { IntelligenceChat } from '@/components/chat/IntelligenceChat';

export const Route = createFileRoute('/dashboard/chat')({
  component: () => (
    <div className="h-full">
      <IntelligenceChat />
    </div>
  ),
});
