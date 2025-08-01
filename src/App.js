import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Ingredients from './pages/Ingredients';
import MenuItems from './pages/MenuItems';
import IngredientDetail from './pages/IngredientDetail';
import InvoiceDetail from './pages/InvoiceDetail';
import MenuItemDetail from './pages/MenuItemDetail';
import MenuItemCostBreakdown from './pages/MenuItemCostBreakdown'; // NEW IMPORT
import Signup from './pages/Signup';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import PendingInvoices from './pages/PendingInvoices';
import InvoiceEditor from './pages/InvoiceEditor';
import MenuItemsManagement from './pages/MenuItemsManagement';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) {
    window.location.href = '/login';
    return null;
  }
  return children;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Admin routes (no protection needed - handled in AdminLogin) */}
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/pending-invoices" element={<PendingInvoices />} />
          <Route path="/admin/invoice-editor/:id" element={<InvoiceEditor />} />
          <Route path="/admin/menu-items" element={<MenuItemsManagement />} />
          <Route path="/admin/menu-item-cost-breakdown/:id" element={<MenuItemCostBreakdown />} /> {/* NEW ROUTE */}

          {/* Protected client routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices"
            element={
              <ProtectedRoute>
                <Invoices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ingredients"
            element={
              <ProtectedRoute>
                <Ingredients />
              </ProtectedRoute>
            }
          />
          <Route
            path="/menu-items"
            element={
              <ProtectedRoute>
                <MenuItems />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ingredients/:id"
            element={
              <ProtectedRoute>
                <IngredientDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/invoices/:id"
            element={
              <ProtectedRoute>
                <InvoiceDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/menu-items/:id"
            element={
              <ProtectedRoute>
                <MenuItemDetail />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;