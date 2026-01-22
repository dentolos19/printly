"use client";

import { useAuth } from "@/lib/providers/auth";
import { useServer } from "@/lib/providers/server";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

export default function DebugRoleToggle() {
  const { claims } = useAuth();
  const { server } = useServer();
  const [isLoading, setIsLoading] = useState(false);

  if (!claims) return null;

  const handleToggleRole = async () => {
    try {
      setIsLoading(true);
      const response = await server.auth.toggleRole();
      
      toast.success(`Role toggled to: ${response.role}`);
      
      // Reload the page to refresh the token and get the new role
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast.error("Failed to toggle role");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-gray-900 text-white rounded-lg shadow-lg border border-gray-700 z-50">
      <div className="text-sm font-semibold mb-2">🔧 Debug: Role Toggle</div>
      <div className="text-xs mb-2">Current Role: <span className="font-bold uppercase">{claims.role}</span></div>
      <Button
        onClick={handleToggleRole}
        disabled={isLoading}
        size="sm"
        variant="outline"
        className="text-xs"
      >
        {isLoading ? "Toggling..." : "Toggle Role"}
      </Button>
    </div>
  );
}
