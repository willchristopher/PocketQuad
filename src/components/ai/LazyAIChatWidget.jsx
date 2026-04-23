'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Sparkles } from 'lucide-react';
import { useScrollDirection } from '@/hooks/useScrollDirection';

const AIChatWidget = dynamic(() => import('@/components/ai/AIChatWidget').then((module) => module.AIChatWidget), {
  ssr: false,
});

export function LazyAIChatWidget() {
  const scrollingDown = useScrollDirection();
  const [activated, setActivated] = React.useState(false);

  if (activated) {
    return <AIChatWidget initialOpen />;
  }

  return (
    <button
      type="button"
      onClick={() => setActivated(true)}
      className={scrollingDown
        ? 'fixed bottom-[72px] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg transition-colors duration-200 hover:bg-primary/90 md:bottom-24 md:right-6'
        : 'fixed bottom-[100px] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg transition-colors duration-200 hover:bg-primary/90 md:bottom-24 md:right-6'}
      aria-label="Open AI Assistant"
    >
      <Sparkles className="h-5 w-5" />
    </button>
  );
}
