import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, BarChart3 } from "lucide-react";
import { BRAND_NAME, CALENDLY_POPUP_URL } from "@/lib/constants";
import { Link, useLocation } from "react-router-dom";

declare global {
  interface Window {
    Calendly?: {
      initPopupWidget: (options: { url: string }) => void;
    };
  }
}

const navLinks = [
  { label: "Problems", href: "#problems" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Demo", href: "#demo" },
  { label: "PDPL", href: "#pdpl" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (href: string) => {
    setIsMobileMenuOpen(false);
    if (!isHomePage && href.startsWith("#")) {
      window.location.href = "/" + href;
    }
  };

  const openCalendly = () => {
    if (window.Calendly) {
      window.Calendly.initPopupWidget({ url: CALENDLY_POPUP_URL });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-card/95 backdrop-blur-xl border-b border-border shadow-[0_12px_30px_rgba(2,6,23,0.55)]"
          : "bg-card/75 backdrop-blur-lg border-b border-border/50 shadow-[0_10px_24px_rgba(2,6,23,0.45)]"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 md:w-10 md:h-10">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-secondary opacity-80 blur-sm group-hover:opacity-100 transition-opacity" />
              <div className="relative w-full h-full rounded-xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
              </div>
            </div>
            <span className="font-bold text-lg md:text-xl text-foreground tracking-tight">
              {BRAND_NAME}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-4">
            {isHomePage &&
              navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 text-base font-semibold text-foreground/90 hover:text-primary transition-colors rounded-full hover:bg-primary/10"
                >
                  {link.label}
                </a>
              ))}
          </nav>

          {/* CTA Button */}
          <div className="flex items-center gap-3">
            <Link to="/auth" className="hidden sm:inline-flex">
              <Button variant="outline">Log in</Button>
            </Link>
            <Link to="/auth" className="hidden sm:inline-flex">
              <Button className="btn-gradient">Sign up</Button>
            </Link>
            <Button
              onClick={openCalendly}
              className="hidden sm:inline-flex btn-gradient"
            >
              Book a 15-min Demo
            </Button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-foreground hover:bg-muted/30 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Tagline */}
        <div className="hidden md:block text-center pb-2">
          <span className="text-xs font-semibold text-foreground/90 tracking-[0.12em]">
            UAE | WhatsApp automation | PDPL-first
          </span>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-card/95 backdrop-blur-xl border-t border-border animate-fade-in">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
          {isHomePage &&
              navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => handleNavClick(link.href)}
                  className="px-4 py-3 text-sm font-semibold text-foreground/90 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  {link.label}
                </a>
              ))}
            <Link
              to="/auth"
              className="px-4 py-3 text-sm font-semibold text-foreground/90 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              Log in
            </Link>
            <Link
              to="/auth"
              className="px-4 py-3 text-sm font-semibold text-foreground/90 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              Sign up
            </Link>
            <Button onClick={openCalendly} className="mt-3 btn-gradient">
              Book a 15-min Demo
            </Button>
          </nav>
        </div>
      )}
    </header>
  );
}


