"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useServer } from "@/lib/providers/server";
import { FollowUserResponse } from "@/lib/server/community";
import { Loader2, UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Tab = "followers" | "following";

interface FollowListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  defaultTab?: Tab;
  followerCount: number;
  followingCount: number;
}

export function FollowListDialog({
  open,
  onOpenChange,
  userId,
  defaultTab = "followers",
  followerCount,
  followingCount,
}: FollowListDialogProps) {
  const { api } = useServer();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  const [followers, setFollowers] = useState<FollowUserResponse[]>([]);
  const [following, setFollowing] = useState<FollowUserResponse[]>([]);
  const [followersPage, setFollowersPage] = useState(1);
  const [followingPage, setFollowingPage] = useState(1);
  const [followersTotalPages, setFollowersTotalPages] = useState(1);
  const [followingTotalPages, setFollowingTotalPages] = useState(1);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  const pageSize = 20;

  const loadFollowers = useCallback(
    async (page: number) => {
      setLoadingFollowers(true);
      try {
        const res = await api.community.getFollowers(userId, { page, pageSize });
        setFollowers(res.users);
        setFollowersTotalPages(res.totalPages);
        setFollowersPage(res.page);
      } catch {
        // silently fail
      } finally {
        setLoadingFollowers(false);
      }
    },
    [api.community, userId],
  );

  const loadFollowing = useCallback(
    async (page: number) => {
      setLoadingFollowing(true);
      try {
        const res = await api.community.getFollowing(userId, { page, pageSize });
        setFollowing(res.users);
        setFollowingTotalPages(res.totalPages);
        setFollowingPage(res.page);
      } catch {
        // silently fail
      } finally {
        setLoadingFollowing(false);
      }
    },
    [api.community, userId],
  );

  // Reset and load when dialog opens or tab changes
  useEffect(() => {
    if (!open) return;
    if (activeTab === "followers") {
      loadFollowers(1);
    } else {
      loadFollowing(1);
    }
  }, [open, activeTab, loadFollowers, loadFollowing]);

  // Sync defaultTab when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);

  const extractUsername = (name: string) => {
    if (name.includes("@")) return name.split("@")[0];
    return name;
  };

  const renderUserList = (
    users: FollowUserResponse[],
    loading: boolean,
    page: number,
    totalPages: number,
    onPageChange: (p: number) => void,
  ) => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      );
    }

    if (users.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-8">
          <UserIcon className="text-muted-foreground h-10 w-10" />
          <p className="text-muted-foreground text-sm">No users to show</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        {users.map((user) => {
          const displayName = extractUsername(user.userName);
          return (
            <button
              key={user.userId}
              className="hover:bg-muted flex items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors"
              onClick={() => {
                onOpenChange(false);
                router.push(`/user/${user.userId}`);
              }}
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{displayName}</p>
              </div>
            </button>
          );
        })}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-2 flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              Previous
            </Button>
            <span className="text-muted-foreground text-sm">
              {page} / {totalPages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              Next
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
              <TabsList className="w-full">
                <TabsTrigger value="followers" className="flex-1">
                  Followers <span className="text-muted-foreground ml-1 text-xs">({followerCount})</span>
                </TabsTrigger>
                <TabsTrigger value="following" className="flex-1">
                  Following <span className="text-muted-foreground ml-1 text-xs">({followingCount})</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </DialogTitle>
        </DialogHeader>

        {activeTab === "followers"
          ? renderUserList(followers, loadingFollowers, followersPage, followersTotalPages, loadFollowers)
          : renderUserList(following, loadingFollowing, followingPage, followingTotalPages, loadFollowing)}
      </DialogContent>
    </Dialog>
  );
}
