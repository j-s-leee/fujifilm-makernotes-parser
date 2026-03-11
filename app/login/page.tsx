import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { Film } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="container flex flex-1 items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Film className="h-5 w-5" />
            <h1 className="text-lg font-bold tracking-tight">film-simulation.site</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Sign in to upload, bookmark, and like recipes
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <GoogleSignInButton className="w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
