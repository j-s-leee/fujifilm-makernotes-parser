export function Footer() {
  return (
    <footer className="border-t border-border py-8 text-center">
      <p className="text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} Film Recipe Viewer
      </p>
    </footer>
  );
}
