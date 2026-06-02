import { createFileRoute } from "@tanstack/react-router";

import TicketInterface from "#/components/ticket-interface";

function SupportPage() {
  return (
    <main className="flex h-full w-full items-center justify-center p-4">
      <TicketInterface isAdmin={false} />
    </main>
  );
}

export const Route = createFileRoute("/(platform)/support")({
  component: SupportPage,
});
