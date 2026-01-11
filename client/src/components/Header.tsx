import { Moon, Sun, Menu, Search } from "lucide-react";
import { FaFacebook, FaInstagram } from "react-icons/fa";
import { SiThreads } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { useTheme } from "./ThemeProvider";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import logoDark from "@assets/logo-white-transparent.png";
import { SearchDialog } from "./SearchDialog";

// Navigation header component - Updated 2025-11-25
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

              <Link href="/business">
                <Button
                  variant="ghost"
                  className={`text-header-foreground hover:text-header-foreground ${location === "/business" ? "bg-accent/50" : ""}`}
                  data-testid="nav-business"
                >
                  Business
                </Button>
              </Link>

              <Link href="/tourism">
                <Button
                  variant="ghost"
                  className={`text-header-foreground hover:text-header-foreground ${location === "/tourism" ? "bg-accent/50" : ""}`}
                  data-testid="nav-tourism"
                >
                  Tourism
                </Button>
              </Link>

              <Link href="/politics">
                <Button
                  variant="ghost"
                  className={`text-header-foreground hover:text-header-foreground ${location === "/politics" ? "bg-accent/50" : ""}`}
                  data-testid="nav-politics"
                >
                  Politics
                </Button>
              </Link>

              <Link href="/economy">
                <Button
                  variant="ghost"
                  className={`text-header-foreground hover:text-header-foreground ${location === "/economy" ? "bg-accent/50" : ""}`}
                  data-testid="nav-economy"
                >
                  Economy
                </Button>
              </Link>

              <Link href="/traffic">
                <Button
                  variant="ghost"
                  className={`text-header-foreground hover:text-header-foreground ${location === "/traffic" ? "bg-accent/50" : ""}`}
                  data-testid="nav-traffic"
                >
                  Traffic
                </Button>
              </Link>

              <Link href="/weather">
                <Button
                  variant="ghost"
                  className={`text-header-foreground hover:text-header-foreground ${location === "/weather" ? "bg-accent/50" : ""}`}
                  data-testid="nav-weather"
                >
                  Weather
                </Button>
              </Link>
            </nav>
          )}

          <div className="flex items-center space-x-2">
            {/* Social Media Follow Icons */}
            <div className="flex items-center space-x-1">
              <a
                href="https://www.facebook.com/phuketradar/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-accent/50 transition-colors"
                aria-label="Follow us on Facebook"
                data-testid="social-facebook"
              >
                <FaFacebook className="h-5 w-5" style={{ color: '#1877F2' }} />
              </a>
              <a
                href="https://www.instagram.com/phuket_radar/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-accent/50 transition-colors"
                aria-label="Follow us on Instagram"
                data-testid="social-instagram"
              >
                <FaInstagram className="h-5 w-5" style={{ color: '#E1306C' }} />
              </a>
              <a
                href="https://www.threads.com/@phuket_radar"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-accent/50 transition-colors"
                aria-label="Follow us on Threads"
                data-testid="social-threads"
              >
                <SiThreads className="h-5 w-5 text-header-foreground" />
              </a>
            </div>
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
            <Link href="/business">
              <Button
                variant="ghost"
                className={`w-full justify-start text-header-foreground hover:text-header-foreground ${location === "/business" ? "bg-black/20" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-mobile-business"
              >
                Business
              </Button>
            </Link>
            <Link href="/tourism">
              <Button
                variant="ghost"
                className={`w-full justify-start text-header-foreground hover:text-header-foreground ${location === "/tourism" ? "bg-black/20" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-mobile-tourism"
              >
                Tourism
              </Button>
            </Link>
            <Link href="/politics">
              <Button
                variant="ghost"
                className={`w-full justify-start text-header-foreground hover:text-header-foreground ${location === "/politics" ? "bg-black/20" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-mobile-politics"
              >
                Politics
              </Button>
            </Link>
            <Link href="/economy">
              <Button
                variant="ghost"
                className={`w-full justify-start text-header-foreground hover:text-header-foreground ${location === "/economy" ? "bg-black/20" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-mobile-economy"
              >
                Economy
              </Button>
            </Link>
            <Link href="/traffic">
              <Button
                variant="ghost"
                className={`w-full justify-start text-header-foreground hover:text-header-foreground ${location === "/traffic" ? "bg-black/20" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-mobile-traffic"
              >
                Traffic
              </Button>
            </Link>
            <Link href="/weather">
              <Button
                variant="ghost"
                className={`w-full justify-start text-header-foreground hover:text-header-foreground ${location === "/weather" ? "bg-black/20" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
                data-testid="link-mobile-weather"
              >
                Weather
              </Button>
            </Link>

            {/* Mobile Social Icons */}
            <div className="flex items-center justify-center space-x-4 pt-4 mt-2 border-t border-border">
              <a
                href="https://www.facebook.com/phuketradar/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Follow us on Facebook"
              >
                <FaFacebook className="h-6 w-6" style={{ color: '#1877F2' }} />
              </a>
              <a
                href="https://www.instagram.com/phuket_radar/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Follow us on Instagram"
              >
                <FaInstagram className="h-6 w-6" style={{ color: '#E1306C' }} />
              </a>
              <a
                href="https://www.threads.com/@phuket_radar"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                aria-label="Follow us on Threads"
              >
                <SiThreads className="h-6 w-6 text-header-foreground" />
              </a>
            </div>
          </nav>
        )}
      </div>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
