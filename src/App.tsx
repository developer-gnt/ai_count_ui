import React, { useEffect, useState } from 'react';
import { AccountingProvider, useAccounting } from './context/AccountingContext';
import { useAppSelector } from './app/hooks';
import { LandingPage } from './components/public/LandingPage';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { CreateOrganizationPage } from './components/onboarding/CreateOrganizationPage';
import { Sidebar } from './components/layout/Sidebar';
import { TopNav } from './components/layout/TopNav';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { NotificationDrawer } from './components/layout/NotificationDrawer';

// Main Views
import { DashboardView } from './components/dashboard/DashboardView';
import { TransactionsView } from './components/transactions/TransactionsView';
import { CatalogView } from './components/catalog/CatalogView';
import { SalesView } from './components/sales/SalesView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { BankingView } from './components/banking/BankingView';
import { CustomersView } from './components/customers/CustomersView';
import { VendorsView } from './components/vendors/VendorsView';
import { GstView } from './components/gst/GstView';
import { ReportsView } from './components/reports/ReportsView';
import { AiAssistantView } from './components/ai/AiAssistantView';
import { DocumentScannerView } from './components/ai/DocumentScannerView';
import { ReviewQueueView } from './components/review/ReviewQueueView';
import { SettingsView } from './components/settings/SettingsView';
import { AuditLogView } from './components/audit/AuditLogView';
import { InvoiceCreationFlow } from './components/invoices/InvoiceCreationFlow';
// Admin Views
import { OrganizationsView } from './components/admin/OrganizationsView';
import { UsersView } from './components/admin/UsersView';

const AppContent: React.FC = () => {
  const { currentOrg } = useAccounting();
  const { isAuthenticated, isInitializing } = useAppSelector((state) => state.auth);
  const organizationState = useAppSelector((state) => state.organizations);

  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    const pathname = window.location.pathname;
    return pathname && pathname !== '/' ? pathname : '/dashboard';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  // Navigation Handler
  const navigate = (route: string) => {
    setCurrentRoute(route);
    if (window.location.pathname !== route) {
      window.history.pushState({}, '', route);
    }
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname || '/dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center text-xs text-neutral-500 font-mono">
        Restoring secure session...
      </div>
    );
  }

  if (currentRoute === '/reset-password') {
    return <ResetPasswordPage navigate={navigate} />;
  }

  // Public / Auth routing if not authenticated
  if (!isAuthenticated) {
    if (currentRoute === '/login') {
      return <LoginPage navigate={navigate} />;
    }
    if (currentRoute === '/signup') {
      return <SignupPage navigate={navigate} />;
    }
    if (currentRoute === '/forgot-password') {
      return <ForgotPasswordPage navigate={navigate} />;
    }
    return <LandingPage navigate={navigate} />;
  }

  const organizationIsInitializing =
    isAuthenticated &&
    (organizationState.status === 'idle' ||
      organizationState.status === 'loading' ||
      organizationState.currentStatus === 'loading');
  if (organizationIsInitializing) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center text-xs text-neutral-500 font-mono">
        Loading your organization...
      </div>
    );
  }
  if (isAuthenticated && organizationState.status === 'failed') {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm font-semibold text-neutral-900">Unable to load your organization</p>
        <p className="max-w-md text-xs text-neutral-500">{organizationState.error?.message || 'Please refresh and try again.'}</p>
        <button type="button" onClick={() => window.location.reload()} className="px-3 py-1.5 bg-neutral-950 text-white rounded-xs text-xs font-mono">Retry</button>
      </div>
    );
  }
  // Onboarding is valid only after the backend confirms that no organization exists.
  if (isAuthenticated && organizationState.status === 'succeeded' && organizationState.items.length === 0) {
    return <CreateOrganizationPage navigate={navigate} />;
  }
  if (!currentOrg || currentRoute === '/onboarding' || currentRoute === '/create-organization' || currentRoute === '/new-business') {
    return <CreateOrganizationPage navigate={navigate} />;

  }
  // Render view based on route
  const renderCurrentView = () => {
    switch (currentRoute) {
      case '/dashboard':
      case '/insights':
        return <DashboardView navigate={navigate} />;
      case '/transactions':
        return <TransactionsView navigate={navigate} />;
      case '/sales':
        return <SalesView navigate={navigate} />;
      case '/sales/create-invoice':
      case '/invoices/create':
      case '/create-invoice':
        return (
          <InvoiceCreationFlow
            onBackToSales={() => navigate('/sales')}
            onInvoiceCreated={() => navigate('/sales')}
          />
        );
      case '/purchases':
        return <PurchasesView navigate={navigate} />;
      case '/catalog':
      case '/products':
        return <CatalogView navigate={navigate} />;
      case '/expenses':
        return <ExpensesView navigate={navigate} />;
      case '/banking':
        return <BankingView navigate={navigate} />;
      case '/customers':
        return <CustomersView navigate={navigate} />;
      case '/vendors':
        return <VendorsView navigate={navigate} />;
      case '/gst':
        return <GstView navigate={navigate} />;
      case '/reports':
        return <ReportsView navigate={navigate} />;
      case '/ai-assistant':
        return <AiAssistantView navigate={navigate} />;
      case '/ai-assistant/documents':
        return <DocumentScannerView navigate={navigate} />;
      case '/review':
        return <ReviewQueueView navigate={navigate} />;
      case '/settings':
      case '/settings/business':
      case '/settings/users':
        return <SettingsView navigate={navigate} />;
      case '/audit-log':
        return <AuditLogView navigate={navigate} />;
      case '/admin/organizations':
        return <OrganizationsView navigate={navigate} />;
      case '/admin/users':
        return <UsersView navigate={navigate} />;
      default:
        return <DashboardView navigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex font-sans antialiased overflow-x-hidden">
      {/* App Sidebar (Desktop + Mobile Drawer) */}
      <Sidebar
        currentRoute={currentRoute}
        navigate={navigate}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        setMobileOpen={setMobileMenuOpen}
      />

      {/* Main Workspace Layout */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-[padding] duration-300 ease-in-out motion-reduce:transition-none pl-0 ${
          sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-64'
        }`}
      >
        {/* Top Header Navigation */}
        <TopNav
          currentRoute={currentRoute}
          navigate={navigate}
          openSearch={() => setIsSearchOpen(true)}
          openNotifications={() => setIsNotificationsOpen(true)}
          openMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
          {renderCurrentView()}
        </main>
      </div>

      {/* Modals & Drawers */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        navigate={navigate}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        navigate={navigate}
      />
    </div>
  );
};

export default function App() {
  return (
    <AccountingProvider>
      <AppContent />
    </AccountingProvider>
  );
}


