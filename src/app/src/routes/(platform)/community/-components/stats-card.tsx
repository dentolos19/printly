"use client";

import { Card, CardContent, CardHeader } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";
import type { CommunityStatsResponse } from "#/lib/server/community";

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
            <Skeleton className="h-16" key={i} />
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
      <CardContent className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="font-bold text-2xl">{stats.totalPosts}</p>
          <p className="text-muted-foreground text-sm">Posts</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-2xl">{stats.totalComments}</p>
          <p className="text-muted-foreground text-sm">Comments</p>
        </div>
        <div className="text-center">
          <p className="font-bold text-2xl">{stats.totalReactions}</p>
          <p className="text-muted-foreground text-sm">Reactions</p>
        </div>
      </CardContent>
    </Card>
  );
}
