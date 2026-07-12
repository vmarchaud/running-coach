import { redirectToNolioLogin } from "../../api/nolio";
import { Button } from "../shared/Button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  error?: string | null;
}

export function LoginScreen({ error }: Props) {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-6 gap-8">
      <Card className="bg-transparent ring-0 shadow-none w-full max-w-xs">
        <CardContent className="flex flex-col items-center gap-8 px-0">
          <div className="text-center">
            <div className="text-5xl mb-4">🏃</div>
            <h1 className="text-3xl font-bold">Running Coach</h1>
            <p className="text-neutral-400 mt-2 max-w-xs">
              Your semi-marathon training plan, synced with Nolio.
            </p>
          </div>

          <Button onClick={redirectToNolioLogin} size="lg" fullWidth className="max-w-xs">
            Continue with Nolio
          </Button>

          {error && (
            <p className="text-red-400 text-sm max-w-xs text-center">
              Sign-in failed ({error}). Please try again.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
