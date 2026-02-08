import Link from 'next/link'

export default function FacultyNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <h2 className="text-2xl font-extrabold">Page not found</h2>
      <p className="text-sm text-muted-foreground mt-2">We couldn&apos;t find the page you&apos;re looking for.</p>
      <Link href="/faculty/dashboard" className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
        Back to Faculty Dashboard
      </Link>
    </div>
  )
}
