import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import supabase from '../supabaseClient';
import styles from './Signup.module.css';

export default function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    restaurantName: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function handleChange(e) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    const user = data?.user;
    if (!user) {
      setError('Signup succeeded, but no user returned.');
      console.error('Signup response:', data);
      return;
    }

    const { error: insertError } = await supabase.from('profiles').insert([
      {
        id: user.id,
        email: formData.email,
        full_name: formData.fullName,
        restaurant_name: formData.restaurantName,
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
        <p className={styles.login}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
