import { Film } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

export function Header() {
  return (
    <header className="flex items-center justify-between border-b border-border px-6 py-3 md:px-10">
      <div className="flex items-center gap-2">
        <Film className="h-5 w-5" />
        <h1 className="text-lg font-bold tracking-tight">Film Recipe Viewer</h1>
      </div>
      <div className="flex items-center gap-4">
        <a
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          href="https://tally.so/r/wLqO0J"
          target="_blank"
          rel="noopener noreferrer"
        >
          Feedback
        </a>
        <ModeToggle />
      </div>
    </header>
  );
}
