'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Sparkles } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useScrollDirection } from '@/hooks/useScrollDirection';

const AIChatWidget = dynamic(() => import('@/components/ai/AIChatWidget').then((module) => module.AIChatWidget), {
  ssr: false,
});

export function LazyAIChatWidget() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const scrollingDown = useScrollDirection();
  const [activated, setActivated] = React.useState(false);

  if (activated) {
    return <AIChatWidget initialOpen />;
  }

  return (
    <button
      type="button"
      onClick={() => setActivated(true)}
      style={isMobile ? { bottom: scrollingDown ? 72 : 100 } : undefined}
      className="fixed right-4 z-40 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg transition-colors duration-200 hover:bg-primary/90 md:bottom-24 md:right-6"
      aria-label="Open AI Assistant"
    >
      <Sparkles className="h-5 w-5" />
    </button>
  );
}
