"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useServer } from "@/lib/providers/server";
import { AdminOverviewStatsResponse, AdminTrendingTagResponse, AdminUserResponse } from "@/lib/server/community";
import {
  AlertTriangleIcon,
  BanIcon,
  FlagIcon,
  HashIcon,
  Loader2,
  MessageCircleIcon,
  SearchIcon,
  ShieldCheckIcon,
  ThumbsUpIcon,
  TrendingUpIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value: number;
  icon: React.ElementType<{ className?: string }>;
  color: string;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`size-4 ${color}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminCommunityPage() {
  const { api } = useServer();
  const [stats, setStats] = useState<AdminOverviewStatsResponse | null>(null);
  const [trendingTags, setTrendingTags] = useState<AdminTrendingTagResponse[]>([]);
  const [users, setUsers] = useState<AdminUserResponse[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTags, setLoadingTags] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);

  // Ban dialog
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banTarget, setBanTarget] = useState<AdminUserResponse | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banning, setBanning] = useState(false);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await api.community.getAdminOverviewStats();
      setStats(data);
    } catch (error) {
      toast.error("Failed to load community stats");
      console.error(error);
    } finally {
      setLoadingStats(false);
    }
  }, [api.community]);

  const loadTrendingTags = useCallback(async () => {
    setLoadingTags(true);
    try {
      const data = await api.community.getAdminTrendingTags(10);
      setTrendingTags(data);
    } catch (error) {
      console.error("Failed to load trending tags:", error);
    } finally {
      setLoadingTags(false);
    }
  }, [api.community]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = await api.community.getAdminUsers({
        page: userPage,
        pageSize: 10,
        searchTerm: userSearch || undefined,
      });
      setUsers(data.users);
      setUserTotalPages(data.totalPages);
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setLoadingUsers(false);
    }
  }, [api.community, userPage, userSearch]);

  useEffect(() => {
    loadStats();
    loadTrendingTags();
  }, [loadStats, loadTrendingTags]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleBan = async () => {
    if (!banTarget || !banReason.trim()) return;
    setBanning(true);
    try {
      await api.community.banUser(banTarget.id, banReason.trim());
      toast.success(`User ${banTarget.userName} has been banned`);
      setBanDialogOpen(false);
      setBanTarget(null);
      setBanReason("");
      loadUsers();
      loadStats();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to ban user");
    } finally {
      setBanning(false);
    }
  };

  const handleUnban = async (user: AdminUserResponse) => {
    try {
      await api.community.unbanUser(user.id);
      toast.success(`User ${user.userName} has been unbanned`);
      loadUsers();
      loadStats();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unban user");
    }
  };

  const statCards = [
    { title: "Total Users", value: stats?.totalUsers ?? 0, icon: UsersIcon, color: "text-blue-500" },
    { title: "Total Posts", value: stats?.totalPosts ?? 0, icon: MessageCircleIcon, color: "text-green-500" },
    { title: "Total Comments", value: stats?.totalComments ?? 0, icon: MessageCircleIcon, color: "text-purple-500" },
    { title: "Total Reactions", value: stats?.totalReactions ?? 0, icon: ThumbsUpIcon, color: "text-yellow-500" },
    { title: "Reports", value: stats?.totalReports ?? 0, icon: FlagIcon, color: "text-orange-500" },
    { title: "Flagged Posts", value: stats?.flaggedPosts ?? 0, icon: AlertTriangleIcon, color: "text-red-500" },
    { title: "Banned Users", value: stats?.bannedUsers ?? 0, icon: BanIcon, color: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Community Management</h1>
        <p className="text-muted-foreground">Manage community content, users, and moderation</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} loading={loadingStats} />
        ))}
      </div>

      {/* Trending Tags & User Management */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trending Tags Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUpIcon className="h-5 w-5" />
              Trending Tags
            </CardTitle>
            <CardDescription>Most popular tags by post count</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTags ? (
              <Skeleton className="h-[250px] w-full" />
            ) : trendingTags.length === 0 ? (
              <div className="text-muted-foreground flex h-[250px] items-center justify-center">No tags yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={trendingTags}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="postCount" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Total Posts" />
                  <Bar dataKey="recentPostCount" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Recent Posts" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5" />
              Moderation
            </CardTitle>
            <CardDescription>Quick access to moderation tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
                <CardContent className="flex items-center gap-3 p-4">
                  <FlagIcon className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="font-medium">Reports</p>
                    <p className="text-muted-foreground text-xs">{stats?.totalReports ?? 0} total</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
                <CardContent className="flex items-center gap-3 p-4">
                  <AlertTriangleIcon className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="font-medium">Flagged Content</p>
                    <p className="text-muted-foreground text-xs">{stats?.flaggedPosts ?? 0} posts</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
                <CardContent className="flex items-center gap-3 p-4">
                  <BanIcon className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium">Banned Users</p>
                    <p className="text-muted-foreground text-xs">{stats?.bannedUsers ?? 0} users</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
                <CardContent className="flex items-center gap-3 p-4">
                  <HashIcon className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Tags</p>
                    <p className="text-muted-foreground text-xs">{trendingTags.length} trending</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>Search and manage community users</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(1);
                }}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Posts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-muted-foreground text-center">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.userName}</TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>{user.postCount}</TableCell>
                      <TableCell>
                        {user.isBanned ? (
                          <Badge variant="destructive">Banned</Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.isBanned ? (
                          <Button variant="outline" size="sm" onClick={() => handleUnban(user)}>
                            Unban
                          </Button>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setBanTarget(user);
                              setBanDialogOpen(true);
                            }}
                          >
                            Ban
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {userTotalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={userPage <= 1} onClick={() => setUserPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-muted-foreground text-sm">
                Page {userPage} of {userTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={userPage >= userTotalPages}
                onClick={() => setUserPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
            <DialogDescription>
              Are you sure you want to ban <strong>{banTarget?.userName}</strong>? They will not be able to post,
              comment, or interact with the community.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason for ban</Label>
              <Textarea
                placeholder="Explain why this user is being banned..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBan} disabled={!banReason.trim() || banning}>
              {banning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
