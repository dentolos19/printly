"use client";

import AccessDenied from "@/components/access-denied";
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
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/providers/auth";
import { BellIcon, LayoutDashboardIcon, LogOutIcon, MoreVerticalIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReactNode } from "react";

function NestedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { claims, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <>
      <Sidebar>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
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
                    <Avatar className={"h-8 w-8 rounded-lg grayscale"}>
                      {/* TODO: Add avatar */}
                      <AvatarImage src={""} alt={"Avatar"} />
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
                        {/* TODO: Add avatar */}
                        <AvatarImage src={""} alt={"Avatar"} />
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
                    <DropdownMenuItem>
                      <UserIcon />
                      <span>Account</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <BellIcon />
                      <span>Notifications</span>
                    </DropdownMenuItem>
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
      {children}
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
