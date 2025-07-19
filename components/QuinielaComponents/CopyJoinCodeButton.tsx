"use client";

import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface CopyJoinCodeButtonProps {
  joinCode: string;
  variant?: "default" | "inline";
  className?: string;
  copied?: boolean;
}

export default function CopyJoinCodeButton({
  joinCode,
  variant = "default",
  className,
  copied: externalCopied,
}: CopyJoinCodeButtonProps) {
  const [internalCopied, setInternalCopied] = useState(false);

  // Use external copied state if provided, otherwise use internal state
  const isCopied =
    externalCopied !== undefined ? externalCopied : internalCopied;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinCode);

      if (externalCopied === undefined) {
        // Only manage internal state if external state is not provided
        setInternalCopied(true);
        setTimeout(() => setInternalCopied(false), 2000);
      }

      toast({
        title: "Código copiado",
        description: "El código de unión ha sido copiado al portapapeles",
      });
    } catch (error) {
      toast({
        title: "Error al copiar",
        description: "No se pudo copiar el código al portapapeles",
        variant: "destructive",
      });
    }
  };

  if (variant === "inline") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className={cn(
          "h-auto p-2 transition-colors hover:bg-primary/20",
          className,
        )}
      >
        {isCopied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4 text-primary" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className={cn("shrink-0", className)}
    >
      {isCopied ? (
        <>
          <Check className="mr-2 h-4 w-4" />
          Copiado
        </>
      ) : (
        <>
          <Copy className="mr-2 h-4 w-4" />
          Copiar
        </>
      )}
    </Button>
  );
}
