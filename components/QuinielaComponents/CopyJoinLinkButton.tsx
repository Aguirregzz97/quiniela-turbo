"use client";

import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";

interface CopyJoinLinkButtonProps {
  joinCode: string;
}

export default function CopyJoinLinkButton({
  joinCode,
}: CopyJoinLinkButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/quinielas/join/${joinCode}`;
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      toast({
        title: "Enlace copiado",
        description: "El enlace de unión ha sido copiado al portapapeles",
      });

      // Reset the copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error al copiar",
        description: "No se pudo copiar el enlace al portapapeles",
        variant: "destructive",
      });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="shrink-0"
    >
      {copied ? (
        <>
          <Check className="mr-2 h-4 w-4 text-green-600" />
          Copiado
        </>
      ) : (
        <>
          <Copy className="mr-2 h-4 w-4 text-orange-500" />
          Copiar Enlace
        </>
      )}
    </Button>
  );
}
