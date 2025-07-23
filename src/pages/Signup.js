import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";

export default function Signup() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    restaurant_name: "",
  });
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");

    const { email, password, full_name, restaurant_name } = formData;

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setErrorMsg(authError.message);
      return;
    }

    const userId = authData?.user?.id;

    // 2. Save additional profile info in `profiles` table
    if (userId) {
      const { error: dbError } = await supabase.from("profiles").insert([
        {
          id: userId,
          email,
          full_name,
          restaurant_name,
        },
      ]);

      if (dbError) {
        setErrorMsg("User created, but failed to save profile.");
        return;
      }

      // 3. Redirect or show confirmation
      navigate("/dashboard"); // or wherever your main page is
    }
  }

  return (
    <div style={{ maxWidth: "400px", margin: "0 auto", paddingTop: "2rem" }}>
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <label>
          Full Name:
          <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required />
        </label>
        <br />
        <label>
          Restaurant Name:
          <input type="text" name="restaurant_name" value={formData.restaurant_name} onChange={handleChange} required />
        </label>
        <br />
        <label>
          Email:
          <input type="email" name="email" value={formData.email} onChange={handleChange} required />
        </label>
        <br />
        <label>
          Password:
          <input type="password" name="password" value={formData.password} onChange={handleChange} required />
        </label>
        <br />
        <button type="submit">Create Account</button>
        {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
      </form>
    </div>
  );
}
