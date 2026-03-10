import { Card, CardContent } from "@/components/ui/card";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

interface AuthPromptProps {
  title: string;
  description: string;
}

export function AuthPrompt({ title, description }: AuthPromptProps) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-20">
      <Card className="w-full max-w-sm text-center">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <div className="mt-4">
            <GoogleSignInButton className="w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
