"use client";

import CopyJoinCodeButton from "./CopyJoinCodeButton";
import { toast } from "@/components/ui/use-toast";
import { useState } from "react";

interface ClickableJoinCodeProps {
  joinCode: string;
}

export default function ClickableJoinCode({
  joinCode,
}: ClickableJoinCodeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopied(true);
      toast({
        title: "Código copiado",
        description: "El código de unión ha sido copiado al portapapeles",
      });

      // Reset the copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error al copiar",
        description: "No se pudo copiar el código al portapapeles",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="group relative">
      <div
        className="cursor-pointer break-all rounded-lg bg-primary/10 px-3 py-2 text-center font-mono text-xl font-bold text-primary transition-colors hover:bg-primary/20 sm:px-4 sm:py-3 sm:text-2xl"
        onClick={handleCopy}
      >
        {joinCode}
      </div>
      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <CopyJoinCodeButton
          joinCode={joinCode}
          variant="inline"
          copied={copied}
        />
      </div>
    </div>
  );
}
