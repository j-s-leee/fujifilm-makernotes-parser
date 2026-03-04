import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
          <Link href="/login" className="mt-4 inline-block">
            <Button>Sign In</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
