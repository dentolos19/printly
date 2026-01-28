"use client";

import TicketInterface from "@/components/support/ticket-interface";

export default function AdminSupportPage() {
  return (
    <main className="flex h-full w-full items-center justify-center p-4">
      <TicketInterface isAdmin={true} />
    </main>
  );
}
