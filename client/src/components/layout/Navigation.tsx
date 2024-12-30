import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MicIcon, BarChart2, Menu, LogOut } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUser } from "@/hooks/use-user";

export default function Navigation() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const { user, logout } = useUser();

  const navItems = [
    { href: "/", label: "Dashboard", icon: BarChart2 },
    { href: "/journal", label: "Record", icon: MicIcon },
    { href: "/analytics", label: "Analytics", icon: BarChart2 },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const NavContent = () => (
    <div className="flex flex-col gap-2">
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

  return (
    <>
      {/* Fixed Top Navigation */}
      <header className="fixed top-0 left-0 right-0 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
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
            <span className="text-lg font-semibold">Audio Journal</span>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline-block">
                  {user.username}
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline-block">Logout</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Desktop Side Navigation */}
      {!isMobile && (
        <aside className="fixed left-0 top-14 z-30 hidden h-[calc(100vh-3.5rem)] w-[240px] border-r border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:block">
          <div className="flex flex-col gap-2 p-4">
            <NavContent />
          </div>
        </aside>
      )}
    </>
  );
}