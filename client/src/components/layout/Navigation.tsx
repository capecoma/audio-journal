import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MicIcon, BarChart2, Menu, LogOut, User, Settings, Trophy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUser } from "@/hooks/use-user";
import type { UserContextType } from "@/types/auth";

export default function Navigation() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const { user, logout } = useUser() as UserContextType;

  const navItems = [
    { href: "/", label: "Dashboard", icon: BarChart2 },
    { href: "/journal", label: "Record", icon: MicIcon },
    { href: "/analytics", label: "Analytics", icon: BarChart2 },
    { href: "/achievements", label: "Achievements", icon: Trophy },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const NavContent = () => (
    <div className="space-y-2">
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}>
          <Button
            variant={location === href ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start text-base transition-all duration-200",
              location === href 
                ? "bg-primary/10 text-primary font-medium shadow-sm" 
                : "text-primary/60 hover:text-primary hover:bg-primary/5"
            )}
            onClick={() => setIsOpen(false)}
          >
            <Icon className="mr-3 h-5 w-5" />
            {label}
          </Button>
        </Link>
      ))}
    </div>
  );

  const UserDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary">
              {user?.username?.[0]?.toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.username}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {/* Fixed Top Navigation */}
      <header className="fixed top-0 left-0 right-0 h-12 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {isMobile ? (
              <Drawer open={isOpen} onOpenChange={setIsOpen}>
                <DrawerTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                  </Button>
                </DrawerTrigger>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Audio Journal</DrawerTitle>
                  </DrawerHeader>
                  <div className="px-4">
                    <NavContent />
                  </div>
                  <DrawerFooter>
                    <DrawerClose asChild>
                      <Button variant="outline">Close</Button>
                    </DrawerClose>
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
            ) : null}
            <h1 className="text-lg font-semibold">Audio Journal</h1>
          </div>
          {user && <UserDropdown />}
        </div>
      </header>

      {/* Desktop Side Navigation */}
      {!isMobile && (
        <aside className="fixed left-0 top-12 z-30 hidden h-[calc(100vh-3rem)] w-[240px] border-r border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:block">
          <div className="flex flex-col gap-2 p-4">
            <NavContent />
          </div>
        </aside>
      )}
    </>
  );
}