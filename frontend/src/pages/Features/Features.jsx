import React from 'react';
import { FiSettings, FiBarChart2, FiClock } from 'react-icons/fi';
import './Features.css';

export default function Features() {
  return (
    <section className="how-it-works full-page">
      <div className="hiw-inner">
        <header className="hiw-hero">
          <h1>How It Works</h1>
          <p>Follow these steps to set up your portfolio and start tracking like a pro.</p>
        </header>

        <div className="hiw-timeline">
          <div className="step-card">
            <div className="step-number">1</div>
            <div className="step-icon"><FiSettings size={28} /></div>
            <h3>Configure Your Portfolio</h3>
            <p>
              Go to the <strong>Portfolio</strong> tab.<br/>
              Click “Connect Exchange” to link Binance/Bybit API keys,<br/>
              Manage or revoke keys under <em>Settings → API Keys</em>.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">2</div>
            <div className="step-icon"><FiBarChart2 size={28} /></div>
            <h3>Explore & Analyze</h3>
            <p>
              Your portfolio table auto-refreshes every 10 seconds.<br/>
              Use the search to filter by coin. Click any row to see that coin’s detail page—historical charts, 24h change, allocation, profit/loss.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">3</div>
            <div className="step-icon"><FiClock size={28} /></div>
            <h3>Track History</h3>
            <p>
              In <strong>History</strong>, view your value over 7, 30 or 90 days.<br/>
              Download CSV snapshots. Spot trends to know exactly when to buy, hold, or sell.
            </p>
          </div>
        </div>

        <div className="hiw-cta">
          <a href="/portfolio" className="btn-gradient">Go to Portfolio</a>
        </div>
      </div>
    </section>
  );
}
