"use client";

import { ConversationProvider } from "@elevenlabs/react";
import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import {
  BellIcon,
  BookIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MessageCircleIcon,
  MonitorIcon,
  MoonIcon,
  MoreVerticalIcon,
  PackageIcon,
  PaletteIcon,
  SearchIcon,
  ShieldIcon,
  SunIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import AccessDenied from "#/components/access-denied";
import { ChatbotWidget } from "#/components/chatbot-widget";
import DebugDialog from "#/components/debug-dialog";
import { NotificationBell } from "#/components/notification-bell";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "#/components/ui/sidebar";
import { useAuth } from "#/lib/providers/auth";

export const Route = createFileRoute("/(platform)")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        throw redirect({ to: "/auth" });
      }
    }
  },
  component: PlatformLayout,
});

function NestedLayout() {
  const navigate = useNavigate();
  const { isMobile } = useSidebar();
  const { claims, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg">
                <Link to="/">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                    <img alt="Printly" className="size-6" src="/icon.png" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-bold">Printly</span>
                    <span className="truncate text-xs">Customer</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/dashboard">
                      <LayoutDashboardIcon />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/library">
                      <BookIcon />
                      <span>Library</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/orders">
                      <PackageIcon />
                      <span>Orders</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/community">
                      <UsersIcon />
                      <span>Community</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/community/search">
                      <SearchIcon />
                      <span>Find Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link to="/chat">
                      <MessageCircleIcon />
                      <span>Chat</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    size="lg"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage alt="Avatar" src="/assets/profile.png" />
                      <AvatarFallback className="rounded-lg">X</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{claims?.role}</span>
                      <span className="truncate text-muted-foreground text-xs">{claims?.email}</span>
                    </div>
                    <MoreVerticalIcon className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage alt="Avatar" src="/assets/profile.png" />
                        <AvatarFallback className="rounded-lg">X</AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{claims?.role}</span>
                        <span className="truncate text-muted-foreground text-xs">{claims?.email}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {claims?.role.toLowerCase() === "admin" && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/admin">
                          <ShieldIcon />
                          <span>Administration</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link to="/account">
                        <UserIcon />
                        <span>Account</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/notifications">
                        <BellIcon />
                        <span>Notifications</span>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuGroup>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <PaletteIcon />
                        <span>Theme</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => setTheme("light")}>
                          <SunIcon />
                          <span>Light</span>
                          {theme === "light" && <span className="ml-auto">✓</span>}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("dark")}>
                          <MoonIcon />
                          <span>Dark</span>
                          {theme === "dark" && <span className="ml-auto">✓</span>}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("system")}>
                          <MonitorIcon />
                          <span>System</span>
                          {theme === "system" && <span className="ml-auto">✓</span>}
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuGroup>
                  <DebugDialog />
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOutIcon />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="h-svh overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-sidebar px-4">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>
        <div className="flex flex-1 flex-col overflow-hidden">
          <main className="flex-1 overflow-auto bg-background p-4">
            <Outlet />
          </main>
        </div>
      </SidebarInset>
      <ConversationProvider>
        <ChatbotWidget />
      </ConversationProvider>
    </>
  );
}

function PlatformLayout() {
  const { claims, isInitialized } = useAuth();

  if (!isInitialized) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-muted-foreground text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!claims) {
    return <AccessDenied className="h-dvh" />;
  }

  return (
    <SidebarProvider>
      <NestedLayout />
    </SidebarProvider>
  );
}
