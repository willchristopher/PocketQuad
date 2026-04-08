'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, } from '@/components/ui/command';
import { useStudentPageVisibility } from '@/hooks/useStudentPageVisibility';
import { getStudentCommandNavigationItems } from '@/components/layout/studentNavigation';
export function CommandPalette() {
    const [open, setOpen] = React.useState(false);
    const router = useRouter();
    const { disabledStudentPages } = useStudentPageVisibility();
    const studentCommandNavigationItems = React.useMemo(() => getStudentCommandNavigationItems(disabledStudentPages), [disabledStudentPages]);
    React.useEffect(() => {
        const down = (event) => {
            if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                setOpen((previous) => !previous);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);
    const navigate = React.useCallback((href) => {
        setOpen(false);
        router.push(href);
    }, [router]);
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
