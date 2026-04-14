"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function DeleteChapitreButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Supprimer ce chapitre et tous ses tests ?")) return;
    setPending(true);
    try {
      const res = await fetch(`/api/chapitres/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        alert("Erreur lors de la suppression.");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Button variant="destructive" disabled={pending} onClick={handleDelete}>
      {pending ? "Suppression..." : "Supprimer"}
    </Button>
  );
}
