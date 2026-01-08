"use client";

import AccessDenied from "@/components/access-denied";
import { ChatbotWidget } from "@/components/chatbot-widget";
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
import { cn } from "@/lib/utils";
import {
  BellIcon,
  BookIcon,
  ImageIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MessageCircleIcon,
  MoreVerticalIcon,
  PackageIcon,
  UserIcon,
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
        <SidebarHeader
          className={cn(
            "h-14 flex-row items-center justify-between border-b",
            state === "collapsed" && "justify-center",
            state === "expanded" && "px-4",
          )}
        >
          <Link href="/" className="flex items-center gap-2">
            <img src={"/icon.png"} className={"size-6"} />
            <h1 className={cn("font-mono text-lg font-bold", state === "collapsed" && "hidden")}>Printly</h1>
          </Link>
          <NotificationBell className={cn(state === "collapsed" && "hidden")} />
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
                    <Link href={"/designs"}>
                      <BookIcon />
                      <span>Designs</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href={"/assets"}>
                      <ImageIcon />
                      <span>Assets</span>
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
                    {claims?.role === "admin" && (
                      <DropdownMenuItem asChild>
                        <Link href={"/admin"}>
                          <BellIcon />
                          <span>Administration</span>
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
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
      <SidebarInset>
        <header className={"bg-sidebar flex h-14 shrink-0 items-center gap-2 border-b px-4"}>
          <SidebarTrigger />
        </header>
        <main className={"bg-background flex-1 overflow-auto"}>{children}</main>
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
