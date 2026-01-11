import { Link } from "wouter";
import { FaFacebook, FaInstagram } from "react-icons/fa";
import { SiThreads } from "react-icons/si";
import { useTheme } from "./ThemeProvider";
import logoDark from "@assets/PhuketRadar_1759933943849.png";
import logoWhite from "@assets/logo-white-transparent.png";

export function Footer() {
  const { theme } = useTheme();

  return (
    <footer className="border-t bg-card mt-8">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-3">
            <div>
              <img
                src={theme === "light" ? logoDark : logoWhite}
                alt="Phuket Radar"
                className="h-16 w-auto"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Phuket Radar. All rights reserved.
            </p>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-privacy">
              Privacy Policy
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            <a
              href="https://www.facebook.com/phuketradar/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover-elevate rounded-lg p-2"
              aria-label="Follow us on Facebook"
              data-testid="link-facebook"
            >
              <FaFacebook className="w-5 h-5" style={{ color: '#1877F2' }} />
            </a>
            <a
              href="https://www.instagram.com/phuket_radar/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover-elevate rounded-lg p-2"
              aria-label="Follow us on Instagram"
              data-testid="link-instagram"
            >
              <FaInstagram className="w-5 h-5" style={{ color: '#E1306C' }} />
            </a>
            <a
              href="https://www.threads.net/@phuket_radar"
              target="_blank"
              rel="noopener noreferrer"
              className="hover-elevate rounded-lg p-2"
              aria-label="Follow us on Threads"
              data-testid="link-threads"
            >
              <SiThreads className="w-5 h-5 text-muted-foreground hover:text-foreground" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
