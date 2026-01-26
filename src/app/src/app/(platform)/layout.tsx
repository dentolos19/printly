"use client";

import AccessDenied from "@/components/access-denied";
import { ChatbotWidget } from "@/components/chatbot-widget";
import DebugDialog from "@/components/debug-dialog";
import { NotificationBell } from "@/components/notification-bell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/providers/auth";
import {
  BellIcon,
  BookIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MessageCircleIcon,
  MoreVerticalIcon,
  PackageIcon,
  ShieldIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

function NestedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isMobile, state } = useSidebar();
  const { claims, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <>
      <Sidebar collapsible={"icon"}>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                    <img src="/icon.png" className="size-6" />
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
                    <Link href={"/dashboard"}>
                      <LayoutDashboardIcon />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href={"/library"}>
                      <BookIcon />
                      <span>Library</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href={"/orders"}>
                      <PackageIcon />
                      <span>Orders</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href={"/community"}>
                      <UsersIcon />
                      <span>Community</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href={"/chat"}>
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
                    size={"lg"}
                    className={"data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"}
                  >
                    <Avatar className={"h-8 w-8 rounded-lg"}>
                      <AvatarImage src={"/assets/profile.png"} alt={"Avatar"} />
                      <AvatarFallback className={"rounded-lg"}>X</AvatarFallback>
                    </Avatar>
                    <div className={"grid flex-1 text-left text-sm leading-tight"}>
                      <span className={"truncate font-medium"}>{claims?.role}</span>
                      <span className={"text-muted-foreground truncate text-xs"}>{claims?.email}</span>
                    </div>
                    <MoreVerticalIcon className={"ml-auto size-4"} />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className={"w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"}
                  side={isMobile ? "bottom" : "right"}
                  align={"end"}
                  sideOffset={4}
                >
                  <DropdownMenuLabel className={"p-0 font-normal"}>
                    <div className={"flex items-center gap-2 px-1 py-1.5 text-left text-sm"}>
                      <Avatar className={"h-8 w-8 rounded-lg"}>
                        <AvatarImage src={"/assets/profile.png"} alt={"Avatar"} />
                        <AvatarFallback className={"rounded-lg"}>X</AvatarFallback>
                      </Avatar>
                      <div className={"grid flex-1 text-left text-sm leading-tight"}>
                        <span className={"truncate font-medium"}>{claims?.role}</span>
                        <span className={"text-muted-foreground truncate text-xs"}>{claims?.email}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href={"/account"}>
                        <UserIcon />
                        <span>Account</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={"/notifications"}>
                        <BellIcon />
                        <span>Notifications</span>
                      </Link>
                    </DropdownMenuItem>
                    {claims?.role.toLowerCase() === "admin" && (
                      <DropdownMenuItem asChild>
                        <Link href={"/admin"}>
                          <ShieldIcon />
                          <span>Administration</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  {process.env.NODE_ENV !== "production" && (
                    <>
                      <DebugDialog />
                      <DropdownMenuSeparator />
                    </>
                  )}
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
        <header className="bg-sidebar flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-2">
            <NotificationBell />
          </div>
        </header>
        <div className="flex flex-1 flex-col overflow-hidden">
          <ScrollArea className="h-full">
            <main className="bg-background flex-1 p-4">{children}</main>
          </ScrollArea>
        </div>
      </SidebarInset>
      <ChatbotWidget />
    </>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { claims } = useAuth();

  if (!claims) {
    return <AccessDenied className={"h-dvh"} />;
  }

  return (
    <SidebarProvider>
      <NestedLayout>{children}</NestedLayout>
    </SidebarProvider>
  );
}
