import React from 'react';
import {
  Monitor,
  Bell,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type ActiveTab = 'inventory' | 'alerts' | 'reset-uptime';

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
    { id: 'inventory' as ActiveTab, label: 'Ficha & Diagnóstico', icon: Monitor },
    {
      id: 'alerts' as ActiveTab,
      label: 'Alertas Activas',
      icon: Bell,
      badge: activeAlertsCount > 0 ? activeAlertsCount : undefined,
    },
    { id: 'reset-uptime' as ActiveTab, label: 'Reseteos & Uptime', icon: RotateCcw },
  ];

  return (
    <aside
      className={`border-r border-border bg-card/60 backdrop-blur transition-all duration-200 flex flex-col justify-between shrink-0 select-none ${
        collapsed ? 'w-12' : 'w-52'
      }`}
    >
      <div className={`space-y-1 ${collapsed ? 'p-1' : 'p-2'}`}>
        {!collapsed && (
          <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase text-muted-foreground/80">
            Navegación
          </div>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
              className={`relative flex items-center rounded-md text-xs font-semibold transition-all cursor-pointer ${
                collapsed
                  ? 'w-10 h-10 mx-auto justify-center px-0'
                  : 'w-full gap-2.5 px-3 py-2'
              } ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="flex-1 text-left truncate">{item.label}</span>}

              {/* Badge contador de alertas activas */}
              {item.badge !== undefined && (
                <span
                  className={
                    collapsed
                      ? 'absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center border-2 border-background shadow-xs'
                      : 'text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-destructive text-white ml-auto'
                  }
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Botón de alternar colapso / expandir */}
      <div className={`border-t border-border ${collapsed ? 'p-1' : 'p-2'}`}>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expandir panel' : 'Colapsar panel'}
          title={collapsed ? 'Expandir navegación' : 'Colapsar navegación'}
          className={`flex items-center justify-center text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer ${
            collapsed ? 'w-10 h-8 mx-auto' : 'w-full py-1.5 gap-2'
          }`}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!collapsed && <span className="font-medium">Colapsar</span>}
        </button>
      </div>
    </aside>
  );
}
