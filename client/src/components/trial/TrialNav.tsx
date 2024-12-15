import { Link, useLocation } from "wouter";
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

export default function TrialNav() {
  const [location] = useLocation();

  const items = [
    { href: "/trial", label: "Trial Status" },
    { href: "/trial/analytics", label: "Analytics" },
  ];

  return (
    <NavigationMenu className="mb-8">
      <NavigationMenuList>
        {items.map((item) => (
          <NavigationMenuItem key={item.href}>
            <Link href={item.href}>
              <NavigationMenuLink
                className={cn(
                  "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                  location === item.href && "bg-accent text-accent-foreground"
                )}
              >
                {item.label}
              </NavigationMenuLink>
            </Link>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}
