"use client";

import { useState } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Archive, ChevronDown } from "lucide-react";

interface ArchivedQuinielasSectionProps {
  count: number;
  children: React.ReactNode;
}

export default function ArchivedQuinielasSection({
  count,
  children,
}: ArchivedQuinielasSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-8">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/50">
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Archive className="h-4 w-4" />
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-semibold">Quinielas finalizadas</span>
            <span className="text-xs text-muted-foreground">
              Terminadas hace más de un mes
            </span>
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {count}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}
