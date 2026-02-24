import { signInWithGoogle, signInWithGitHub } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Film } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Film className="h-5 w-5" />
            <h1 className="text-lg font-bold tracking-tight">Film Recipe Viewer</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Sign in to share recipes and save favorites
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <form action={signInWithGoogle}>
            <Button variant="outline" className="w-full" type="submit">
              Continue with Google
            </Button>
          </form>
          <form action={signInWithGitHub}>
            <Button variant="outline" className="w-full" type="submit">
              Continue with GitHub
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
