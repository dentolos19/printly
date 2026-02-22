"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/providers/auth";
import { useServer } from "@/lib/providers/server";
import {
  FollowStatusResponse,
  PostSummaryResponse,
  ProfileStatsResponse,
  ReactionType,
} from "@/lib/server/community";
import { cn } from "@/lib/utils";
import {
  BanIcon,
  CheckIcon,
  ClockIcon,
  EyeIcon,
  EyeOffIcon,
  HeartIcon,
  Loader2,
  LockIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
  SettingsIcon,
  Share2Icon,
  ShieldAlertIcon,
  UserCheckIcon,
  UserIcon,
  UserPlusIcon,
  UserXIcon,
  XIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PostDetailDialog, PostGrid } from "../../community/components";
import { FollowListDialog } from "./follow-list-dialog";
import { ManagedUsersCard } from "./managed-users-card";

export default function UserProfilePage() {
  const { api } = useServer();
  const { claims } = useAuth();
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;

  const [userPosts, setUserPosts] = useState<PostSummaryResponse[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<PostSummaryResponse[]>([]);
  const [followStatus, setFollowStatus] = useState<FollowStatusResponse | null>(null);
  const [profileStats, setProfileStats] = useState<ProfileStatsResponse | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [requestActionLoading, setRequestActionLoading] = useState(false);
  const [requestDismissed, setRequestDismissed] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [postDetailOpen, setPostDetailOpen] = useState(false);
  const [followListOpen, setFollowListOpen] = useState(false);
  const [followListTab, setFollowListTab] = useState<"followers" | "following">("followers");

  const loadUserData = useCallback(async () => {
    setLoading(true);
    try {
      const [posts, status, counts, stats] = await Promise.all([
        api.community.getUserPosts(userId),
        api.community.getFollowStatus(userId),
        api.community.getFollowCounts(userId),
        api.community.getProfileStats(userId).catch(() => null),
      ]);
      setUserPosts(posts);
      setFollowStatus(status);
      setFollowing(status.isFollowing);
      setFollowerCount(counts.followerCount);
      setFollowingCount(counts.followingCount);
      setProfileStats(stats);

      // Load pinned posts, block status, and mute status for non-own profiles
      if (claims?.id !== userId) {
        const [pinned, blockStatus, muteList] = await Promise.all([
          api.community.getPinnedPosts(userId).catch(() => []),
          api.community.getBlockStatus(userId).catch(() => ({ isBlocked: false, isBlockedBy: false })),
          api.community.getMutedUsers().catch(() => ({ users: [] })),
        ]);
        setPinnedPosts(pinned);
        setIsBlocked(blockStatus.isBlocked);
        setIsMuted(muteList.users.some((u) => u.userId === userId));
      } else {
        const pinned = await api.community.getPinnedPosts(userId).catch(() => []);
        setPinnedPosts(pinned);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load user profile");
    } finally {
      setLoading(false);
    }
  }, [userId, api.community, claims?.id]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const handleFollow = async () => {
    try {
      if (following) {
        await api.community.unfollow(userId);
        setFollowing(false);
      } else if (followStatus?.hasPendingRequest) {
        // Cancel pending request
        await api.community.unfollow(userId);
      } else {
        await api.community.follow(userId);
        // For private profiles, this creates a request rather than instant follow
        if (!followStatus?.isPrivate) {
          setFollowing(true);
        }
      }
      await loadUserData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update follow status");
    }
  };

  const handleMute = async () => {
    try {
      if (isMuted) {
        await api.community.unmuteUser(userId);
        setIsMuted(false);
        toast.success("User unmuted");
      } else {
        await api.community.muteUser(userId);
        setIsMuted(true);
        toast.success("User muted");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update mute status");
    }
  };

  const handleBlock = async () => {
    try {
      if (isBlocked) {
        await api.community.unblockUser(userId);
        setIsBlocked(false);
        toast.success("User unblocked");
      } else {
        await api.community.blockUser(userId);
        setIsBlocked(true);
        toast.success("User blocked");
      }
      await loadUserData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update block status");
    }
  };

  const handleTagClick = (tag: string) => {
    router.push(`/community/tags/${encodeURIComponent(tag)}`);
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
  const isPrivateAndNotFollowing = followStatus?.isPrivate && !isOwnProfile && !following;

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
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold md:text-3xl">{username}</h1>
                    {followStatus?.isPrivate && (
                      <LockIcon className="text-muted-foreground h-5 w-5" aria-label="Private account" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isOwnProfile && (
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => router.push("/user/settings")}
                      >
                        <SettingsIcon className="mr-2 h-4 w-4" />
                        Settings
                      </Button>
                    )}
                    {!isOwnProfile && (
                      <>
                        <Button
                          onClick={handleFollow}
                          variant={following || followStatus?.hasPendingRequest ? "outline" : "default"}
                          size="lg"
                        >
                          {following ? (
                            <>
                              <CheckIcon className="mr-2 h-4 w-4" />
                              Following
                            </>
                          ) : followStatus?.hasPendingRequest ? (
                            <>
                              <ClockIcon className="mr-2 h-4 w-4" />
                              Requested
                            </>
                          ) : (
                            <>
                              <UserPlusIcon className="mr-2 h-4 w-4" />
                              Follow
                            </>
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon">
                              <MoreHorizontalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleMute}>
                              {isMuted ? (
                                <>
                                  <EyeIcon className="mr-2 h-4 w-4" />
                                  Unmute
                                </>
                              ) : (
                                <>
                                  <EyeOffIcon className="mr-2 h-4 w-4" />
                                  Mute
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleBlock} className="text-destructive">
                              {isBlocked ? (
                                <>
                                  <UserXIcon className="mr-2 h-4 w-4" />
                                  Unblock
                                </>
                              ) : (
                                <>
                                  <BanIcon className="mr-2 h-4 w-4" />
                                  Block
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-8">
                <div className="flex flex-col">
                  <span className="text-xl font-bold md:text-2xl">{userPosts.length}</span>
                  <span className="text-muted-foreground text-sm">Posts</span>
                </div>
                <button
                  className="flex flex-col text-left hover:opacity-70 transition-opacity"
                  onClick={() => {
                    setFollowListTab("followers");
                    setFollowListOpen(true);
                  }}
                >
                  <span className="text-xl font-bold md:text-2xl">{followerCount}</span>
                  <span className="text-muted-foreground text-sm">Followers</span>
                </button>
                <button
                  className="flex flex-col text-left hover:opacity-70 transition-opacity"
                  onClick={() => {
                    setFollowListTab("following");
                    setFollowListOpen(true);
                  }}
                >
                  <span className="text-xl font-bold md:text-2xl">{followingCount}</span>
                  <span className="text-muted-foreground text-sm">Following</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Follow Request Banner */}
      {followStatus?.incomingRequestId && !requestDismissed && (
        <div className="border-b bg-blue-50 dark:bg-blue-950/30">
          <div className="container mx-auto flex max-w-4xl items-center gap-3 px-6 py-3">
            <UserPlusIcon className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            <p className="flex-1 text-sm font-medium">
              <span className="font-semibold">{username}</span> has requested to follow you
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={requestActionLoading}
                onClick={async () => {
                  setRequestActionLoading(true);
                  try {
                    await api.community.approveFollowRequest(followStatus.incomingRequestId!);
                    toast.success("Follow request approved");
                    await loadUserData();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to approve request");
                  } finally {
                    setRequestActionLoading(false);
                  }
                }}
              >
                <UserCheckIcon className="mr-1.5 h-4 w-4" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={requestActionLoading}
                onClick={async () => {
                  setRequestActionLoading(true);
                  try {
                    await api.community.rejectFollowRequest(followStatus.incomingRequestId!);
                    toast.success("Follow request declined");
                    await loadUserData();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Failed to decline request");
                  } finally {
                    setRequestActionLoading(false);
                  }
                }}
              >
                Decline
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setRequestDismissed(true)}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="container mx-auto max-w-4xl space-y-6 p-6">
        {/* Profile Stats Card */}
        {profileStats && !isPrivateAndNotFollowing && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Profile Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="flex items-center gap-2">
                  <EyeIcon className="text-muted-foreground h-4 w-4" />
                  <div>
                    <p className="text-lg font-bold">{profileStats.totalViews}</p>
                    <p className="text-muted-foreground text-xs">Views</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <HeartIcon className="text-muted-foreground h-4 w-4" />
                  <div>
                    <p className="text-lg font-bold">{profileStats.totalReactions}</p>
                    <p className="text-muted-foreground text-xs">Reactions</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MessageCircleIcon className="text-muted-foreground h-4 w-4" />
                  <div>
                    <p className="text-lg font-bold">{profileStats.totalComments}</p>
                    <p className="text-muted-foreground text-xs">Comments</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Share2Icon className="text-muted-foreground h-4 w-4" />
                  <div>
                    <p className="text-lg font-bold">{profileStats.totalShares}</p>
                    <p className="text-muted-foreground text-xs">Shares</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Muted & Blocked Users (own profile only) */}
        {isOwnProfile && <ManagedUsersCard />}

        {/* Pinned Posts */}
        {pinnedPosts.length > 0 && !isPrivateAndNotFollowing && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">📌 Pinned Posts</h3>
            <PostGrid
              posts={pinnedPosts}
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
              onComment={(postId: string) => {
                setSelectedPostId(postId);
                setPostDetailOpen(true);
              }}
              onTagClick={handleTagClick}
              emptyTitle="No pinned posts"
            />
          </div>
        )}

        {/* All Posts */}
        {followStatus?.isPrivate && !isOwnProfile && !following ? (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <LockIcon className="text-muted-foreground h-16 w-16" />
            <h3 className="text-xl font-semibold">This account is private</h3>
            <p className="text-muted-foreground text-center text-sm">
              Follow this account to see their posts.
            </p>
          </div>
        ) : userPosts.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Posts</h3>
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
              onComment={(postId: string) => {
                setSelectedPostId(postId);
                setPostDetailOpen(true);
              }}
              onTagClick={handleTagClick}
              emptyTitle="No posts yet"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <UserIcon className="text-muted-foreground h-12 w-12" />
            <p className="text-muted-foreground text-lg">No posts yet</p>
          </div>
        )}
      </div>

      <PostDetailDialog
        postId={selectedPostId}
        open={postDetailOpen}
        onOpenChange={setPostDetailOpen}
        onPostUpdated={loadUserData}
        onTagClick={handleTagClick}
      />

      <FollowListDialog
        open={followListOpen}
        onOpenChange={setFollowListOpen}
        userId={userId}
        defaultTab={followListTab}
        followerCount={followerCount}
        followingCount={followingCount}
      />
    </div>
  );
}

