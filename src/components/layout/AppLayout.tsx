import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Calendar, Users, Activity, BookOpen, CircleHelp, LogOut, Menu, RefreshCw, WifiOff, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useHybridSyncStatus } from '@/hooks/useHybridSyncStatus';

const navigation = [
  { name: 'Agenda', href: '/', icon: Calendar },
  { name: 'Pacientes', href: '/patients', icon: Users },
  { name: 'Base de Conocimiento', href: '/knowledge', icon: BookOpen },
  { name: 'Ayuda', href: '/knowledge/help', icon: CircleHelp },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const syncStatus = useHybridSyncStatus();

  const syncBadge = !syncStatus.enabled ? null : (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] px-2 py-0.5",
        syncStatus.lastError
          ? "border-destructive/30 text-destructive"
          : syncStatus.pendingCount > 0
            ? "border-warning/30 text-warning"
            : "border-success/30 text-success"
      )}
      title={syncStatus.lastError || undefined}
    >
      {!syncStatus.isOnline ? 'Offline' : syncStatus.syncing ? 'Sincronizando...' : syncStatus.pendingCount > 0 ? `${syncStatus.pendingCount} pendientes` : 'Sincronizado'}
    </Badge>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground leading-none">BioMag</span>
            {syncStatus.enabled && (
              <span className="text-[10px] text-muted-foreground mt-1">
                {!syncStatus.isOnline ? 'Modo híbrido (offline)' : 'Modo híbrido'}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile menu */}
      <nav className={cn(
        "lg:hidden fixed top-14 left-0 right-0 z-40 bg-card border-b transform transition-transform duration-200",
        mobileMenuOpen ? "translate-y-0" : "-translate-y-full"
      )}>
        <div className="p-4 space-y-1">
          {syncStatus.enabled && (
            <div className="flex items-center justify-between rounded-md border px-3 py-2 mb-2">
              <div className="flex items-center gap-2">
                {!syncStatus.isOnline ? (
                  <WifiOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <RefreshCw className={cn("w-4 h-4 text-muted-foreground", syncStatus.syncing && "animate-spin")} />
                )}
                {syncBadge}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => void syncStatus.syncNow()}
                disabled={syncStatus.syncing || !syncStatus.isOnline}
              >
                Sync
              </Button>
            </div>
          )}
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "nav-item w-full",
                  isActive ? "nav-item-active" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </NavLink>
            );
          })}
          <button
            onClick={logout}
            className="nav-item w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-5 h-5" />
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:bg-sidebar lg:border-r">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <Activity className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-sidebar-foreground">BioMag</h1>
            <p className="text-xs text-muted-foreground">Terapia Biomagnética</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  "nav-item",
                  isActive ? "nav-item-active" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        {/* User section */}
        <div className="px-4 py-4 border-t border-sidebar-border">
          {syncStatus.enabled && (
            <div className="px-3 pb-3">
              <div className="rounded-lg border border-sidebar-border p-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {!syncStatus.isOnline ? (
                      <WifiOff className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <RefreshCw className={cn("w-4 h-4 text-muted-foreground", syncStatus.syncing && "animate-spin")} />
                    )}
                    <span className="text-xs text-muted-foreground">Sincronización</span>
                  </div>
                  {syncBadge}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground truncate">
                    {syncStatus.lastError
                      ? 'Último intento con error'
                      : syncStatus.lastSyncAt
                        ? `Última sync: ${new Date(syncStatus.lastSyncAt).toLocaleTimeString()}`
                        : 'Sin sincronizar aún'}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => void syncStatus.syncNow()}
                    disabled={syncStatus.syncing || !syncStatus.isOnline}
                  >
                    Sync
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.username}
              </p>
              <p className="text-xs text-muted-foreground">Terapeuta</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:pl-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
