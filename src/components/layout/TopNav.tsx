import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  ChevronDown,
  Building,
  Plus,
  Check,
  LogOut,
  User as UserIcon,
  Settings,
  Calendar,
  AlertCircle,
  Shield,
  Briefcase,
  Menu,
} from 'lucide-react';
import { useAccounting } from '../../context/AccountingContext';
import { useAppSelector } from '../../app/hooks';
import { useAppDispatch } from '../../app/hooks';
import { logout } from '../../features/auth/authSlice';

interface TopNavProps {
  currentRoute: string;
  navigate: (route: string) => void;
  openSearch: () => void;
  openNotifications: () => void;
  openMobileMenu?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentRoute,
  navigate,
  openSearch,
  openNotifications,
  openMobileMenu,
}) => {
  const dispatch = useAppDispatch();
  const {
    currentUser,
    currentOrg,
    organizations,
    switchOrganization,
    notifications,
    metrics,
  } = useAccounting();
  const authUser = useAppSelector((state) => state.auth.user);
  const userProfile = useAppSelector((state) => state.users.currentProfile);
  const orgsStatus = useAppSelector((state) => state.organizations.status);
  const orgsError = useAppSelector((state) => state.organizations.error);
  const orgsLoading = orgsStatus === 'loading';

  const profileName =
    userProfile?.display_name ||
    [userProfile?.first_name, userProfile?.last_name].filter(Boolean).join(' ') ||
    (authUser?.profile?.display_name as string | undefined) ||
    currentUser?.name ||
    '';
  const profileEmail = authUser?.email || currentUser?.email;
  const profileRole = authUser?.memberships[0]?.role_name || currentUser?.role || 'Owner';
  const profileAvatar = profileName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const orgRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadNotifs = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (orgRef.current && !orgRef.current.contains(event.target as Node)) {
        setOrgDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPageTitle = (route: string) => {
    switch (route) {
      case '/dashboard':
        return { title: 'Dashboard', category: 'Overview' };
      case '/transactions':
        return { title: 'General Ledger & Transactions', category: 'Workspace' };
      case '/sales':
        return { title: 'Sales & Invoicing', category: 'Receivables' };
      case '/purchases':
        return { title: 'Purchases & Bills', category: 'Payables' };
      case '/expenses':
        return { title: 'Operating Expenses', category: 'Workspace' };
      case '/banking':
        return { title: 'Banking & Reconciliation', category: 'Treasury' };
      case '/customers':
        return { title: 'Customers Directory', category: 'Contacts' };
      case '/vendors':
        return { title: 'Vendors Directory', category: 'Contacts' };
      case '/gst':
        return { title: 'GST Compliance & Filing Summary', category: 'Statutory' };
      case '/reports':
        return { title: 'Financial Reports', category: 'Accounting' };
      case '/ai-assistant':
        return { title: 'AI Accounting Assistant', category: 'Intelligence' };
      case '/ai-assistant/documents':
        return { title: 'AI Document Extraction (OCR)', category: 'Intelligence' };
      case '/review':
        return { title: 'AI Review Queue & Anomalies', category: 'Quality Control' };
      case '/insights':
        return { title: 'Financial Intelligence & Insights', category: 'Analytics' };
      case '/settings/business':
        return { title: 'Business Profile & Tax Settings', category: 'System' };
      case '/settings/users':
        return { title: 'User Management & Roles', category: 'System' };
      case '/audit-log':
        return { title: 'Audit Trail & Event Log', category: 'Governance' };
      default:
        return { title: 'AI Accounting', category: 'Workspace' };
    }
  };

  const { title } = getPageTitle(currentRoute);

  return (
    <header className="h-16 bg-white border-b border-neutral-200 px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shrink-0">
      {/* Left: Mobile Menu Button & Organization Switcher */}
      <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
        {/* Mobile Hamburger Menu Toggle */}
        <button
          onClick={openMobileMenu}
          className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded lg:hidden focus:outline-none transition-colors shrink-0"
          title="Open Navigation"
          id="open-mobile-menu-btn"
        >
          <Menu size={20} />
        </button>

        {/* Organization Switcher Dropdown */}
        <div className="relative shrink-0 max-w-[140px] xs:max-w-[180px] sm:max-w-[240px]" ref={orgRef}>
          <button
            onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
            id="org-switcher-btn"
            className="flex items-center px-2.5 sm:px-3 py-1.5 border border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-900 hover:bg-neutral-100 transition-colors w-full"
          >
            <span className="mr-1.5 sm:mr-2 uppercase tracking-tight truncate">
              {currentOrg ? currentOrg.name : 'Select Business'}
            </span>
            <ChevronDown size={12} className="text-neutral-500 shrink-0" />
          </button>

          {orgDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-72 max-w-[calc(100vw-1.5rem)] bg-white border border-neutral-200 shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 border-b border-neutral-100 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Organizations & Tenants
              </div>

              <div className="max-h-60 overflow-y-auto py-1">
                {orgsLoading && organizations.length === 0 && (
                  <div className="px-3 py-2 text-neutral-500 font-mono flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
                    <span>Loading organizations...</span>
                  </div>
                )}
                {orgsStatus === 'failed' && orgsError && organizations.length === 0 && (
                  <div className="px-3 py-2 text-red-700">
                    <div className="font-medium">{orgsError.message}</div>
                    <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                      Unable to load your organizations.
                    </div>
                  </div>
                )}
                {organizations.map((org) => {
                  const isSelected = org.id === currentOrg?.id;
                  return (
                    <button
                      key={org.id}
                      onClick={() => {
                        switchOrganization(org.id);
                        setOrgDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-start justify-between hover:bg-neutral-50 transition-colors ${
                        isSelected ? 'bg-neutral-100 font-semibold' : ''
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-neutral-900 truncate font-mono text-xs">
                          {org.name}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                          GSTIN: {org.gstin} • {org.businessType}
                        </div>
                        <div className="text-[10px] text-neutral-700 font-mono">
                          FY {org.financialYear}
                        </div>
                      </div>
                      {isSelected && <Check size={14} className="text-neutral-900 shrink-0 mt-0.5" />}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-neutral-100 pt-1 px-1">
                <button
                  onClick={() => {
                    setOrgDropdownOpen(false);
                    navigate('/new-business');
                  }}
                  id="add-organization-btn"
                  className="w-full text-left px-3 py-2 text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 font-medium"
                >
                  <Plus size={14} className="text-neutral-600" />
                  <span>Add New Business Tenant</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <span className="text-neutral-300 hidden sm:inline">|</span>
        <span className="text-xs font-medium text-neutral-500 uppercase tracking-widest hidden md:inline truncate">
          FY {currentOrg?.financialYear || '2026-27'}
        </span>
      </div>

      {/* Right Tools: Search, Action Badge, Notifications, Date, Profile */}
      <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-5">
        {/* Global Search input trigger */}
        <div className="relative">
          <input
            type="text"
            readOnly
            onClick={openSearch}
            placeholder="Search records..."
            className="bg-neutral-100 border-none px-3 sm:px-4 py-1.5 text-xs w-28 xs:w-36 sm:w-44 md:w-48 focus:ring-1 focus:ring-neutral-400 outline-none cursor-pointer placeholder:text-neutral-400 rounded-xs transition-all"
          />
        </div>

        {/* Action Required Badge */}
        {metrics.pendingReviewCount > 0 && (
          <button
            onClick={() => navigate('/review')}
            id="action-required-header-btn"
            className="hidden sm:flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-900 text-xs px-2.5 py-1 transition-colors font-medium border border-neutral-300 rounded-xs shrink-0"
          >
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            <span>{metrics.pendingReviewCount} Issues</span>
          </button>
        )}

        {/* Notifications */}
        <button
          onClick={openNotifications}
          id="notifications-btn"
          className="relative text-neutral-400 hover:text-neutral-900 cursor-pointer transition-colors p-1.5 shrink-0"
          title="Notifications"
        >
          <Bell size={18} />
          {unreadNotifs > 0 && (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
          )}
        </button>

        {/* User Profile */}
        <div className="relative shrink-0" ref={profileRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            id="user-profile-menu-btn"
            className="flex items-center cursor-pointer focus:outline-none"
          >
            <div className="w-8 h-8 bg-neutral-900 flex items-center justify-center text-white text-xs font-bold font-mono hover:bg-neutral-800 transition-colors">
              {profileAvatar || 'AM'}
            </div>
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-60 max-w-[calc(100vw-1.5rem)] bg-white border border-neutral-200 shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-2 border-b border-neutral-100">
                <div className="font-semibold text-neutral-900">{profileName}</div>
                <div className="text-neutral-500 text-[11px] font-mono truncate">{profileEmail}</div>
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono bg-neutral-100 text-neutral-700 px-1.5 py-0.5">
                  <Shield size={10} />
                  <span>{profileRole} Role</span>
                </div>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    navigate('/settings/business');
                  }}
                  className="w-full text-left px-3 py-1.5 text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                >
                  <Settings size={13} className="text-neutral-500" />
                  <span>Business Settings</span>
                </button>
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    navigate('/settings/users');
                  }}
                  className="w-full text-left px-3 py-1.5 text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                >
                  <UserIcon size={13} className="text-neutral-500" />
                  <span>User & Access Control</span>
                </button>
              </div>

              <div className="border-t border-neutral-100 pt-1">
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    void dispatch(logout())
                      .unwrap()
                      .then(() => navigate('/login'));
                  }}
                  id="logout-nav-btn"
                  className="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                >
                  <LogOut size={13} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
