import { Moon, Sun, Menu, Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./ThemeProvider";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import logoDark from "@assets/logo-white-transparent.png";
import { SearchDialog } from "./SearchDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const newsCategories = [
  { name: "All News", path: "/" },
  { name: "Crime", path: "/crime" },
  { name: "Local", path: "/local" },
  { name: "Tourism", path: "/tourism" },
  { name: "Politics", path: "/politics" },
  { name: "Economy", path: "/economy" },
  { name: "Traffic", path: "/traffic" },
  { name: "Weather", path: "/weather" },
];

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="text-header-foreground hover:text-header-foreground"
                  data-testid="button-news-dropdown"
                >
                  News
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {newsCategories.map((cat) => (
                  <DropdownMenuItem key={cat.path} asChild>
                    <Link href={cat.path}>
                      <button
                        className={`w-full text-left ${location === cat.path ? "font-semibold" : ""}`}
                        data-testid={`link-${cat.name.toLowerCase().replace(" ", "-")}`}
                      >
                        {cat.name}
                      </button>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/crime">
              <Button
                variant="ghost"
                className={`text-header-foreground hover:text-header-foreground ${location === "/crime" ? "bg-accent/50" : ""}`}
                data-testid="nav-crime"
              >
                Crime
              </Button>
            </Link>
          </nav>

          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSearchOpen(true)}
              className="text-header-foreground hover:text-header-foreground"
              data-testid="button-search"
            >
              <Search className="h-5 w-5" />
            </Button>
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
            {newsCategories.map((cat) => (
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
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
