import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MicIcon, BarChart2, Crown } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: BarChart2 },
    { href: "/journal", label: "Record", icon: MicIcon },
    { href: "/trial", label: "Trial Status", icon: Crown },
  ];

  return (
    <aside className="fixed left-0 top-0 z-30 h-full w-[200px] border-r bg-sidebar shadow-sm">
      <ScrollArea className="h-full w-full">
        <div className="space-y-6 py-6">
          <div className="px-3">
            <h2 className="mb-4 px-4 text-lg font-semibold tracking-tight text-sidebar-foreground">
              Audio Journal
            </h2>
            <div className="space-y-1">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}>
                  <Button
                    variant={location === href ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start transition-all duration-200 hover:bg-sidebar-accent/80",
                      location === href ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : "text-muted-foreground hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
