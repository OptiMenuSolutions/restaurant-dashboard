// pages/index.js
import Head from 'next/head'
import Link from 'next/link'

export default function Home() {
  return (
    <>
      <Head>
        <title>optiMenu Solutions - Turn Your Restaurant Data Into Profit</title>
        <meta name="description" content="AI-powered insights that show you exactly what each dish costs to make, what to push each day, and how to eliminate food waste." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className="header">
        <nav className="nav">
          <Link href="/" className="logo">
            <img src="/optimenu-logo.png" alt="optiMenu Solutions" className="logo-img" />
          </Link>
          <ul className="nav-links">
            <li><Link href="#services">Solutions</Link></li>
            <li><Link href="#how-it-works">How It Works</Link></li>
            <li><Link href="#contact">Contact</Link></li>
          </ul>
          <div className="nav-actions">
            <Link href="/admin" className="btn btn-secondary">
              Restaurant Login
            </Link>
            <Link href="/client" className="btn btn-primary">
              Start Free Trial
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="main">
        {/* Hero Section */}
        <section className="hero">
          <div className="hero-content">
            <h1>Turn Your Restaurant Data Into Profit</h1>
            <p>AI-powered insights that show you exactly what each dish costs to make, what to push each day, and how to eliminate food waste—all in one dashboard.</p>
            <div className="hero-actions">
              <Link href="/client" className="btn btn-hero btn-primary">
                Start Free Trial
              </Link>
              <Link href="#services" className="btn btn-hero btn-secondary">
                See Demo
              </Link>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="services">
          <div className="container">
            <div className="section-header">
              <h2>Built for Restaurant Success</h2>
              <p>Stop guessing at food costs—know exactly what each dish costs you today and make data-driven decisions that directly impact your profit margins.</p>
            </div>
            <div className="services-grid">
              <div className="service-item">
                <h3>Real-Time Cost Analysis</h3>
                <p>Track actual food costs per dish using invoice data and recipes. Know your true margins on every menu item, updated daily with real pricing from your suppliers.</p>
              </div>
              <div className="service-item">
                <h3>AI-Driven Menu Optimization</h3>
                <p>Get daily recommendations on which dishes to promote based on inventory levels, expiration dates, and profit margins to minimize waste and maximize profit.</p>
              </div>
              <div className="service-item">
                <h3>Interactive Margin Planning</h3>
                <p>Experiment with portion sizes and ingredient substitutions to see how changes impact your bottom line before implementing them in your kitchen.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="stats">
          <div className="container">
            <div className="stats-grid">
              <div className="stat-item">
                <h3>6+</h3>
                <p>Years Restaurant Experience</p>
              </div>
              <div className="stat-item">
                <h3>Real-Time</h3>
                <p>Cost Tracking</p>
              </div>
              <div className="stat-item">
                <h3>Daily</h3>
                <p>AI Recommendations</p>
              </div>
              <div className="stat-item">
                <h3>30%</h3>
                <p>Average Waste Reduction</p>
              </div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="cta">
          <div className="container">
            <h2>Ready to Stop Food Waste and Boost Profits?</h2>
            <p>Join restaurants across the nation who are making data-driven decisions that directly impact their bottom line.</p>
            <Link href="/client" className="btn btn-cta">
              Start Reducing Waste Today
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>Solutions</h3>
            <ul className="footer-links">
              <li><Link href="#">Cost Analysis</Link></li>
              <li><Link href="#">Menu Optimization</Link></li>
              <li><Link href="#">Waste Reduction</Link></li>
              <li><Link href="#">Margin Planning</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Resources</h3>
            <ul className="footer-links">
              <li><Link href="#">Getting Started</Link></li>
              <li><Link href="#">Case Studies</Link></li>
              <li><Link href="#">Restaurant Guide</Link></li>
              <li><Link href="#">Support Center</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Company</h3>
            <ul className="footer-links">
              <li><Link href="#">About Us</Link></li>
              <li><Link href="#">Our Story</Link></li>
              <li><Link href="#">Contact</Link></li>
              <li><Link href="#">Careers</Link></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Legal</h3>
            <ul className="footer-links">
              <li><Link href="#">Privacy Policy</Link></li>
              <li><Link href="#">Terms of Service</Link></li>
              <li><Link href="#">Data Security</Link></li>
              <li><Link href="#">GDPR</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 optiMenu Solutions. All rights reserved.</p>
        </div>
      </footer>

      <style jsx>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.5;
          color: #2d2d2d;
          background: #ffffff;
        }

        /* Header */
        .header {
          background: #ffffff;
          border-bottom: 1px solid #e5e5e5;
          position: fixed;
          top: 0;
          width: 100%;
          z-index: 1000;
        }

        .nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px;
          height: 80px;
        }

        .logo-img {
          height: 40px;
          width: auto;
        }

        .logo {
          display: flex;
          align-items: center;
        }

        .nav-links {
          display: flex;
          list-style: none;
          gap: 40px;
        }

        .nav-links a {
          text-decoration: none;
          color: #6b6b6b;
          font-weight: 400;
          font-size: 15px;
          transition: color 0.2s ease;
        }

        .nav-links a:hover {
          color: #2d2d2d;
        }

        .nav-actions {
          display: flex;
          gap: 20px;
          align-items: center;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 2px;
          font-weight: 500;
          font-size: 14px;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-block;
          letter-spacing: 0.2px;
        }

        .btn-primary {
          background: #2d2d2d;
          color: #ffffff;
        }

        .btn-primary:hover {
          background: #1a1a1a;
        }

        .btn-secondary {
          background: transparent;
          color: #2d2d2d;
          border: 1px solid #d0d0d0;
        }

        .btn-secondary:hover {
          border-color: #2d2d2d;
        }

        /* Main Content */
        .main {
          margin-top: 80px;
        }

        /* Hero Section */
        .hero {
          background: #ffffff;
          padding: 120px 40px;
          text-align: center;
        }

        .hero-content {
          max-width: 800px;
          margin: 0 auto;
        }

        .hero h1 {
          font-size: 48px;
          font-weight: 300;
          margin-bottom: 24px;
          line-height: 1.2;
          color: #2d2d2d;
          letter-spacing: -1px;
        }

        .hero p {
          font-size: 20px;
          margin-bottom: 48px;
          color: #6b6b6b;
          font-weight: 300;
          line-height: 1.4;
        }

        .hero-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .btn-hero {
          padding: 16px 32px;
          font-size: 15px;
          font-weight: 500;
        }

        /* Services Section */
        .services {
          padding: 100px 40px;
          background: #f8f8f8;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-header {
          text-align: center;
          margin-bottom: 80px;
        }

        .section-header h2 {
          font-size: 36px;
          font-weight: 300;
          margin-bottom: 16px;
          color: #2d2d2d;
          letter-spacing: -0.5px;
        }

        .section-header p {
          font-size: 18px;
          color: #6b6b6b;
          font-weight: 300;
          max-width: 600px;
          margin: 0 auto;
        }

        .services-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 60px;
        }

        .service-item {
          text-align: left;
        }

        .service-item h3 {
          font-size: 24px;
          font-weight: 400;
          margin-bottom: 16px;
          color: #2d2d2d;
        }

        .service-item p {
          color: #6b6b6b;
          font-size: 16px;
          line-height: 1.6;
          font-weight: 300;
        }

        /* Stats Section */
        .stats {
          padding: 100px 40px;
          background: #ffffff;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 60px;
          text-align: center;
        }

        .stat-item h3 {
          font-size: 48px;
          font-weight: 300;
          color: #2d2d2d;
          margin-bottom: 8px;
        }

        .stat-item p {
          font-size: 16px;
          color: #6b6b6b;
          font-weight: 300;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        /* CTA Section */
        .cta {
          background: #2d2d2d;
          color: #ffffff;
          padding: 100px 40px;
          text-align: center;
        }

        .cta h2 {
          font-size: 36px;
          font-weight: 300;
          margin-bottom: 24px;
          letter-spacing: -0.5px;
        }

        .cta p {
          font-size: 18px;
          margin-bottom: 40px;
          color: #b0b0b0;
          font-weight: 300;
        }

        .btn-cta {
          background: #ffffff;
          color: #2d2d2d;
          padding: 16px 40px;
          font-size: 15px;
          font-weight: 500;
        }

        .btn-cta:hover {
          background: #f0f0f0;
        }

        /* Footer */
        .footer {
          background: #f0f0f0;
          padding: 80px 40px 40px;
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 60px;
        }

        .footer-section h3 {
          color: #2d2d2d;
          margin-bottom: 24px;
          font-size: 16px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .footer-links {
          list-style: none;
        }

        .footer-links li {
          margin-bottom: 12px;
        }

        .footer-links a {
          color: #6b6b6b;
          text-decoration: none;
          font-size: 14px;
          font-weight: 300;
          transition: color 0.2s ease;
        }

        .footer-links a:hover {
          color: #2d2d2d;
        }

        .footer-bottom {
          max-width: 1200px;
          margin: 60px auto 0;
          padding-top: 40px;
          border-top: 1px solid #d0d0d0;
          text-align: center;
          color: #6b6b6b;
          font-size: 14px;
          font-weight: 300;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .nav {
            padding: 0 20px;
          }

          .nav-links {
            display: none;
          }

          .hero {
            padding: 80px 20px;
          }

          .hero h1 {
            font-size: 36px;
          }

          .hero p {
            font-size: 18px;
          }

          .hero-actions {
            flex-direction: column;
            align-items: center;
          }

          .btn-hero {
            width: 100%;
            max-width: 280px;
          }

          .services, .stats, .cta {
            padding: 80px 20px;
          }

          .footer {
            padding: 60px 20px 40px;
          }
        }
      `}</style>
    </>
  )
}