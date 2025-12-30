import { BRAND_NAME } from "@/lib/constants";
import { Link } from "react-router-dom";
import { BarChart3 } from "lucide-react";

export function Footer() {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">{BRAND_NAME}</span>
          </Link>

          {/* Links */}
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a
              href="#pdpl"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy & PDPL
            </a>
            <a
              href="#faq"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              FAQ
            </a>
            <a
              href="mailto:hello@alcoralabs.com"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </a>
          </nav>

          {/* Copyright */}
          <div className="text-sm text-muted-foreground">
            Copyright (c) {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
