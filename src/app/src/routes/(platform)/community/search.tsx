"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckIcon, ClockIcon, LockIcon, SearchIcon, UserPlusIcon, UsersIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Skeleton } from "#/components/ui/skeleton";
import { useDebounce } from "#/hooks/use-debounce";
import { useAuth } from "#/lib/providers/auth";
import { useServer } from "#/lib/providers/server";
import type { UserSearchResponse } from "#/lib/server/community";

function UserSearchPage() {
  const { api } = useServer();
  const { claims } = useAuth();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);
  const [users, setUsers] = useState<UserSearchResponse[]>([]);
  const [suggested, setSuggested] = useState<UserSearchResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestedLoading, setSuggestedLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Load suggested users on mount
  useEffect(() => {
    const loadSuggested = async () => {
      setSuggestedLoading(true);
      try {
        const data = await api.community.getSuggestedUsers(10);
        setSuggested(Array.isArray(data) ? data : []);
      } catch {
        // ignore
      } finally {
        setSuggestedLoading(false);
      }
    };
    loadSuggested();
  }, [api.community]);

  // Search users when query changes
  const searchUsers = useCallback(async () => {
    if (!debouncedQuery.trim()) {
      setUsers([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.community.searchUsers(debouncedQuery, page, 20);
      setUsers(data.items ?? []);
      setTotalPages(data.totalPages ?? 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to search users");
    } finally {
      setLoading(false);
    }
  }, [api.community, debouncedQuery, page]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery]);

  useEffect(() => {
    searchUsers();
  }, [searchUsers]);

  const handleFollow = async (userId: string, isFollowing: boolean, hasPendingRequest: boolean) => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      if (isFollowing || hasPendingRequest) {
        await api.community.unfollow(userId);
        toast.success(isFollowing ? "Unfollowed" : "Request cancelled");
      } else {
        await api.community.follow(userId);
        toast.success("Follow request sent");
      }
      // Refresh lists
      if (debouncedQuery.trim()) {
        await searchUsers();
      }
      // Update suggested list locally
      setSuggested((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isFollowing: !isFollowing && !hasPendingRequest, hasPendingRequest: false } : u,
        ),
      );
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                isFollowing: !isFollowing && !hasPendingRequest && !u.isPrivate,
                hasPendingRequest: !isFollowing && !hasPendingRequest && u.isPrivate,
              }
            : u,
        ),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update follow");
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const extractUsername = (name: string) => {
    if (name.includes("@")) return name.split("@")[0];
    return name;
  };

  const renderUserCard = (user: UserSearchResponse) => {
    const isFollowing = "isFollowedByMe" in user ? (user as any).isFollowedByMe : user.isFollowing;
    const hasPending = user.hasPendingRequest ?? false;
    const isPrivate = user.isPrivate ?? false;

    return (
      <Card key={user.id}>
        <CardContent className="flex items-center gap-4 p-4">
          <Link params={{ userId: user.id }} to="/user/$userId">
            <Avatar className="h-12 w-12 cursor-pointer transition-opacity hover:opacity-80">
              <AvatarFallback className="text-lg">
                {extractUsername(user.userName).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link className="truncate font-semibold hover:underline" params={{ userId: user.id }} to="/user/$userId">
                {extractUsername(user.userName)}
              </Link>
              {isPrivate && <LockIcon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />}
            </div>
            <p className="text-muted-foreground text-sm">
              {user.followerCount} {user.followerCount === 1 ? "follower" : "followers"}
            </p>
          </div>

          <Button
            disabled={actionLoading[user.id]}
            onClick={() => handleFollow(user.id, isFollowing, hasPending)}
            size="sm"
            variant={isFollowing || hasPending ? "outline" : "default"}
          >
            {isFollowing ? (
              <>
                <CheckIcon className="mr-1.5 h-4 w-4" />
                Following
              </>
            ) : hasPending ? (
              <>
                <ClockIcon className="mr-1.5 h-4 w-4" />
                Requested
              </>
            ) : (
              <>
                <UserPlusIcon className="mr-1.5 h-4 w-4" />
                Follow
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  };

  const hasSearchQuery = debouncedQuery.trim().length > 0;

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="font-bold text-2xl">Find Users</h1>
        <p className="text-muted-foreground text-sm">Search for users to follow and connect with</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pr-9 pl-9"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username..."
          value={query}
        />
        {query && (
          <Button
            className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
            onClick={() => setQuery("")}
            size="icon"
            variant="ghost"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Results */}
      {hasSearchQuery && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Search Results</h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-9 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <UsersIcon className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No users found for &quot;{debouncedQuery}&quot;</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">{users.map(renderUserCard)}</div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} size="sm" variant="outline">
                    Previous
                  </Button>
                  <span className="text-muted-foreground text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    size="sm"
                    variant="outline"
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Suggested Users (shown when not searching) */}
      {!hasSearchQuery && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Suggested Users</h2>
          {suggestedLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-9 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : suggested.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <UsersIcon className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No suggestions right now</p>
            </div>
          ) : (
            <div className="space-y-3">{suggested.map(renderUserCard)}</div>
          )}
        </div>
      )}
    </div>
  );
}

export const Route = createFileRoute("/(platform)/community/search")({
  component: UserSearchPage,
});
