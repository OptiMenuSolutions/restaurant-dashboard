// pages/admin/index.js (Updated Dashboard)
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../components/AdminLayout';
import supabase from '../../lib/supabaseClient';
import {
  IconDashboard,
  IconClock,
  IconFileText,
  IconTrendingUp,
  IconUsers,
  IconBell,
  IconSettings,
  IconCheck,
} from '@tabler/icons-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    clientCount: 0,
    pendingInvoices: 0,
    totalInvoices: 0,
    totalRevenue: 0,
    loading: true
  });
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

  if (stats.loading) {
    return (
      <AdminLayout 
        pageTitle="System Overview" 
        pageDescription="Monitor your OptiMenu operations"
        pageIcon={IconDashboard}
      >
        <div className="p-6 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-3 border-gray-300 border-t-[#ADD8E6] rounded-full animate-spin"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout 
      pageTitle="System Overview" 
      pageDescription="Monitor your OptiMenu operations"
      pageIcon={IconDashboard}
    >
      {/* Dashboard Content */}
      <div className="p-6 space-y-8">
        {/* Overview Stats Grid */}
        <section>
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
        <section>
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
      </div>
    </AdminLayout>
  );
}