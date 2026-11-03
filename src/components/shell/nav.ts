import { BarChart3, Calculator, FileText, GitCompareArrows, Home, LayoutDashboard, Settings } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analyzer", label: "Deal Analyzer", icon: Calculator },
  { href: "/properties", label: "My Properties", icon: Home },
  { href: "/compare", label: "Deal Comparison", icon: GitCompareArrows },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export const BrandIcon = BarChart3;
