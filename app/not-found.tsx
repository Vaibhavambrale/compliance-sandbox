export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold">404 - Page Not Found</h2>
      <p className="text-muted-foreground mt-2">The page you are looking for does not exist.</p>
      <a href="/dashboard" className="mt-4 text-violet-600 underline">Go to Dashboard</a>
    </div>
  )
}
