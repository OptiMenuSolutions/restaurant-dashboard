import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Invoices from "./pages/Invoices";
import InvoiceDetail from "./pages/InvoiceDetail";
import Ingredients from "./pages/Ingredients";
import IngredientDetail from "./pages/IngredientDetail";
import MenuItems from "./pages/MenuItems";
import MenuItemDetail from "./pages/MenuItemDetail";
import styles from "./App.module.css";

function App() {
  return (
    <div className={styles.app}>
      <Router>
        <Sidebar />
        <main className={styles.main}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/:invoiceId" element={<InvoiceDetail />} />
            <Route path="/ingredients" element={<Ingredients />} />
            <Route path="/ingredients/:ingredientId" element={<IngredientDetail />} />
            <Route path="/menu-items" element={<MenuItems />} />
            <Route path="/menu-items/:menuItemId" element={<MenuItemDetail />} />
          </Routes>
        </main>
      </Router>
    </div>
  );
}

export default App;
