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
            <li><Link href="#platform">Platform</Link></li>
            <li><Link href="#features">Features</Link></li>
            <li><Link href="#pricing">Pricing</Link></li>
            <li><Link href="#contact">Contact</Link></li>
          </ul>
          <div className="nav-actions">
            <Link href="/client/login" className="btn btn-secondary">
              Login
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
          <div className="hero-container">
            <div className="hero-content">
              <div className="hero-text">
                <h1 className="hero-title">
                  <span className="title-line">Turn Your Restaurant</span>
                  <span className="title-line">Data Into</span>
                  <div className="title-highlight">Profit</div>
                </h1>
                <p className="hero-description">
                  AI-powered insights that show you exactly what each dish costs to make, what to push each day, and how to eliminate food waste—all in one dashboard.
                </p>
                <div className="hero-actions">
                  <Link href="/client" className="btn btn-hero btn-primary">
                    Start Free Trial
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trusted By Section */}
        <section className="trusted-by">
          <div className="container">
            <div className="trusted-by-content">
              <p className="trusted-by-text">TRUSTED BY RESTAURANTS NATIONWIDE</p>
              <div className="trusted-by-logos">
                <div className="logo-placeholder">Restaurant Logo</div>
                <div className="logo-placeholder">Restaurant Logo</div>
                <div className="logo-placeholder">Restaurant Logo</div>
                <div className="logo-placeholder">Restaurant Logo</div>
                <div className="logo-placeholder">Restaurant Logo</div>
              </div>
            </div>
          </div>
        </section>

        {/* Platform Section */}
        <section id="platform" className="platform">
          <div className="container">
            <div className="platform-content">
              <div className="section-header">
                <h2>Restaurant Intelligence Platform</h2>
              </div>
              <div className="platform-grid">
                <div className="platform-card">
                  <div className="platform-card-content">
                    <div className="platform-tag">PLATFORM</div>
                    <h3>Real-time cost tracking and profit optimization for your entire menu</h3>
                  </div>
                  <div className="platform-image">
                    <div className="dashboard-preview">
                      <div className="dashboard-header">
                        <div className="dashboard-title">optiMenu Dashboard</div>
                        <div className="dashboard-metrics">
                          <div className="metric">
                            <div className="metric-value">23%</div>
                            <div className="metric-label">Cost Reduction</div>
                          </div>
                          <div className="metric">
                            <div className="metric-value">$2,847</div>
                            <div className="metric-label">Monthly Savings</div>
                          </div>
                        </div>
                      </div>
                      <div className="dashboard-chart">
                        <div className="chart-bars">
                          <div className="chart-bar" style={{height: '60%'}}></div>
                          <div className="chart-bar" style={{height: '80%'}}></div>
                          <div className="chart-bar" style={{height: '45%'}}></div>
                          <div className="chart-bar" style={{height: '90%'}}></div>
                          <div className="chart-bar" style={{height: '70%'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="platform-features">
                  <div className="feature-card">
                    <h4>AI-Powered Menu Optimization</h4>
                    <p>Get daily recommendations on which dishes to promote based on inventory levels, expiration dates, and profit margins.</p>
                  </div>
                  <div className="ai-platforms">
                    <p>Monitor food costs across your entire operation</p>
                    <div className="platform-icons">
                      <div className="platform-icon">📊</div>
                      <div className="platform-icon">🍽️</div>
                      <div className="platform-icon">📈</div>
                      <div className="platform-icon">🎯</div>
                      <div className="platform-icon">⚡</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="features">
          <div className="container">
            <div className="features-content">
              <div className="section-header">
                <div className="feature-tag">FEATURES</div>
                <h2>Track costs, gain insights, maximize profits</h2>
                <div className="feature-highlights">
                  <div className="highlight">Real-time cost analysis</div>
                  <div className="highlight-divider"></div>
                  <div className="highlight">AI-driven recommendations</div>
                  <div className="highlight-divider"></div>
                  <div className="highlight">Waste reduction tracking</div>
                  <div className="highlight-divider"></div>
                  <div className="highlight">Margin optimization</div>
                </div>
              </div>
              <div className="features-showcase">
                <div className="feature-showcase-image">
                  <div className="feature-dashboard">
                    <div className="feature-dashboard-header">
                      <h4>Popular menu optimizations for your restaurant</h4>
                    </div>
                    <div className="feature-list">
                      <div className="feature-item">
                        <div className="feature-icon">🔥</div>
                        <div className="feature-text">What dishes have the highest profit margins?</div>
                      </div>
                      <div className="feature-item">
                        <div className="feature-icon">📊</div>
                        <div className="feature-text">Which ingredients are driving up costs?</div>
                      </div>
                      <div className="feature-item">
                        <div className="feature-icon">⚡</div>
                        <div className="feature-text">What menu items should we promote today?</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Individual Feature Sections */}
        <section className="feature-sections">
          <div className="container">
            <div className="feature-section">
              <div className="feature-grid">
                <div className="feature-image">
                  <div className="feature-chart">
                    <div className="chart-title">Cost Analysis by Dish</div>
                    <div className="chart-content">
                      <div className="chart-item">
                        <span>Grilled Salmon</span>
                        <span className="chart-value">$8.50</span>
                      </div>
                      <div className="chart-item">
                        <span>Pasta Primavera</span>
                        <span className="chart-value">$4.25</span>
                      </div>
                      <div className="chart-item">
                        <span>Ribeye Steak</span>
                        <span className="chart-value">$15.75</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="feature-content">
                  <div className="feature-tag">FEATURES</div>
                  <h3>Real-Time Cost Analysis</h3>
                  <div className="feature-benefits">
                    <div className="benefit">Track actual food costs per dish using invoice data</div>
                    <div className="benefit-divider"></div>
                    <div className="benefit">Know your true margins on every menu item</div>
                    <div className="benefit-divider"></div>
                    <div className="benefit">Updated daily with real supplier pricing</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="feature-section">
              <div className="feature-grid reverse">
                <div className="feature-image">
                  <div className="feature-chart">
                    <div className="chart-title">AI Recommendations</div>
                    <div className="recommendation-list">
                      <div className="recommendation">
                        <div className="rec-icon">🎯</div>
                        <div className="rec-text">Promote Caesar Salad - high margin, trending up</div>
                      </div>
                      <div className="recommendation">
                        <div className="rec-icon">⚠️</div>
                        <div className="rec-text">Fish tacos - ingredients expiring in 2 days</div>
                      </div>
                      <div className="recommendation">
                        <div className="rec-icon">📈</div>
                        <div className="rec-text">Increase burger portions - cost savings available</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="feature-content">
                  <div className="feature-tag">FEATURES</div>
                  <h3>AI-Driven Menu Optimization</h3>
                  <div className="feature-benefits">
                    <div className="benefit">Daily recommendations based on inventory levels</div>
                    <div className="benefit-divider"></div>
                    <div className="benefit">Minimize waste with expiration tracking</div>
                    <div className="benefit-divider"></div>
                    <div className="benefit">Maximize profits with smart promotions</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="stats">
          <div className="container">
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">6+</div>
                <div className="stat-label">Years Restaurant Experience</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">Real-Time</div>
                <div className="stat-label">Cost Tracking</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">Daily</div>
                <div className="stat-label">AI Recommendations</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">30%</div>
                <div className="stat-label">Average Waste Reduction</div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="cta">
          <div className="container">
            <div className="cta-content">
              <div className="cta-badge">
                <div className="user-avatars">
                  <div className="avatar"></div>
                  <div className="avatar"></div>
                  <div className="avatar"></div>
                </div>
                <p>TRUSTED BY RESTAURANTS NATIONWIDE</p>
              </div>
              <h2>Turn your restaurant data into profit</h2>
              <div className="cta-actions">
                <Link href="/client" className="btn btn-hero btn-primary">
                  Start Free Trial
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="contact" className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <Link href="/" className="footer-logo">
                <img src="/optimenu-logo.png" alt="optiMenu Solutions" className="footer-logo-img" />
              </Link>
            </div>
            <div className="footer-section">
              <h4>Resources</h4>
              <ul className="footer-links">
                <li><Link href="#">Cost Analysis Guide</Link></li>
                <li><Link href="#">Menu Optimization</Link></li>
                <li><Link href="#">Restaurant Analytics</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Company</h4>
              <ul className="footer-links">
                <li><Link href="#">About Us</Link></li>
                <li><Link href="#">Our Story</Link></li>
                <li><Link href="#">Contact</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Contact</h4>
              <div className="footer-contact">
                <div className="contact-item">
                  <span>📧</span>
                  <span>help@optimenu.com</span>
                </div>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 optiMenu Solutions. All rights reserved.</p>
            <div className="footer-legal">
              <Link href="#">Privacy Policy</Link>
              <span>•</span>
              <Link href="#">Terms & Conditions</Link>
            </div>
          </div>
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
          line-height: 1.6;
          color: #323130;
          background: #ffffff;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
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
          padding: 0 24px;
          height: 80px;
        }

        .logo {
          display: flex;
          align-items: center;
        }

        .logo-img {
          height: 40px;
          width: auto;
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
          gap: 16px;
          align-items: center;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-weight: 500;
          font-size: 14px;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-block;
        }

        .btn-primary {
          background: linear-gradient(135deg, #064EE3 0%, #3D76EC 100%);
          color: #ffffff;
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 25px rgba(6, 78, 227, 0.3);
        }

        .btn-secondary {
          background: transparent;
          color: #2d2d2d;
          border: 1px solid #d0d0d0;
        }

        .btn-secondary:hover {
          border-color: #2d2d2d;
        }

        .btn-hero {
          padding: 16px 32px;
          font-size: 16px;
          font-weight: 600;
          border-radius: 8px;
        }

        /* Main */
        .main {
          margin-top: 80px;
        }

        /* Hero */
        .hero {
          background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
          padding: 120px 0;
          position: relative;
          overflow: hidden;
        }

        .hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 70% 20%, rgba(6, 78, 227, 0.1) 0%, transparent 50%);
        }

        .hero-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          position: relative;
          z-index: 2;
        }

        .hero-content {
          text-align: center;
        }

        .hero-title {
          font-size: 4rem;
          font-weight: 700;
          line-height: 1.1;
          margin-bottom: 24px;
          color: #2d2d2d;
        }

        .title-line {
          display: block;
        }

        .title-highlight {
          background: linear-gradient(135deg, #064EE3 0%, #3D76EC 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-description {
          font-size: 1.25rem;
          color: #6b6b6b;
          max-width: 600px;
          margin: 0 auto 40px;
          font-weight: 300;
        }

        .hero-actions {
          display: flex;
          justify-content: center;
          gap: 16px;
        }

        /* Trusted By */
        .trusted-by {
          padding: 60px 0;
          background: #fafafa;
        }

        .trusted-by-content {
          text-align: center;
        }

        .trusted-by-text {
          font-size: 12px;
          font-weight: 600;
          color: #8a8a8a;
          letter-spacing: 1px;
          margin-bottom: 32px;
        }

        .trusted-by-logos {
          display: flex;
          justify-content: center;
          gap: 40px;
          flex-wrap: wrap;
        }

        .logo-placeholder {
          padding: 16px 24px;
          background: #e0e0e0;
          border-radius: 6px;
          color: #8a8a8a;
          font-size: 14px;
        }

        /* Platform */
        .platform {
          padding: 120px 0;
          background: #ffffff;
        }

        .section-header {
          text-align: center;
          margin-bottom: 80px;
        }

        .section-header h2 {
          font-size: 2.5rem;
          font-weight: 600;
          color: #2d2d2d;
          margin-bottom: 16px;
        }

        .platform-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 60px;
          align-items: center;
        }

        .platform-card {
          background: linear-gradient(135deg, #064EE3 0%, #3D76EC 100%);
          border-radius: 16px;
          padding: 40px;
          color: white;
          position: relative;
          overflow: hidden;
        }

        .platform-tag {
          background: rgba(255, 255, 255, 0.2);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.5px;
          margin-bottom: 24px;
          display: inline-block;
        }

        .platform-card h3 {
          font-size: 1.5rem;
          font-weight: 600;
          line-height: 1.3;
          margin-bottom: 32px;
        }

        .platform-image {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 24px;
          backdrop-filter: blur(10px);
        }

        .dashboard-preview {
          background: rgba(255, 255, 255, 0.95);
          border-radius: 8px;
          padding: 20px;
          color: #2d2d2d;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .dashboard-title {
          font-weight: 600;
          font-size: 16px;
        }

        .dashboard-metrics {
          display: flex;
          gap: 24px;
        }

        .metric {
          text-align: center;
        }

        .metric-value {
          font-size: 18px;
          font-weight: 700;
          color: #064EE3;
        }

        .metric-label {
          font-size: 12px;
          color: #6b6b6b;
        }

        .dashboard-chart {
          height: 100px;
          background: #f8f9ff;
          border-radius: 6px;
          padding: 16px;
          display: flex;
          align-items: end;
        }

        .chart-bars {
          display: flex;
          gap: 8px;
          width: 100%;
          height: 100%;
          align-items: end;
        }

        .chart-bar {
          background: linear-gradient(135deg, #064EE3 0%, #3D76EC 100%);
          border-radius: 2px;
          flex: 1;
        }

        .platform-features {
          display: flex;
          flex-direction: column;
          gap: 40px;
        }

        .feature-card {
          background: #f8f9ff;
          padding: 32px;
          border-radius: 12px;
          border-left: 4px solid #064EE3;
        }

        .feature-card h4 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 12px;
          color: #2d2d2d;
        }

        .feature-card p {
          color: #6b6b6b;
          line-height: 1.6;
        }

        .ai-platforms {
          text-align: center;
        }

        .ai-platforms p {
          font-weight: 500;
          margin-bottom: 20px;
          color: #2d2d2d;
        }

        .platform-icons {
          display: flex;
          justify-content: center;
          gap: 16px;
        }

        .platform-icon {
          width: 48px;
          height: 48px;
          background: #f0f0f0;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        /* Features */
        .features {
          padding: 120px 0;
          background: #fafafa;
        }

        .feature-tag {
          background: #e6f2ff;
          color: #064EE3;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.5px;
          margin-bottom: 24px;
          display: inline-block;
        }

        .feature-highlights {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          margin-top: 32px;
        }

        .highlight {
          font-weight: 500;
          color: #2d2d2d;
        }

        .highlight-divider {
          width: 2px;
          height: 2px;
          background: #c0c0c0;
          border-radius: 50%;
        }

        .features-showcase {
          margin-top: 60px;
        }

        .feature-showcase-image {
          max-width: 800px;
          margin: 0 auto;
        }

        .feature-dashboard {
          background: white;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
        }

        .feature-dashboard-header h4 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 24px;
          color: #2d2d2d;
        }

        .feature-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: #f8f9ff;
          border-radius: 8px;
        }

        .feature-icon {
          font-size: 20px;
        }

        .feature-text {
          font-weight: 500;
          color: #2d2d2d;
        }

        /* Feature Sections */
        .feature-sections {
          padding: 120px 0;
          background: white;
        }

        .feature-section {
          margin-bottom: 120px;
        }

        .feature-section:last-child {
          margin-bottom: 0;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          align-items: center;
        }

        .feature-grid.reverse {
          direction: rtl;
        }

        .feature-grid.reverse > * {
          direction: ltr;
        }

        .feature-image {
          background: #f8f9ff;
          border-radius: 16px;
          padding: 32px;
        }

        .feature-chart {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
        }

        .chart-title {
          font-weight: 600;
          margin-bottom: 20px;
          color: #2d2d2d;
        }

        .chart-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .chart-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;
        }

        .chart-item:last-child {
          border-bottom: none;
        }

        .chart-value {
          font-weight: 600;
          color: #064EE3;
        }

        .recommendation-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .recommendation {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: #f8f9ff;
          border-radius: 8px;
        }

        .rec-icon {
          font-size: 18px;
        }

        .rec-text {
          font-size: 14px;
          color: #2d2d2d;
        }

        .feature-content h3 {
          font-size: 2rem;
          font-weight: 600;
          margin-bottom: 24px;
          color: #2d2d2d;
        }

        .feature-benefits {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .benefit {
          font-weight: 500;
          color: #2d2d2d;
        }

        .benefit-divider {
          width: 100%;
          height: 1px;
          background: #e0e0e0;
        }

        /* Stats */
        .stats {
          padding: 80px 0;
          background: #f8f9ff;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 60px;
          text-align: center;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-value {
          font-size: 3rem;
          font-weight: 700;
          color: #064EE3;
          margin-bottom: 8px;
        }

        .stat-label {
          font-size: 14px;
          color: #6b6b6b;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        /* CTA */
        .cta {
          padding: 120px 0;
          background: white;
          text-align: center;
        }

        .cta-content {
          max-width: 600px;
          margin: 0 auto;
        }

        .cta-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 32px;
        }

        .user-avatars {
          display: flex;
          gap: -8px;
        }

        .avatar {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #064EE3 0%, #3D76EC 100%);
          border-radius: 50%;
          border: 2px solid white;
          margin-left: -8px;
        }

        .avatar:first-child {
          margin-left: 0;
        }

        .cta-badge p {
          font-size: 12px;
          font-weight: 600;
          color: #8a8a8a;
          letter-spacing: 1px;
        }

        .cta-content h2 {
          font-size: 2.5rem;
          font-weight: 600;
          margin-bottom: 40px;
          color: #2d2d2d;
        }

        /* Footer */
        .footer {
          background: #f0f0f0;
          padding: 80px 0 40px;
        }

        .footer-content {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 60px;
          margin-bottom: 60px;
        }

        .footer-brand {
          display: flex;
          flex-direction: column;
        }

        .footer-logo {
          display: inline-block;
          margin-bottom: 24px;
        }

        .footer-logo-img {
          height: 32px;
          width: auto;
        }

        .footer-section h4 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 24px;
          color: #2d2d2d;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .footer-links {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
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

        .footer-contact {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #6b6b6b;
          font-size: 14px;
        }

        .footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 40px;
          border-top: 1px solid #d0d0d0;
        }

        .footer-bottom p {
          color: #6b6b6b;
          font-size: 14px;
          font-weight: 300;
        }

        .footer-legal {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .footer-legal a {
          color: #6b6b6b;
          text-decoration: none;
          font-size: 14px;
          font-weight: 300;
          transition: color 0.2s ease;
        }

        .footer-legal a:hover {
          color: #2d2d2d;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .platform-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }

          .feature-grid {
            grid-template-columns: 1fr;
            gap: 40px;
          }

          .feature-grid.reverse {
            direction: ltr;
          }
        }

        @media (max-width: 768px) {
          .nav-links {
            display: none;
          }

          .hero-title {
            font-size: 3rem;
          }

          .hero-description {
            font-size: 1.1rem;
          }

          .hero-actions {
            flex-direction: column;
            align-items: center;
          }

          .btn-hero {
            width: 100%;
            max-width: 300px;
          }

          .trusted-by-logos {
            flex-direction: column;
            align-items: center;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .footer-content {
            grid-template-columns: 1fr;
            gap: 40px;
          }

          .footer-bottom {
            flex-direction: column;
            gap: 16px;
            text-align: center;
          }

          .section-header h2 {
            font-size: 2rem;
          }

          .cta-content h2 {
            font-size: 2rem;
          }

          .feature-highlights {
            flex-direction: column;
            gap: 8px;
          }

          .highlight-divider {
            display: none;
          }
        }

        @media (max-width: 480px) {
          .hero-title {
            font-size: 2.5rem;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .platform-card {
            padding: 24px;
          }

          .feature-dashboard {
            padding: 20px;
          }
        }
      `}</style>
    </>
  )
}