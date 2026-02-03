"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/providers/auth";
import { useServer } from "@/lib/providers/server";
import { UserProfileResponse } from "@/lib/server/user";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarIcon,
  CameraIcon,
  GlobeIcon,
  KeyIcon,
  Loader2,
  MailIcon,
  MapPinIcon,
  ShieldIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const profileSchema = z.object({
  displayName: z
    .string()
    .min(1, "Display name is required")
    .max(50, "Display name must be 50 characters or less")
    .nullable()
    .optional(),
  bio: z.string().max(500, "Bio must be 500 characters or less").nullable().optional(),
  location: z.string().max(100, "Location must be 100 characters or less").nullable().optional(),
  website: z.string().url("Must be a valid URL").or(z.literal("")).nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
});

const emailSchema = z.object({
  newEmail: z.string().min(1, "Email is required").email("Must be a valid email"),
  password: z.string().min(1, "Password is required"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type EmailForm = z.infer<typeof emailSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  const { api } = useServer();
  const { claims, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      location: "",
      website: "",
      dateOfBirth: "",
    },
  });

  const emailForm = useForm<EmailForm>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      newEmail: "",
      password: "",
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const fetchProfile = useCallback(async () => {
    try {
      const data = await api.user.getProfile();
      setProfile(data);
      profileForm.reset({
        displayName: data.displayName || "",
        bio: data.bio || "",
        location: data.location || "",
        website: data.website || "",
        dateOfBirth: data.dateOfBirth || "",
      });
    } catch (error) {
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  }, [api.user, profileForm]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleProfileSubmit = profileForm.handleSubmit(async (data) => {
    setIsSaving(true);
    try {
      const updated = await api.user.updateProfile({
        displayName: data.displayName || null,
        bio: data.bio || null,
        location: data.location || null,
        website: data.website || null,
        dateOfBirth: data.dateOfBirth || null,
      });
      setProfile(updated);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  });

  const handleEmailSubmit = emailForm.handleSubmit(async (data) => {
    setIsChangingEmail(true);
    try {
      await api.user.updateEmail({
        newEmail: data.newEmail,
        password: data.password,
      });
      toast.success("Email updated successfully. Please log in again.");
      logout();
      router.push("/auth");
    } catch (error) {
      toast.error("Failed to update email. Check your password.");
    } finally {
      setIsChangingEmail(false);
    }
  });

  const handlePasswordSubmit = passwordForm.handleSubmit(async (data) => {
    setIsChangingPassword(true);
    try {
      await api.user.updatePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success("Password updated successfully");
      passwordForm.reset();
    } catch (error) {
      toast.error("Failed to update password. Check your current password.");
    } finally {
      setIsChangingPassword(false);
    }
  });

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await api.user.deleteAccount();
      toast.success("Account deleted successfully");
      logout();
      router.push("/");
    } catch (error) {
      toast.error("Failed to delete account");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const asset = await api.asset.uploadAsset(file, "Profile avatar", "avatar");
      const updated = await api.user.updateProfile({ avatarId: asset.id });
      setProfile(updated);
      toast.success("Avatar updated successfully");
    } catch (error) {
      toast.error("Failed to upload avatar");
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getAvatarUrl = (avatarId: string | null) => {
    if (!avatarId) return undefined;
    return `/assets/${avatarId}/view`;
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="text-muted-foreground">Manage your profile, security, and account preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="gap-2">
            <UserIcon className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <ShieldIcon className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="danger" className="gap-2">
            <Trash2Icon className="h-4 w-4" />
            Danger Zone
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and how others see you on the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ProfileSkeleton />
              ) : (
                <Form {...profileForm}>
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <Avatar className="h-24 w-24">
                          <AvatarImage src={getAvatarUrl(profile?.avatarId || null)} />
                          <AvatarFallback className="text-xl">
                            {getInitials(profile?.displayName || null, profile?.email || "")}
                          </AvatarFallback>
                        </Avatar>
                        <input
                          ref={avatarInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarUpload}
                          disabled={isUploadingAvatar || isSaving}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="absolute -right-1 -bottom-1 h-8 w-8 rounded-full shadow-md"
                          onClick={() => avatarInputRef.current?.click()}
                          disabled={isUploadingAvatar || isSaving}
                        >
                          {isUploadingAvatar ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CameraIcon className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <p className="text-lg font-semibold">{profile?.displayName || profile?.email}</p>
                        <p className="text-muted-foreground text-sm">{profile?.email}</p>
                        <p className="text-muted-foreground text-xs">
                          Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A"}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <FormField
                        control={profileForm.control}
                        name="displayName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Display Name</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} placeholder="John Doe" disabled={isSaving} />
                            </FormControl>
                            <FormDescription>Your public display name</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={profileForm.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bio</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              value={field.value || ""}
                              placeholder="Tell us about yourself..."
                              className="min-h-24 resize-none"
                              disabled={isSaving}
                            />
                          </FormControl>
                          <FormDescription>Brief description about yourself (max 500 characters)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={profileForm.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <MapPinIcon className="h-4 w-4" />
                              Location
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                placeholder="San Francisco, CA"
                                disabled={isSaving}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <GlobeIcon className="h-4 w-4" />
                              Website
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ""}
                                placeholder="https://yourwebsite.com"
                                disabled={isSaving}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={profileForm.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem className="max-w-xs">
                          <FormLabel className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            Date of Birth
                          </FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} type="date" disabled={isSaving} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex justify-end">
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {profile?.hasPassword ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MailIcon className="h-5 w-5" />
                    Change Email
                  </CardTitle>
                  <CardDescription>
                    Update your email address. You will need to log in again after changing.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...emailForm}>
                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={emailForm.control}
                          name="newEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Email</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="email"
                                  placeholder="newemail@example.com"
                                  disabled={isChangingEmail}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={emailForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Current Password</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="password"
                                  placeholder="••••••••••••"
                                  disabled={isChangingEmail}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" disabled={isChangingEmail}>
                          {isChangingEmail ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            "Update Email"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyIcon className="h-5 w-5" />
                    Change Password
                  </CardTitle>
                  <CardDescription>Update your password to keep your account secure</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...passwordForm}>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      <FormField
                        control={passwordForm.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="password"
                                placeholder="••••••••••••"
                                disabled={isChangingPassword}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={passwordForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="password"
                                  placeholder="••••••••••••"
                                  disabled={isChangingPassword}
                                />
                              </FormControl>
                              <FormDescription>Must be at least 8 characters</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={passwordForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm New Password</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="password"
                                  placeholder="••••••••••••"
                                  disabled={isChangingPassword}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" disabled={isChangingPassword}>
                          {isChangingPassword ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            "Update Password"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldIcon className="h-5 w-5" />
                  Google Account
                </CardTitle>
                <CardDescription>Your account is linked to Google</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-muted-foreground text-sm">
                    You signed in with Google, so you don&apos;t have a password set for this account. Your email and
                    authentication are managed through your Google account.
                  </p>
                  <p className="text-muted-foreground mt-2 text-sm">
                    To change your email or password, please update your Google account settings directly.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="danger">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <Trash2Icon className="h-5 w-5" />
                Delete Account
              </CardTitle>
              <CardDescription>
                Permanently delete your account and all associated data. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-destructive/10 rounded-lg p-4">
                <h4 className="font-medium">Before you delete your account:</h4>
                <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-sm">
                  <li>All your designs and files will be permanently removed</li>
                  <li>Your order history will be deleted</li>
                  <li>You will lose access to any ongoing orders</li>
                  <li>Your followers and following connections will be removed</li>
                  <li>This action is irreversible</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive">Delete My Account</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. This will permanently delete your account and remove all your data
                      from our servers.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Yes, Delete My Account"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
