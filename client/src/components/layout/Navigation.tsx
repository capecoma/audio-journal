import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MicIcon, BarChart2, LogOut } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";

export default function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { href: "/", label: "Dashboard", icon: BarChart2 },
    { href: "/journal", label: "Record", icon: MicIcon },
    { href: "/analytics", label: "Analytics", icon: BarChart2 },
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 h-full w-[240px] border-r border-primary/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <ScrollArea className="h-full w-full">
        <div className="space-y-8 py-8">
          <div className="px-4">
            <h2 className="mb-2 px-2 text-xl font-semibold tracking-tight text-primary/90">
              Audio Journal
            </h2>
            {user && (
              <p className="px-2 text-sm text-muted-foreground mb-4">
                {user.name}
              </p>
            )}
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
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {label}
                  </Button>
                </Link>
              ))}

              <Button
                variant="ghost"
                onClick={logout}
                className="w-full justify-start text-base text-primary/60 hover:text-primary hover:bg-primary/5"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}