import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { SkipLink } from '@/components/layout/SkipLink';
import { StudentPageVisibilityGate } from '@/components/auth/StudentPageVisibilityGate';
import { LazyCommandPalette } from '@/components/layout/LazyCommandPalette';
import { LazyAIChatWidget } from '@/components/ai/LazyAIChatWidget';
import { requireStudentSnapshot } from '@/lib/auth/snapshot';
function LayoutShell({ children }) {
    return (<div className="relative min-h-screen">
      <SkipLink />
      <Sidebar />
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 px-4 pb-12 pt-5 sm:px-6 lg:px-8 lg:pb-32 lg:pt-8 xl:px-10" id="main-content">
          <div className="mx-auto w-full max-w-[1500px]">
            {children}
          </div>
        </main>
      </div>
      <LazyCommandPalette />
      <LazyAIChatWidget />
    </div>);
}
export default async function StudentLayout({ children, }) {
    await requireStudentSnapshot();
    return (<StudentPageVisibilityGate>
        <LayoutShell>{children}</LayoutShell>
      </StudentPageVisibilityGate>);
}
