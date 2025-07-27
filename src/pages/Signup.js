// File: src/pages/Signup.js
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import supabase from '../supabaseClient';
import styles from './Signup.module.css';
import { v4 as uuidv4 } from 'uuid';

export default function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    restaurantName: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (loading) return;
    
    setLoading(true);
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
      setLoading(false);
      return;
    }

    // If email confirmation is required, no user is returned — stop here
    if (!data.user) {
      setMessage('Signup successful! Please check your email to confirm your account before logging in.');
      setLoading(false);
      return;
    }

    // Only create profile if user is immediately available (no email confirmation required)
    // If email confirmation is required, the profile will be created during first login
    if (data.user && data.session) {
      // Insert profile - the database trigger will automatically create the restaurant
      const { error: insertError } = await supabase.from('profiles').insert([
        {
          id: data.user.id,
          email: formData.email,
          full_name: formData.fullName,
          restaurant_name: formData.restaurantName,
          restaurant_id: null, // Will be updated by the database trigger
        },
      ]);

      if (insertError) {
        setError('Failed to save profile info: ' + insertError.message);
        console.error('Insert profile error:', insertError);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
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
            disabled={loading}
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={loading}
          />
          <input
            name="fullName"
            type="text"
            placeholder="Full Name"
            value={formData.fullName}
            onChange={handleChange}
            required
            disabled={loading}
          />
          <input
            name="restaurantName"
            type="text"
            placeholder="Restaurant Name"
            value={formData.restaurantName}
            onChange={handleChange}
            required
            disabled={loading}
          />
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Signing Up...' : 'Sign Up'}
          </button>
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