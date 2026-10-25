import React from 'react';
import {
  Monitor,
  Bell,
  RotateCcw,
  Network,
  Clock,
  Server,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type ActiveTab = 'inventory' | 'alerts' | 'reset-uptime' | 'network';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  activeAlertsCount?: number;
}

export function Sidebar({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  activeAlertsCount = 0,
}: SidebarProps): React.JSX.Element {
  const navItems = [
    { id: 'inventory' as ActiveTab, label: 'Ficha Técnica', icon: Monitor },
    {
      id: 'alerts' as ActiveTab,
      label: 'Alertas Activas',
      icon: Bell,
      badge: activeAlertsCount > 0 ? activeAlertsCount : undefined,
    },
    { id: 'network' as ActiveTab, label: 'Diagnóstico & Ping', icon: Network },
    { id: 'reset-uptime' as ActiveTab, label: 'Reseteos & Uptime', icon: RotateCcw },
  ];

  return (
    <aside
      className={`border-r border-border bg-card/40 transition-all duration-200 flex flex-col justify-between select-none ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      <div className="p-2 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider uppercase text-muted-foreground">
          {!collapsed && 'Navegación'}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}
              {!collapsed && item.badge !== undefined && (
                <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-destructive text-white">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-2 border-t border-border">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span>Colapsar panel</span>}
        </button>
      </div>
    </aside>
  );
}
