import Link from 'next/link';
export default function StudentNotFound() {
    return (<div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-20 text-center">
      <h2 className="font-display text-2xl font-extrabold text-foreground">Page not found</h2>
      <p className="mt-2 text-sm text-muted-foreground">We couldn&apos;t find the page you&apos;re looking for.</p>
      <Link href="/dashboard" className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm">
        Back to Dashboard
      </Link>
    </div>);
}
