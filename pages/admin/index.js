// pages/admin/index.js
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import supabase from '../../lib/supabaseClient';
import {
  IconDashboard,
  IconClock,
  IconFileText,
  IconTrendingUp,
  IconBook,
  IconSearch,
  IconUsers,
  IconSettings,
  IconHelp,
  IconBell,
  IconMenu2,
  IconX,
  IconChevronLeft,
} from '@tabler/icons-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    clientCount: 0,
    pendingInvoices: 0,
    totalInvoices: 0,
    totalRevenue: 0,
    loading: true
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/admin/login');
      }
    };
    checkUser();
  }, [router]);

  async function fetchDashboardStats() {
    try {
      // Get client count (restaurants)
      const { data: restaurants, error: restaurantError } = await supabase
        .from('restaurants')
        .select('id');

      if (restaurantError) throw restaurantError;

      // Get all invoices
      const { data: allInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id, number, date, supplier, amount');

      if (invoicesError) throw invoicesError;

      // Filter for pending invoices
      const pendingInvoices = allInvoices.filter(invoice => {
        return !invoice.number || !invoice.date || !invoice.supplier || !invoice.amount;
      });

      // Calculate total revenue
      const totalRevenue = allInvoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);

      setStats({
        clientCount: restaurants?.length || 0,
        pendingInvoices: pendingInvoices?.length || 0,
        totalInvoices: allInvoices?.length || 0,
        totalRevenue,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/admin/login');
  }

  const navigationData = {
    main: [
      {
        title: "Dashboard",
        icon: IconDashboard,
        href: "/admin",
        active: true
      },
      {
        title: "Pending Review",
        icon: IconClock,
        href: "/admin/pending-invoices",
        badge: stats.pendingInvoices > 0 ? stats.pendingInvoices : null
      },
      {
        title: "Invoices",
        icon: IconFileText,
        href: "/admin/total-invoices"
      },
      {
        title: "Analytics",
        icon: IconTrendingUp,
        href: "/admin/analytics"
      }
    ],
    resources: [
      {
        title: "Ingredients",
        icon: IconBook,
        href: "/admin/ingredients"
      },
      {
        title: "Menu Items",
        icon: IconSearch,
        href: "/admin/menu-items"
      },
      {
        title: "Clients",
        icon: IconUsers,
        href: "/admin/clients"
      }
    ],
    secondary: [
      {
        title: "Settings",
        icon: IconSettings,
        href: "/admin/settings"
      },
      {
        title: "Help",
        icon: IconHelp,
        href: "/admin/help"
      }
    ]
  };

  const NavItem = ({ item, collapsed = false }) => {
    const IconComponent = item.icon;
    const isActive = router.pathname === item.href;
    
    return (
      <button
        onClick={() => router.push(item.href)}
        className={`
          flex items-center gap-3 w-full px-3 py-2.5 rounded-lg transition-all duration-200
          ${isActive 
            ? 'bg-[#ADD8E6] text-gray-900 shadow-lg' 
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }
          ${collapsed ? 'justify-center' : ''}
        `}
      >
        <IconComponent size={20} className="flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="font-medium">{item.title}</span>
            {item.badge && (
              <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {item.badge}
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  if (stats.loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-gray-300 border-t-[#ADD8E6] rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="flex">
        {/* Modern Sidebar */}
        <aside className={`
            flex flex-col bg-gray-900 border-r border-gray-700 transition-all duration-300
            ${sidebarCollapsed ? 'w-20' : 'w-72'}
            ${mobileMenuOpen ? 'fixed inset-y-0 left-0 z-50 translate-x-0' : 'fixed inset-y-0 left-0 z-50 -translate-x-full'}
            lg:relative lg:translate-x-0
        `}>
          {/* Sidebar Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 min-h-[80px]">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 text-[#ADD8E6]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18m-9-9v18"/>
                </svg>
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col">
                  <span className="font-semibold text-lg text-gray-900">OptiMenu</span>
                  <span className="text-xs text-gray-500">Admin Portal</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <IconChevronLeft size={16} className={`transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <IconX size={16} />
            </button>
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 px-4 py-6 overflow-y-auto">
            {/* Main Navigation */}
            <nav className="space-y-8">
              <div>
                {!sidebarCollapsed && (
                  <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Main
                  </h3>
                )}
                <div className="space-y-1">
                  {navigationData.main.map((item, index) => (
                    <NavItem key={index} item={item} collapsed={sidebarCollapsed} />
                  ))}
                </div>
              </div>

              {/* Resources Navigation */}
              <div>
                {!sidebarCollapsed && (
                  <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Resources
                  </h3>
                )}
                <div className="space-y-1">
                  {navigationData.resources.map((item, index) => (
                    <NavItem key={index} item={item} collapsed={sidebarCollapsed} />
                  ))}
                </div>
              </div>

              {/* Secondary Navigation */}
              <div className="pt-8 border-t border-gray-200">
                <div className="space-y-1">
                  {navigationData.secondary.map((item, index) => (
                    <NavItem key={index} item={item} collapsed={sidebarCollapsed} />
                  ))}
                </div>
              </div>
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-gray-200">
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center justify-center w-8 h-8 bg-[#ADD8E6] text-gray-900 rounded-full font-semibold">
                A
              </div>
              {!sidebarCollapsed && (
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium text-gray-900">Admin User</span>
                  <span className="text-xs text-gray-500">Administrator</span>
                </div>
              )}
            </button>
            {!sidebarCollapsed && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <div className="text-sm font-medium text-gray-900">OptiMenu<sup className="text-xs">©</sup></div>
                  <div className="text-xs text-gray-500">All Rights Reserved 2025</div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-25 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1">
          {/* Header */}
          <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <IconMenu2 size={20} />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">System Overview</h1>
                  <p className="text-gray-600">Monitor your OptiMenu operations</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button className="flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full border border-gray-300 transition-colors">
                  <IconBell size={20} />
                </button>
                <button className="flex items-center justify-center w-10 h-10 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full border border-gray-300 transition-colors">
                  <IconSettings size={20} />
                </button>
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <main className="p-6 bg-gray-50">
            {/* Overview Stats Grid */}
            <section className="mb-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div 
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                  onClick={() => router.push('/admin/total-invoices')}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg text-gray-600">
                      <IconFileText size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-gray-900">{stats.totalInvoices}</div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Total Invoices</div>
                      <div className="text-xs text-gray-600">All processed invoices</div>
                    </div>
                    <div className="bg-[#ADD8E6] text-gray-900 text-xs font-semibold px-2 py-1 rounded">
                      +12%
                    </div>
                  </div>
                </div>

                <div 
                  className={`bg-white border rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer ${
                    stats.pendingInvoices > 0 ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  onClick={() => router.push('/admin/pending-invoices')}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${
                      stats.pendingInvoices > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <IconClock size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-gray-900">{stats.pendingInvoices}</div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Pending Review</div>
                      <div className="text-xs text-gray-600">
                        {stats.pendingInvoices > 0 ? 'Requires attention' : 'All caught up!'}
                      </div>
                    </div>
                    {stats.pendingInvoices > 0 && (
                      <div className="bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
                        Action needed
                      </div>
                    )}
                  </div>
                </div>

                <div 
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
                  onClick={() => router.push('/admin/clients')}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg text-gray-600">
                      <IconUsers size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-gray-900">{stats.clientCount}</div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Active Clients</div>
                      <div className="text-xs text-gray-600">Restaurant partners</div>
                    </div>
                    <div className="bg-[#ADD8E6] text-gray-900 text-xs font-semibold px-2 py-1 rounded">
                      +3
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-lg text-gray-600">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="1" x2="12" y2="23"/>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-2xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</div>
                      <div className="text-sm font-medium text-gray-900 mb-1">Total Revenue</div>
                      <div className="text-xs text-gray-600">Invoice value processed</div>
                    </div>
                    <div className="bg-[#ADD8E6] text-gray-900 text-xs font-semibold px-2 py-1 rounded">
                      +8%
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Recent Activity */}
            <section className="mb-8">
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
                  <button 
                    className="text-gray-600 hover:text-gray-900 text-sm transition-colors"
                    onClick={() => router.push('/admin/analytics')}
                  >
                    View all activity →
                  </button>
                </div>
                <div className="space-y-4">
                  {[
                    {
                      icon: IconFileText,
                      title: "Invoice FFD-2025-001 processed successfully",
                      subtitle: "Fresh Foods Direct • $481.25 • 10 items standardized",
                      details: "Updated pricing for Chicken Breast, Romaine Lettuce, Parmesan Cheese and 7 others",
                      time: "2 hours ago",
                      restaurant: "Test Restaurant"
                    },
                    {
                      icon: IconTrendingUp,
                      title: "Menu item costs recalculated",
                      subtitle: "Caesar Salad cost updated from $5.38 to $5.42",
                      details: "Automatic recalculation triggered by ingredient price changes",
                      time: "2 hours ago",
                      restaurant: "Test Restaurant"
                    },
                    {
                      icon: IconUsers,
                      title: "New restaurant partner onboarded",
                      subtitle: "Test Restaurant joined the platform",
                      details: "Account created and initial menu setup completed",
                      time: "1 day ago",
                      restaurant: "Test Restaurant"
                    }
                  ].map((activity, index) => {
                    const IconComponent = activity.icon;
                    return (
                      <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-center w-10 h-10 bg-white rounded-lg text-gray-600 flex-shrink-0 mt-1 shadow-sm">
                          <IconComponent size={16} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <div className="font-medium text-gray-900">{activity.title}</div>
                            <div className="bg-[#ADD8E6] text-gray-900 text-xs font-semibold px-2 py-1 rounded-full">
                              {activity.restaurant}
                            </div>
                          </div>
                          <div className="text-sm text-gray-700 mb-1">{activity.subtitle}</div>
                          <div className="text-xs text-gray-500">{activity.details}</div>
                        </div>
                        <div className="text-xs text-gray-500 flex-shrink-0 mt-1">
                          {activity.time}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* System Health */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">System Health</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">Data Processing</span>
                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                      Excellent
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">All invoice processing running smoothly</div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">Cost Accuracy</span>
                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                      99.8%
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">Ingredient cost calculations are precise</div>
                </div>
                
                <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">Active Integration</span>
                    <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2 py-1 rounded">
                      Syncing
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">Menu items updating with latest costs</div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}