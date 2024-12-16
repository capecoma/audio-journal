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
  ];

  return (
    <aside className="fixed left-0 top-0 z-40 h-full w-[240px] border-r border-primary/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <ScrollArea className="h-full w-full">
        <div className="space-y-8 py-8">
          <div className="px-4">
            <h2 className="mb-6 px-2 text-xl font-semibold tracking-tight text-primary/90">
              Audio Journal
            </h2>
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
            </div>
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}
