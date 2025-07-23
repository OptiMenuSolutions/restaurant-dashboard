import { NavLink } from "react-router-dom";
import styles from "./Sidebar.module.css";

function Sidebar() {
  return (
    <div className={styles.sidebar}>
      <h2 className={styles.title}>My Dashboard</h2>
      <nav className={styles.nav}>
        <NavLink to="/" end className={({ isActive }) => isActive ? styles.active : ""}>Dashboard</NavLink>
        <NavLink to="/invoices" className={({ isActive }) => isActive ? styles.active : ""}>Invoices</NavLink>
        <NavLink to="/ingredients" className={({ isActive }) => isActive ? styles.active : ""}>Ingredients</NavLink>
        <NavLink to="/menu-items" className={({ isActive }) => isActive ? styles.active : ""}>Menu Items</NavLink>
      </nav>
    </div>
  );
}

export default Sidebar;
