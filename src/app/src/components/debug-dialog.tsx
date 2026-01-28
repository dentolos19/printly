"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/providers/auth";
import { useServer } from "@/lib/providers/server";
import { BugIcon, RefreshCwIcon, ShuffleIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function DebugDialog() {
  const { claims, refreshAccess } = useAuth();
  const { api } = useServer();
  const [isOpen, setIsOpen] = useState(false);
  const [isTogglingRole, setIsTogglingRole] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);

  // if (process.env.NODE_ENV === "production") {
  //   return null;
  // }

  const handleToggleRole = async () => {
    try {
      setIsTogglingRole(true);
      const response = await api.auth.toggleRole();

      // Refresh access token to get updated role permissions
      await refreshAccess();

      toast.success(`Role toggled to: ${response.role}`);

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      toast.error("Failed to toggle role");
      console.error(error);
    } finally {
      setIsTogglingRole(false);
    }
  };

  const handleRefreshToken = async () => {
    try {
      setIsRefreshingToken(true);
      await refreshAccess();
      toast.success("Token refreshed successfully");
    } catch (error) {
      toast.error("Failed to refresh token");
      console.error(error);
    } finally {
      setIsRefreshingToken(false);
    }
  };

  const handleCopyToken = () => {
    const tokens = {
      accessToken: localStorage.getItem("accessToken"),
      refreshToken: localStorage.getItem("refreshToken"),
    };
    navigator.clipboard.writeText(JSON.stringify(tokens, null, 2));
    toast.success("Tokens copied to clipboard");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className="hover:bg-accent focus:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none">
          <BugIcon className="size-4" />
          <span>Debug Tools</span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BugIcon className="size-5" />
            Debug Tools
          </DialogTitle>
          <DialogDescription>Development debugging utilities for testing and development purposes.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs font-medium uppercase">User Information</Label>
            <div className="bg-muted rounded-md p-3 font-mono text-sm">
              <div className="grid gap-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">User ID:</span>
                  <span className="font-medium">{claims?.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{claims?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role:</span>
                  <span className="font-bold uppercase">{claims?.role}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-muted-foreground text-xs font-medium uppercase">Actions</Label>

            <div className="space-y-2">
              <Button
                onClick={handleToggleRole}
                disabled={isTogglingRole}
                variant="outline"
                className="w-full justify-start"
                size="sm"
              >
                <ShuffleIcon className="mr-2 size-4" />
                {isTogglingRole ? "Toggling Role..." : "Toggle User Role"}
              </Button>

              <Button
                onClick={handleRefreshToken}
                disabled={isRefreshingToken}
                variant="outline"
                className="w-full justify-start"
                size="sm"
              >
                <RefreshCwIcon className="mr-2 size-4" />
                {isRefreshingToken ? "Refreshing..." : "Refresh Access Token"}
              </Button>

              <Button onClick={handleCopyToken} variant="outline" className="w-full justify-start" size="sm">
                <svg
                  className="mr-2 size-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy Tokens to Clipboard
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950/20">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> These tools are only available in development mode and will be hidden in production
              builds.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
