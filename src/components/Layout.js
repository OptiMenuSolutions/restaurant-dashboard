// File: src/components/Layout.js
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';
import supabase from '../supabaseClient';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      navigate('/login');
    } else {
      alert('Logout failed.');
    }
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/invoices', label: 'Invoices', icon: '📄' },
    { path: '/ingredients', label: 'Ingredients', icon: '🥬' },
    { path: '/menu-items', label: 'Menu Items', icon: '🍽️' },
  ];

  return (
    <div className={styles.wrapper}>
      <aside className={styles.sidebar}>
        {/* Logo Section */}
        <div className={styles.logoSection}>
          <div className={styles.logo}>
            <span className={styles.logoText}>opti</span>
            <span className={styles.logoTextLight}>Menu</span>
          </div>
          <div className={styles.logoSubtext}>solutions</div>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className={styles.spacer}></div>

        {/* User Section */}
        <div className={styles.userSection}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              <span>👤</span>
            </div>
            <div className={styles.userText}>
              <div className={styles.userName}>Restaurant User</div>
              <div className={styles.userRole}>Manager</div>
            </div>
          </div>
          
          <button className={styles.logoutButton} onClick={handleLogout}>
            <span className={styles.logoutIcon}>🚪</span>
            <span className={styles.logoutText}>Sign Out</span>
          </button>
        </div>
      </aside>
      
      <main className={styles.main}>{children}</main>
    </div>
  );
}