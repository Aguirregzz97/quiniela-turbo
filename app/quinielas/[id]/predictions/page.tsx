import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Dices } from "lucide-react";
import Link from "next/link";

interface PredictionsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function PredictionsPage({
  params,
}: PredictionsPageProps) {
  const { id } = await params;

  const session = await auth();

  if (!session) {
    redirect(`/api/auth/signin?callbackUrl=/quinielas/${id}/predictions`);
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      {/* Header with back button */}
      <div className="mb-6">
        <div className="mb-4">
          <Button variant="ghost" asChild>
            <Link className="pl-0" href={`/quinielas/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Quiniela
            </Link>
          </Button>
        </div>

        <div className="flex items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl">
            <Dices className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Registrar Pronósticos
            </h1>
          </div>
        </div>
      </div>

      {/* Predictions content will be implemented here */}
    </div>
  );
}
