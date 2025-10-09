import { Moon, Sun, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./ThemeProvider";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import logoDark from "@assets/PhuketRadar_1759933943849.png";

const categories = [
  { name: "All News", path: "/" },
  { name: "Breaking", path: "/category/breaking" },
  { name: "Tourism", path: "/category/tourism" },
  { name: "Business", path: "/category/business" },
  { name: "Events", path: "/category/events" },
];

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-header backdrop-blur-lg">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center hover-elevate rounded-lg px-3 py-2" data-testid="link-home">
            <img 
              src={logoDark} 
              alt="Phuket Radar" 
              className="h-16 w-auto"
            />
          </Link>

          <nav className="hidden md:flex items-center space-x-1">
            {categories.map((cat) => (
              <Link key={cat.path} href={cat.path}>
                <Button
                  variant="ghost"
                  className={`text-header-foreground hover:text-header-foreground ${location === cat.path ? "bg-black/20" : ""}`}
                  data-testid={`link-${cat.name.toLowerCase().replace(" ", "-")}`}
                >
                  {cat.name}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-header-foreground hover:text-header-foreground"
              data-testid="button-theme-toggle"
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-header-foreground hover:text-header-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav className="md:hidden py-4 space-y-2" data-testid="nav-mobile-menu">
            {categories.map((cat) => (
              <Link key={cat.path} href={cat.path}>
                <Button
                  variant="ghost"
                  className={`w-full justify-start text-header-foreground hover:text-header-foreground ${location === cat.path ? "bg-black/20" : ""}`}
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid={`link-mobile-${cat.name.toLowerCase().replace(" ", "-")}`}
                >
                  {cat.name}
                </Button>
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
