export function TrendingSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-fade-in-up [animation-delay:200ms]">
      {children}
    </div>
  );
}
