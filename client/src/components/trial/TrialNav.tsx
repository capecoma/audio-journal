import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TrialNav() {
  const [location] = useLocation();

  const items = [
    { href: "/trial", label: "Trial Status" },
    { href: "/trial/analytics", label: "Analytics" },
  ];

  return (
    <div className="mb-8">
      <Link href="/">
        <a className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </a>
      </Link>
      
      <Card>
        <nav className="flex border-b">
          {items.map((item) => (
            <Link key={item.href} href={item.href}>
              <a
                className={cn(
                  "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                  location === item.href
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                {item.label}
              </a>
            </Link>
          ))}
        </nav>
      </Card>
    </div>
  );
}
