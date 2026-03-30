'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, LayoutGrid, LogOut, School } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth/context';
import { useUniversityTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

const navigationItems = [
  { icon: LayoutGrid, label: 'Dashboard', href: '/faculty/dashboard' },
  { icon: Building2, label: 'Buildings', href: '/faculty/profile' },
];

function FacultySidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const { universityName } = useUniversityTheme();

  const displayName = profile?.displayName ?? 'Faculty Member';
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="sidebar-shell flex h-full w-full flex-col rounded-none p-4 lg:rounded-[2rem]">
      <Link
        href="/faculty/dashboard"
        className="rounded-[1.6rem] border border-white/10 bg-white/[0.05] px-4 py-4 transition-colors hover:bg-white/[0.08]"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[1.2rem] border border-white/10 bg-white/[0.08] text-[#fff9eb]">
            <School className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-3xl leading-none text-[#fff9eb]">PocketQuad</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-[#fff9eb]/74">Faculty tools</p>
          </div>
        </div>
        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[#fff9eb]/70">{universityName ?? 'Campus tools'}</p>
      </Link>

      <div className="mt-6 flex-1 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('sidebar-link', isActive && 'sidebar-link-active')}
              aria-current={isActive ? 'page' : undefined}
            >
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.08]',
                  isActive && 'border-white/14 bg-white/[0.12]',
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 rounded-[1.6rem] border border-white/10 bg-white/[0.05] p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 rounded-[1rem] border border-white/10">
            <AvatarImage src={profile?.avatar ?? undefined} alt={displayName} />
            <AvatarFallback className="rounded-[1rem] bg-white/[0.08] text-sm text-[#fff9eb]">
              {initials || 'FM'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#fff9eb]">{displayName}</p>
            <p className="truncate text-xs text-[#fff9eb]/72">{profile?.email ?? 'faculty@pocketquad.edu'}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleLogout()}
          className="sidebar-link sidebar-link-secondary mt-4 w-full py-2.5 text-left hover:bg-red-500/10 hover:text-[#fff9eb]"
        >
          <LogOut className="h-[18px] w-[18px]" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
}

export function FacultySidebar({ mobile = false }) {
  if (mobile) {
    return <FacultySidebarContent />;
  }

  return (
    <aside className="fixed inset-y-4 left-4 z-40 hidden w-[288px] lg:flex">
      <FacultySidebarContent />
    </aside>
  );
}
