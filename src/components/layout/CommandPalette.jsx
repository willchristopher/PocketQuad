'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, } from '@/components/ui/command';
import { useStudentPageVisibility } from '@/hooks/useStudentPageVisibility';
import { getStudentCommandNavigationItems } from '@/components/layout/studentNavigation';

export function CommandPalette({ open: controlledOpen, defaultOpen = false, onOpenChange, listenForShortcut = true }) {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
    const router = useRouter();
    const { disabledStudentPages } = useStudentPageVisibility();
    const studentCommandNavigationItems = React.useMemo(() => getStudentCommandNavigationItems(disabledStudentPages), [disabledStudentPages]);
    const open = controlledOpen ?? uncontrolledOpen;
    const setOpen = React.useCallback((nextValue) => {
        const resolvedValue = typeof nextValue === 'function' ? nextValue(open) : nextValue;
        if (typeof controlledOpen === 'undefined') {
            setUncontrolledOpen(resolvedValue);
        }
        onOpenChange?.(resolvedValue);
    }, [controlledOpen, onOpenChange, open]);
    React.useEffect(() => {
        if (!listenForShortcut) {
            return undefined;
        }
        const down = (event) => {
            if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                setOpen((previous) => !previous);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [listenForShortcut, setOpen]);
    const navigate = React.useCallback((href) => {
        setOpen(false);
        router.push(href);
    }, [router, setOpen]);
    return (<CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages"/>
      <CommandList>
        <CommandEmpty>No matching page found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {studentCommandNavigationItems.map((item) => {
            const Icon = item.icon;
            return (<CommandItem key={item.href} onSelect={() => navigate(item.href)}>
                <Icon className="mr-2 h-4 w-4"/>
                <span>{item.label}</span>
              </CommandItem>);
        })}
        </CommandGroup>
        <CommandSeparator />
      </CommandList>
    </CommandDialog>);
}
