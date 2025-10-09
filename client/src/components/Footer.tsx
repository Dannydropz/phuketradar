import { Link } from "wouter";
import { Facebook } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import logoDark from "@assets/PhuketRadar_1759933943849.png";
import logoLight from "@assets/PhuketRadar (2)_1759934227696.png";

export function Footer() {
  const { theme } = useTheme();
  
  return (
    <footer className="border-t bg-card mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="mb-4">
              <img 
                src={theme === "light" ? logoDark : logoLight} 
                alt="Phuket Radar" 
                className="h-16 w-auto"
              />
            </div>
            <p className="text-muted-foreground max-w-md mb-4">
              Phuket
            </p>
            <div className="flex items-center space-x-4">
              <a
                href="https://www.facebook.com/PhuketTimeNews"
                target="_blank"
                rel="noopener noreferrer"
                className="hover-elevate rounded-lg p-2"
                data-testid="link-facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Categories</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/category/breaking" className="hover:text-foreground transition-colors" data-testid="link-footer-breaking">
                  Breaking News
                </Link>
              </li>
              <li>
                <Link href="/category/tourism" className="hover:text-foreground transition-colors" data-testid="link-footer-tourism">
                  Tourism
                </Link>
              </li>
              <li>
                <Link href="/category/business" className="hover:text-foreground transition-colors" data-testid="link-footer-business">
                  Business
                </Link>
              </li>
              <li>
                <Link href="/category/events" className="hover:text-foreground transition-colors" data-testid="link-footer-events">
                  Events
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">About</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-foreground transition-colors" data-testid="link-footer-about">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-foreground transition-colors" data-testid="link-footer-admin">
                  Admin
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Phuket Radar. All rights reserved.</p>
          <p className="mt-2">Content translated and adapted from original Thai sources.</p>
        </div>
      </div>
    </footer>
  );
}
