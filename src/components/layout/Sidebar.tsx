import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Receipt,
  ShoppingBag,
  CreditCard,
  Building2,
  Users,
  Briefcase,
  FileSpreadsheet,
  FileText,
  Bot,
  SearchCode,
  ScanText,
  Lightbulb,
  Settings,
  ShieldCheck,
  History,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';

interface SidebarProps {
  currentRoute: string;
  navigate: (route: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRoute,
  navigate,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}) => {
  const { currentUser, currentOrg, reviewItems } = useAccounting();

  const pendingReviewCount = reviewItems.filter((r) => r.status === 'Pending').length;

  const navGroups = [
    {
      group: 'Workspace',
      items: [
        { label: 'Dashboard', route: '/dashboard', icon: LayoutDashboard },
        { label: 'Transactions', route: '/transactions', icon: ArrowLeftRight },
        { label: 'Sales', route: '/sales', icon: Receipt },
        { label: 'Purchases', route: '/purchases', icon: ShoppingBag },
        { label: 'Expenses', route: '/expenses', icon: CreditCard },
        { label: 'Banking', route: '/banking', icon: Building2 },
      ],
    },
    {
      group: 'Contacts',
      items: [
        { label: 'Customers', route: '/customers', icon: Users },
        { label: 'Vendors', route: '/vendors', icon: Briefcase },
        { label: 'Catalog & Ledgers', route: '/catalog', icon: FileText },
      ],
    },
    {
      group: 'Compliance',
      items: [
        { label: 'GST', route: '/gst', icon: FileSpreadsheet, badge: 'India' },
        { label: 'Reports', route: '/reports', icon: FileText },
      ],
    },
    {
      group: 'Intelligence',
      items: [
        { label: 'AI Assistant', route: '/ai-assistant', icon: Bot },
        { label: 'AI Insights', route: '/insights', icon: Lightbulb },
        {
          label: 'Review Queue',
          route: '/review',
          icon: SearchCode,
          count: pendingReviewCount > 0 ? pendingReviewCount : undefined,
        },
        { label: 'Document OCR', route: '/ai-assistant/documents', icon: ScanText },
      ],
    },
    {
      group: 'System',
      items: [
        { label: 'Business Settings', route: '/settings/business', icon: Settings },
        { label: 'Users & Roles', route: '/settings/users', icon: ShieldCheck },
        { label: 'Audit Log', route: '/audit-log', icon: History },
      ],
    },
    {
      group: 'Platform Administration',
      items: [
        { label: 'Organizations', route: '/admin/organizations', icon: Building2 },
        { label: 'Users', route: '/admin/users', icon: Users },
      ],
    },
  ];

  const handleNavClick = (route: string) => {
    navigate(route);
    setMobileOpen(false);
  };

  return (
    <>
      {/* ─── MOBILE BACKDROP & DRAWER (< lg) ─── */}
      <div
        className={`fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300 ease-in-out ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside
        id="mobile-sidebar"
        className={`fixed top-0 left-0 bottom-0 w-72 max-w-[85vw] bg-white text-neutral-900 z-50 shadow-2xl flex flex-col lg:hidden transition-transform duration-300 ease-out border-r border-neutral-200 select-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-neutral-200 shrink-0">
          <button
            onClick={() => handleNavClick('/dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-none min-w-0"
          >
            <div className="w-8 h-8 bg-neutral-900 text-white flex items-center justify-center font-bold text-xs tracking-tighter shrink-0">
              AI
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight uppercase text-neutral-900 truncate">
                AICounts
              </h1>
              <div className="text-[8.5px] text-neutral-500 font-mono tracking-tight uppercase whitespace-nowrap">
                SMART ACCOUNTING, SIMPLIFIED
              </div>
            </div>
          </button>

          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors"
            title="Close navigation"
            id="close-mobile-menu-btn"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mobile Active Tenant Context */}
        {currentOrg && (
          <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-200 shrink-0">
            <div className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">
              Active Tenant
            </div>
            <div className="text-xs font-semibold text-neutral-900 truncate mt-0.5">
              {currentOrg.name}
            </div>
            <div className="text-[10px] text-neutral-500 font-mono mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
              FY {currentOrg.financialYear}
            </div>
          </div>
        )}

        {/* Mobile Navigation List */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4">
          {navGroups.map((group) => (
            <div key={`m-${group.group}`}>
              <p className="px-3 mb-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                {group.group}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentRoute === item.route || (item.route !== '/dashboard' && currentRoute.startsWith(item.route));
                  return (
                    <li key={`m-${item.route}`}>
                      <button
                        onClick={() => handleNavClick(item.route)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left rounded-xs ${
                          isActive
                            ? 'bg-neutral-100 border-l-2 border-neutral-900 font-semibold text-neutral-900'
                            : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 font-medium'
                        }`}
                      >
                        <Icon
                          size={16}
                          className={`shrink-0 ${
                            isActive ? 'text-neutral-900' : 'text-neutral-500'
                          }`}
                        />
                        <span className="truncate flex-1">{item.label}</span>
                        {item.count !== undefined && (
                          <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">
                            {item.count}
                          </span>
                        )}
                        {item.badge && (
                          <span className="px-1 py-0.2 text-[9px] font-mono uppercase bg-neutral-200 text-neutral-700">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Mobile Footer */}
        <div className="p-4 border-t border-neutral-200 shrink-0 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-neutral-900 flex items-center justify-center text-white text-xs font-bold shrink-0 font-mono">
              {currentUser?.avatar || (currentUser?.name ? currentUser?.name[0] : 'U')}
            </div>
            <div className="overflow-hidden min-w-0">
              <p className="text-xs font-semibold truncate text-neutral-900">
                {currentUser?.name || ''}
              </p>
              <p className="text-[10px] text-neutral-400 uppercase tracking-tight">
                {currentUser?.role || ''}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── DESKTOP SIDEBAR (>= lg) ─── */}
      <aside
        id="app-sidebar"
        className={`hidden lg:flex fixed top-0 left-0 h-screen bg-white text-neutral-900 border-r border-neutral-200 flex-col z-30 transition-[width] duration-300 ease-in-out motion-reduce:transition-none select-none ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`h-16 flex items-center border-b border-neutral-200 shrink-0 relative transition-all duration-300 ${
            collapsed ? 'justify-center px-2' : 'justify-between px-3.5'
          }`}
        >
          {!collapsed ? (
            <>
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2.5 text-left focus:outline-none group min-w-0 transition-opacity duration-200"
                id="brand-logo-btn"
              >
                <div className="w-8 h-8 bg-neutral-900 text-white flex items-center justify-center font-bold text-xs tracking-tighter shrink-0 font-mono">
                  AI
                </div>
                <div className="min-w-0 overflow-hidden">
                  <h1 className="text-sm font-bold tracking-tight uppercase text-neutral-900 truncate">
                    AICounts
                  </h1>
                  <div className="text-[8px] sm:text-[8.5px] text-neutral-500 font-mono tracking-tight uppercase whitespace-nowrap">
                    SMART ACCOUNTING, SIMPLIFIED
                  </div>
                </div>
              </button>

              <button
                onClick={() => setCollapsed(true)}
                className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded transition-colors shrink-0"
                title="Collapse sidebar"
                id="collapse-sidebar-btn"
              >
                <ChevronLeft size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-8 h-8 bg-neutral-900 text-white flex items-center justify-center font-bold text-xs shrink-0 hover:bg-neutral-800 transition-colors focus:outline-none font-mono"
                id="brand-logo-btn-collapsed"
                title="AICounts — Dashboard"
              >
                AI
              </button>

              <button
                onClick={() => setCollapsed(false)}
                className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-neutral-200 rounded-full flex items-center justify-center text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 shadow-sm z-30 transition-all hover:scale-105 focus:outline-none"
                title="Expand sidebar"
                id="expand-sidebar-btn"
              >
                <ChevronRight size={13} />
              </button>
            </>
          )}
        </div>

        {/* Tenant Context Pill */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out shrink-0 bg-neutral-50 border-neutral-200 ${
            !collapsed && currentOrg ? 'max-h-24 px-4 py-2.5 border-b opacity-100' : 'max-h-0 py-0 px-0 border-b-0 opacity-0 pointer-events-none'
          }`}
        >
          {currentOrg && (
            <div className="whitespace-nowrap overflow-hidden">
              <div className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">
                Active Tenant
              </div>
              <div className="text-xs font-semibold text-neutral-900 truncate mt-0.5">
                {currentOrg.name}
              </div>
              <div className="text-[10px] text-neutral-500 font-mono mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                FY {currentOrg.financialYear}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {navGroups.map((group) => (
            <div key={group.group}>
              <p
                className={`px-2 mb-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-widest overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  collapsed ? 'opacity-0 h-0 my-0' : 'opacity-100 h-auto'
                }`}
              >
                {group.group}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentRoute === item.route || (item.route !== '/dashboard' && currentRoute.startsWith(item.route));
                  return (
                    <li key={item.route}>
                      <button
                        onClick={() => navigate(item.route)}
                        id={`nav-link-${item.route.replace(/[\/]/g, '-')}`}
                        className={`w-full flex items-center gap-2.5 py-2 text-xs transition-colors text-left group ${
                          isActive
                            ? 'bg-neutral-100 border-l-2 border-neutral-900 font-semibold text-neutral-900'
                            : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 font-medium'
                        } ${
                          collapsed ? 'justify-center px-0' : 'px-2.5'
                        }`}
                        title={collapsed ? `${item.label} (${group.group})` : undefined}
                      >
                        <Icon
                          size={16}
                          className={`shrink-0 transition-colors ${
                            isActive ? 'text-neutral-900' : 'text-neutral-500 group-hover:text-neutral-900'
                          }`}
                        />
                        {!collapsed && (
                          <>
                            <span className="truncate flex-1 whitespace-nowrap">
                              {item.label}
                            </span>
                            {item.count !== undefined && (
                              <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                                {item.count}
                              </span>
                            )}
                            {item.badge && (
                              <span className="px-1 py-0.2 text-[9px] font-mono uppercase bg-neutral-200 text-neutral-700 shrink-0">
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer / User Profile Card */}
        <div className="p-3 border-t border-neutral-200 shrink-0 bg-white transition-all duration-300">
          {!collapsed ? (
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 bg-neutral-900 flex items-center justify-center text-white text-xs font-bold shrink-0 font-mono">
                {currentUser?.avatar || (currentUser?.name ? currentUser?.name[0] : 'U')}
              </div>
              <div className="overflow-hidden min-w-0 whitespace-nowrap">
                <p className="text-xs font-semibold truncate text-neutral-900">
                  {currentUser?.name || ''}
                </p>
                <p className="text-[10px] text-neutral-400 uppercase tracking-tight truncate">
                  {currentUser?.role || ''}
                </p>
              </div>
            </div>
          ) : (
            <div
              className="w-8 h-8 bg-neutral-900 flex items-center justify-center text-white text-xs font-bold mx-auto shrink-0 font-mono"
              title={`${currentUser?.name || ''} (${currentUser?.role || ''})`}
            >
              {currentUser?.avatar || (currentUser?.name ? currentUser?.name[0] : 'U')}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
