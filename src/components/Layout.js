// File: src/components/Layout.js
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';
import supabase from '../supabaseClient';

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (!error) {
        navigate('/login');
      } else {
        console.error('Logout failed:', error);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { 
      path: '/', 
      label: 'Dashboard', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor"/>
        </svg>
      )
    },
    { 
      path: '/invoices', 
      label: 'Invoices', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="2" fill="none"/>
          <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" fill="none"/>
          <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2"/>
          <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2"/>
          <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      )
    },
    { 
      path: '/ingredients', 
      label: 'Ingredients', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      )
    },
    { 
      path: '/menu-items', 
      label: 'Menu Items', 
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="m9 14 2 2 4-4" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      )
    },
  ];

  return (
    <div className={styles.wrapper}>
      <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
        {/* Header */}
        <div className={styles.sidebarHeader}>
          <div className={styles.logoSection}>
            <div className={styles.logoIcon}>
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="8" fill="url(#gradient)"/>
                <path d="M8 12h16v8H8z" fill="white" opacity="0.9"/>
                <path d="M12 16h8v4h-8z" fill="white" opacity="0.7"/>
                <defs>
                  <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3B82F6"/>
                    <stop offset="1" stopColor="#1D4ED8"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            {!isCollapsed && (
              <div className={styles.logoText}>
                <span className={styles.brandName}>OptiMenu</span>
                <span className={styles.brandTagline}>Solutions</span>
              </div>
            )}
          </div>
          
          <button 
            className={styles.collapseButton}
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className={isCollapsed ? styles.rotated : ''}
            >
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className={styles.navigation}>
          <ul className={styles.navList}>
            {navItems.map((item) => (
              <li key={item.path} className={styles.navListItem}>
                <Link
                  to={item.path}
                  className={`${styles.navLink} ${isActive(item.path) ? styles.active : ''}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  {!isCollapsed && <span className={styles.navLabel}>{item.label}</span>}
                  {isActive(item.path) && <div className={styles.activeIndicator} />}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Section */}
        <div className={styles.userSection}>
          {!isCollapsed && (
            <div className={styles.userCard}>
              <div className={styles.userAvatar}>
                <img 
                  src="/api/placeholder/40/40" 
                  alt="User avatar" 
                  className={styles.avatarImage}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className={styles.avatarFallback} style={{display: 'none'}}>
                  <span>RU</span>
                </div>
              </div>
              <div className={styles.userInfo}>
                <div className={styles.userName}>Restaurant User</div>
                <div className={styles.userRole}>Manager</div>
              </div>
            </div>
          )}
          
          <button 
            className={styles.logoutButton} 
            onClick={handleLogout}
            title={isCollapsed ? "Sign Out" : undefined}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
            {!isCollapsed && <span className={styles.logoutText}>Sign Out</span>}
          </button>
        </div>
      </aside>
      
      <main className={styles.main}>
        <div className={styles.mainContent}>
          {children}
        </div>
      </main>
    </div>
  );
}