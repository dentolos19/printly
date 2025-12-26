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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/providers/auth";
import {
  BellIcon,
  BookDashedIcon,
  BookIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MoreVerticalIcon,
  PackageIcon,
  UserIcon,
} from "lucide-react";
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
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild className={"data-[slot=sidebar-menu-button]:p-1.5!"}>
                <Link href={"/dashboard"} className={"flex items-center gap-2"}>
                  <img src={"/icon.png"} className={"size-5"} />
                  <span className={"text-base font-semibold"}>Printly</span>
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
                    <Link href={"/projects"}>
                      <BookIcon />
                      <span>Projects</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <Link href={"/templates"}>
                      <BookDashedIcon />
                      <span>Templates</span>
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
