'use client';
export default function FacultyError({ error, reset }) {
    return (<div className="mx-auto flex max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <h2 className="font-display text-lg font-bold text-foreground">Something went wrong</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{error.message}</p>
      <button type="button" onClick={() => reset()} className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm">
        Try Again
      </button>
    </div>);
}
