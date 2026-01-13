"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CommunityStatsResponse } from "@/lib/server/community";

interface StatsCardProps {
  stats: CommunityStatsResponse | null;
  loading: boolean;
}

export function StatsCard({ stats, loading }: StatsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold">Community Stats</h3>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.totalPosts}</p>
          <p className="text-muted-foreground text-sm">Posts</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.totalComments}</p>
          <p className="text-muted-foreground text-sm">Comments</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.totalReactions}</p>
          <p className="text-muted-foreground text-sm">Reactions</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.totalUsers}</p>
          <p className="text-muted-foreground text-sm">Contributors</p>
        </div>
      </CardContent>
    </Card>
  );
}
