// File: src/pages/Invoices.js
import React, { useState, useEffect } from "react";
import styles from "./Invoices.module.css";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";
import Layout from "../components/Layout";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    number: "",
    date: "",
    supplier: "",
    amount: "",
    file: null,
  });
  const [confirmationMessage, setConfirmationMessage] = useState("");
  const [restaurantId, setRestaurantId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getRestaurantId();
  }, []);

  useEffect(() => {
    if (restaurantId) {
      fetchInvoices();
    }
  }, [restaurantId]);

  async function getRestaurantId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("restaurant_id")
      .eq("id", user.id)
      .single();

    if (!error && data?.restaurant_id) {
      setRestaurantId(data.restaurant_id);
    }
  }

  async function fetchInvoices() {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("date", { ascending: false });

    if (!error) setInvoices(data);
  }

  function handleChange(e) {
    const { name, value, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  }

  function validateForm() {
    const { number, date, supplier, amount, file } = formData;
    return number && date && supplier && amount && file;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) {
      alert("Please fill in all fields and select a file.");
      return;
    }

    const fileExt = formData.file.name.split(".").pop();
    const filePath = `invoices/${formData.number}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(filePath, formData.file);

    if (uploadError) {
      alert("Failed to upload file.");
      return;
    }

    const publicURL = supabase.storage
      .from("invoices")
      .getPublicUrl(filePath).data.publicUrl;

    const { error: insertError } = await supabase.from("invoices").insert([
      {
        number: formData.number,
        date: formData.date,
        supplier: formData.supplier,
        amount: parseFloat(formData.amount),
        file_url: publicURL,
        restaurant_id: restaurantId, // ✅ critical field
      },
    ]);

    if (insertError) {
      alert("Failed to save invoice metadata.");
      return;
    }

    setConfirmationMessage("Invoice uploaded successfully!");
    setFormData({ number: "", date: "", supplier: "", amount: "", file: null });
    setShowForm(false);
    fetchInvoices();
  }

  return (
    <Layout>
      <div className={styles.container}>
        <h1 className={styles.heading}>Invoices</h1>

        <button
          className={styles.uploadButton}
          onClick={() => setShowForm(true)}
        >
          Upload Invoice
        </button>

        {showForm && (
          <form className={styles.form} onSubmit={handleSubmit}>
            <label>
              Invoice No.
              <input
                type="text"
                name="number"
                value={formData.number}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Invoice Date
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Supplier
              <input
                type="text"
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Total Amount
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                step="0.01"
                required
              />
            </label>
            <label>
              File (PDF or Image)
              <input
                type="file"
                name="file"
                onChange={handleChange}
                accept="application/pdf,image/*"
                required
              />
            </label>
            <button type="submit">Submit</button>
          </form>
        )}

        {confirmationMessage && (
          <p className={styles.confirmation}>{confirmationMessage}</p>
        )}

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Invoice No.</th>
              <th>Invoice Date</th>
              <th>Supplier</th>
              <th>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                onClick={() => navigate(`/invoices/${invoice.id}`)}
                className={styles.clickableRow}
              >
                <td>{invoice.number}</td>
                <td>{invoice.date}</td>
                <td>{invoice.supplier}</td>
                <td>${invoice.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
