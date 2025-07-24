// File: src/components/Layout.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Layout.module.css';
import supabase from '../supabaseClient';

export default function Layout({ children }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      navigate('/login');
    } else {
      alert('Logout failed.');
    }
  };

  return (
    <div className={styles.wrapper}>
      <aside className={styles.sidebar}>
        <h2>OptiMenu</h2>
        <nav>
          <ul>
            <li><Link to="/">Dashboard</Link></li>
            <li><Link to="/invoices">Invoices</Link></li>
            <li><Link to="/ingredients">Ingredients</Link></li>
            <li><Link to="/menu-items">Menu Items</Link></li>
          </ul>
        </nav>
        <button className={styles.logoutButton} onClick={handleLogout}>
          Log Out
        </button>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
