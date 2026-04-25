"use client";

import { createFileRoute } from "@tanstack/react-router";
import TicketInterface from "#/components/ticket-interface";

export const Route = createFileRoute("/admin/support")({
  component: AdminSupportPage,
});

function AdminSupportPage() {
  return (
    <main className="flex h-full w-full items-center justify-center p-4">
      <TicketInterface isAdmin={true} />
    </main>
  );
}
