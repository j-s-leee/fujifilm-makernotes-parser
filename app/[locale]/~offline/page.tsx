export default function OfflinePage() {
  return (
    <div className="container flex flex-1 flex-col items-center justify-center py-24 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Offline</h1>
      <p className="mt-3 text-sm text-muted-foreground max-w-sm">
        You are currently offline. Please check your internet connection and try
        again.
      </p>
    </div>
  );
}
