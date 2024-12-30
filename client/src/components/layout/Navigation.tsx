import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MicIcon, BarChart2, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function Navigation() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { href: "/", label: "Dashboard", icon: BarChart2 },
    { href: "/journal", label: "Record", icon: MicIcon },
    { href: "/analytics", label: "Analytics", icon: BarChart2 },
  ];

  return (
    <>
      {/* Fixed Top Navigation */}
      <header className="fixed top-0 left-0 right-0 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="container h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[240px] p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle className="text-lg">Audio Journal</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-2 p-4">
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
              </SheetContent>
            </Sheet>
            <span className="text-lg font-semibold">Audio Journal</span>
          </div>
        </div>
      </header>

      {/* Desktop Side Navigation */}
      <aside className="fixed left-0 top-14 z-30 hidden h-[calc(100vh-3.5rem)] w-[240px] border-r border-primary/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:block">
        <div className="flex flex-col gap-2 p-4">
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
      </aside>
    </>
  );
}