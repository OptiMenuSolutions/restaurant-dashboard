// File: src/pages/Signup.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import supabase from '../supabaseClient';
import styles from './Signup.module.css';
import { v4 as uuidv4 } from 'uuid'; // Ensure uuid is installed

export default function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    restaurantName: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    const restaurantId = uuidv4();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
          restaurant_name: formData.restaurantName,
          restaurant_id: restaurantId,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    // If email confirmation is required, no user is returned — stop here
    if (!data.user) {
      setMessage('Signup successful! Please check your email to confirm your account before logging in.');
      return;
    }

    // Insert profile now that user exists
    const { error: insertError } = await supabase.from('profiles').insert([
      {
        id: data.user.id,
        email: formData.email,
        full_name: formData.fullName,
        restaurant_name: formData.restaurantName,
        restaurant_id: restaurantId,
      },
    ]);

    if (insertError) {
      setError('Failed to save profile info: ' + insertError.message);
      console.error('Insert profile error:', insertError);
      return;
    }

    navigate('/login');
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <h2 className={styles.title}>Sign Up</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <input
            name="fullName"
            type="text"
            placeholder="Full Name"
            value={formData.fullName}
            onChange={handleChange}
            required
          />
          <input
            name="restaurantName"
            type="text"
            placeholder="Restaurant Name"
            value={formData.restaurantName}
            onChange={handleChange}
            required
          />
          <button type="submit" className={styles.button}>Sign Up</button>
        </form>
        {error && <p className={styles.error}>{error}</p>}
        {message && <p className={styles.message}>{message}</p>}
        <p className={styles.login}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
