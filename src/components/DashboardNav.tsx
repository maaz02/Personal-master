import { Button } from "@/components/ui/button";
import { BarChart3, MessageSquare, Settings, Menu, X } from "lucide-react";
import { useState } from "react";

interface DashboardNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DashboardNav({ activeTab, onTabChange, isOpen, onOpenChange }: DashboardNavProps) {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: MessageSquare },
    { id: "reports", label: "Reports & KPIs", icon: BarChart3 },
  ];

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => onOpenChange(!isOpen)}
        className="fixed left-4 top-4 z-50 md:hidden"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 z-40 h-screen w-64 border-r bg-background transition-transform duration-300 md:relative md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col gap-4 p-4">
          {/* Logo/Header */}
          <div className="flex items-center gap-2 border-b pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold">Alcora</p>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-1 flex-col gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    onTabChange(tab.id);
                    onOpenChange(false);
                  }}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground">v1.0</p>
          </div>
        </div>
      </div>
    </>
  );
}
