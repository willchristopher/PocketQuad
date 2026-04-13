'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';

const CommandPalette = dynamic(() => import('@/components/layout/CommandPalette').then((module) => module.CommandPalette), {
  ssr: false,
});

export function LazyCommandPalette() {
  const [activated, setActivated] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key.toLowerCase() !== 'k' || (!event.metaKey && !event.ctrlKey)) {
        return;
      }

      event.preventDefault();

      if (!activated) {
        setActivated(true);
        setOpen(true);
        return;
      }

      setOpen((previous) => !previous);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activated]);

  if (!activated) {
    return null;
  }

  return <CommandPalette open={open} onOpenChange={setOpen} listenForShortcut={false} />;
}
