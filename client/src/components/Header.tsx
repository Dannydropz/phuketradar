import { Moon, Sun, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "./ThemeProvider";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import logoDark from "@assets/logo-white-transparent.png";
import { SearchDialog } from "./SearchDialog";

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

          {!location.startsWith('/admin') && (
            <nav className="hidden md:flex items-center space-x-1">
              <Link href="/">
                <Button
                  variant="ghost"
                  className={`text-header-foreground hover:text-header-foreground ${location === "/" ? "bg-accent/50" : ""}`}
                  data-testid="nav-home"
                >
                  Home
                </Button>
              </Link>

              <Link href="/crime">
                <Button
                  variant="ghost"
                  className={`text-header-foreground hover:text-header-foreground ${location === "/crime" ? "bg-accent/50" : ""}`}
                  data-testid="nav-crime"
                >
                  Crime
                </Button>
              </Link>

              <Link href="/local">
                <Button
                  variant="ghost"
                  className={`text-header-foreground hover:text-header-foreground ${location === "/local" ? "bg-accent/50" : ""}`}
                  data-testid="nav-local"
                >
                  Local
                </Button>
              </Link>
            </nav>
          )}

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
            {!location.startsWith('/admin') && (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden text-header-foreground hover:text-header-foreground"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="button-mobile-menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {mobileMenuOpen && !location.startsWith('/admin') && (
          <nav className="md:hidden py-4 space-y-2" data-testid="nav-mobile-menu">
            <Link href="/">
              <Button
                variant="ghost"
                className={`w-full justify-start text-header-foreground hover:text-header-foreground ${location === "/" ? "bg-black/20" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-mobile-home"
              >
                Home
              </Button>
            </Link>
            <Link href="/crime">
              <Button
                variant="ghost"
                className={`w-full justify-start text-header-foreground hover:text-header-foreground ${location === "/crime" ? "bg-black/20" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-mobile-crime"
              >
                Crime
              </Button>
            </Link>
            <Link href="/local">
              <Button
                variant="ghost"
                className={`w-full justify-start text-header-foreground hover:text-header-foreground ${location === "/local" ? "bg-black/20" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-mobile-local"
              >
                Local
              </Button>
            </Link>
          </nav>
        )}
      </div>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
