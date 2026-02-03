"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/providers/auth";
import { useServer } from "@/lib/providers/server";
import { FollowStatusResponse, PostSummaryResponse, ReactionType } from "@/lib/server/community";
import { cn } from "@/lib/utils";
import { UserIcon, Loader2, CheckIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PostGrid } from "../../community/components";

interface UserProfile {
  id: string;
  username: string;
}

export default function UserProfilePage() {
  const { api } = useServer();
  const { claims } = useAuth();
  const params = useParams();
  const userId = params.userId as string;

  const [userPosts, setUserPosts] = useState<PostSummaryResponse[]>([]);
  const [followStatus, setFollowStatus] = useState<FollowStatusResponse | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  const loadUserData = useCallback(async () => {
    setLoading(true);
    try {
      const [posts, status, counts] = await Promise.all([
        api.community.getUserPosts(userId),
        api.community.getFollowStatus(userId),
        api.community.getFollowCounts(userId),
      ]);
      setUserPosts(posts);
      setFollowStatus(status);
      setFollowing(status.isFollowing);
      setFollowerCount(counts.followerCount);
      setFollowingCount(counts.followingCount);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load user profile");
    } finally {
      setLoading(false);
    }
  }, [userId, api.community]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleFollow = async () => {
    try {
      if (following) {
        await api.community.unfollow(userId);
        setFollowing(false);
      } else {
        await api.community.follow(userId);
        setFollowing(true);
      }
      await loadUserData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update follow status");
    }
  };

  const extractUsername = (email: string) => {
    if (email.includes("@")) {
      return email.split("@")[0];
    }
    return email;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const isOwnProfile = claims?.id === userId;
  const username = userPosts.length > 0 ? extractUsername(userPosts[0].authorName) : "User";

  return (
    <div className="bg-background min-h-screen">
      {/* Profile Header */}
      <div className="border-b">
        <div className="container mx-auto max-w-4xl space-y-6 p-6">
          {/* Profile Info */}
          <div className="flex gap-8">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <Avatar className="h-32 w-32 md:h-40 md:w-40">
                <AvatarFallback className="text-3xl">{username.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>

            {/* Profile Details */}
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <h1 className="text-2xl font-bold md:text-3xl">{username}</h1>
                  {!isOwnProfile && (
                    <Button onClick={handleFollow} variant={following ? "outline" : "default"} size="lg">
                      <CheckIcon className="mr-2 h-4 w-4" />
                      {following ? "Following" : "Follow"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-8">
                <div className="flex flex-col">
                  <span className="text-xl font-bold md:text-2xl">{userPosts.length}</span>
                  <span className="text-muted-foreground text-sm">Posts</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold md:text-2xl">{followerCount}</span>
                  <span className="text-muted-foreground text-sm">Followers</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold md:text-2xl">{followingCount}</span>
                  <span className="text-muted-foreground text-sm">Following</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Section */}
      <div className="container mx-auto max-w-4xl space-y-6 p-6">
        {userPosts.length > 0 ? (
          <PostGrid
            posts={userPosts}
            currentUserId={claims?.id}
            onReact={async (postId: string, reaction: ReactionType | null) => {
              try {
                if (reaction === null) {
                  await api.community.deleteReaction(postId);
                } else {
                  await api.community.createOrUpdateReaction({ postId, reactionType: reaction });
                }
                loadUserData();
              } catch (error) {
                toast.error("Failed to update reaction");
              }
            }}
            onBookmark={async (postId: string) => {
              try {
                await api.community.toggleBookmark(postId);
                loadUserData();
              } catch (error) {
                toast.error("Failed to update bookmark");
              }
            }}
            onComment={() => {
              toast.info("Comment feature coming soon");
            }}
            emptyTitle="No posts yet"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <UserIcon className="text-muted-foreground h-12 w-12" />
            <p className="text-muted-foreground text-lg">No posts yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
