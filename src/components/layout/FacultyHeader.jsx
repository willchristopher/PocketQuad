'use client';
import { Menu, Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { FacultySidebar } from "./FacultySidebar";

function getFacultyPageMeta(pathname) {
    if (pathname === '/faculty/profile') {
        return {
            title: 'Faculty Profile',
            description: 'Student-facing profile details and secondary building tools.',
        };
    }
    return {
        title: 'Faculty Workspace',
        description: 'Contact info, office hours, events, and announcements in one place.',
    };
}

export function FacultyHeader() {
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();
    const page = getFacultyPageMeta(pathname);
    return (<header className="sticky top-0 z-20 flex h-14 w-full items-center gap-4 border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 lg:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0 md:hidden rounded-lg h-8 w-8">
            <Menu className="h-4 w-4"/>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0 w-[260px]">
          <FacultySidebar />
        </SheetContent>
      </Sheet>

      <div className="min-w-0 flex-1">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">PocketQuad Faculty</p>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">{page.title}</p>
            <p className="hidden truncate text-xs text-muted-foreground md:block">{page.description}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"/>
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"/>
        </Button>
      </div>
    </header>);
}
