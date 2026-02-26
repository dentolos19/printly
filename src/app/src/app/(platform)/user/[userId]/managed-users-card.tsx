"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useServer } from "@/lib/providers/server";
import type { BlockedUserResponse, MutedUserResponse } from "@/lib/server/community";
import { BanIcon, EyeOffIcon, Loader2, UserIcon, UserXIcon, VolumeXIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export function ManagedUsersCard() {
  const { api } = useServer();
  const router = useRouter();

  const [mutedUsers, setMutedUsers] = useState<MutedUserResponse[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserResponse[]>([]);
  const [loadingMuted, setLoadingMuted] = useState(false);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [activeTab, setActiveTab] = useState("muted");

  const loadMuted = useCallback(async () => {
    setLoadingMuted(true);
    try {
      const res = await api.community.getMutedUsers();
      setMutedUsers(res.users);
    } catch {
      // silently fail
    } finally {
      setLoadingMuted(false);
    }
  }, [api.community]);

  const loadBlocked = useCallback(async () => {
    setLoadingBlocked(true);
    try {
      const res = await api.community.getBlockedUsers();
      setBlockedUsers(res.users);
    } catch {
      // silently fail
    } finally {
      setLoadingBlocked(false);
    }
  }, [api.community]);

  useEffect(() => {
    if (activeTab === "muted") {
      loadMuted();
    } else {
      loadBlocked();
    }
  }, [activeTab, loadMuted, loadBlocked]);

  const extractUsername = (name: string) => {
    if (name.includes("@")) return name.split("@")[0];
    return name;
  };

  const handleUnmute = async (userId: string) => {
    try {
      await api.community.unmuteUser(userId);
      toast.success("User unmuted");
      setMutedUsers((prev) => prev.filter((u) => u.userId !== userId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unmute user");
    }
  };

  const handleUnblock = async (userId: string) => {
    try {
      await api.community.unblockUser(userId);
      toast.success("User unblocked");
      setBlockedUsers((prev) => prev.filter((u) => u.userId !== userId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unblock user");
    }
  };

  const renderEmpty = (label: string) => (
    <div className="flex flex-col items-center justify-center gap-2 py-8">
      <UserIcon className="text-muted-foreground h-10 w-10" />
      <p className="text-muted-foreground text-sm">No {label} users</p>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Managed Users</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="muted" className="flex-1">
              <VolumeXIcon className="mr-1.5 h-3.5 w-3.5" />
              Muted
              {mutedUsers.length > 0 && (
                <span className="text-muted-foreground ml-1 text-xs">({mutedUsers.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="blocked" className="flex-1">
              <BanIcon className="mr-1.5 h-3.5 w-3.5" />
              Blocked
              {blockedUsers.length > 0 && (
                <span className="text-muted-foreground ml-1 text-xs">({blockedUsers.length})</span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="muted" className="mt-3">
            {loadingMuted ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : mutedUsers.length === 0 ? (
              renderEmpty("muted")
            ) : (
              <div className="flex flex-col gap-1">
                {mutedUsers.map((user) => {
                  const displayName = extractUsername(user.userName);
                  return (
                    <div key={user.userId} className="flex items-center gap-3 rounded-md px-3 py-2.5">
                      <button
                        className="flex min-w-0 flex-1 items-center gap-3 text-left transition-opacity hover:opacity-70"
                        onClick={() => router.push(`/user/${user.userId}`)}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-sm">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm font-medium">{displayName}</span>
                      </button>
                      <Button variant="outline" size="sm" onClick={() => handleUnmute(user.userId)}>
                        <EyeOffIcon className="mr-1.5 h-3.5 w-3.5" />
                        Unmute
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="blocked" className="mt-3">
            {loadingBlocked ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : blockedUsers.length === 0 ? (
              renderEmpty("blocked")
            ) : (
              <div className="flex flex-col gap-1">
                {blockedUsers.map((user) => {
                  const displayName = extractUsername(user.userName);
                  return (
                    <div key={user.userId} className="flex items-center gap-3 rounded-md px-3 py-2.5">
                      <button
                        className="flex min-w-0 flex-1 items-center gap-3 text-left transition-opacity hover:opacity-70"
                        onClick={() => router.push(`/user/${user.userId}`)}
                      >
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-sm">{displayName.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm font-medium">{displayName}</span>
                      </button>
                      <Button variant="outline" size="sm" onClick={() => handleUnblock(user.userId)}>
                        <UserXIcon className="mr-1.5 h-3.5 w-3.5" />
                        Unblock
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
