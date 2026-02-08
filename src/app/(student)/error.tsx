'use client'

export default function StudentError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h2 className="text-lg font-bold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">{error.message}</p>
      <button
        onClick={() => reset()}
        className="mt-4 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
      >
        Try Again
      </button>
    </div>
  )
}
