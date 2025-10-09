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
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start">
            <div className="mb-4">
              <img 
                src={theme === "light" ? logoDark : logoLight} 
                alt="Phuket Radar" 
                className="h-16 w-auto"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Phuket Radar. All rights reserved.
            </p>
          </div>

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
      </div>
    </footer>
  );
}
