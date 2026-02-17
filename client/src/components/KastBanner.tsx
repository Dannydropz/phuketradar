import React from "react";
import kastLogo from "@assets/logo-light-bg-transparent.png";

export const KastBanner: React.FC = () => {
  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        .kast-banner-container {
          display: flex;
          justify-content: center;
          width: 100%;
          margin-bottom: 2rem;
          padding: 0 1rem;
        }
        
        .kast-brand-vars {
          --kast-black: #0C0C0E;
          --kast-white: #FFFFFF;
          --kast-mint: #1EBA98;
          --kast-grey: #CFCFCF;
          --font-stack: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        }

        .kast-banner {
          width: 100%;
          max-width: 728px;
          height: 90px;
          background-color: var(--kast-black);
          /* Kast Mint Glow */
          box-shadow: 0 0 15px rgba(30, 186, 152, 0.4); 
          border: 1px solid rgba(30, 186, 152, 0.1);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 30px; 
          box-sizing: border-box;
          overflow: hidden;
          position: relative;
          border-radius: 8px;
          text-decoration: none;
          cursor: pointer;
          font-family: var(--font-stack);
        }

        .kast-banner:hover {
          box-shadow: 0 0 25px rgba(30, 186, 152, 0.6);
        }

        /* --- LEFT: LOGO --- */
        .kast-logo-section {
          display: flex;
          align-items: center;
          z-index: 2;
          flex-shrink: 0;
        }

        .kast-logo-img {
          height: 24px;
          width: auto;
          object-fit: contain;
          animation: kastSlideIn 0.6s ease-out both;
        }

        /* --- CENTER: TEXT --- */
        .kast-text-group {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center; 
          flex: 1;
          z-index: 2;
          padding: 0 10px;
          animation: kastSlideIn 0.6s ease-out 0.1s both;
          text-align: center;
        }

        .kast-headline {
          color: var(--kast-white);
          font-size: clamp(16px, 4vw, 22px); 
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 2px;
          white-space: nowrap;
        }

        .kast-subline {
          color: var(--kast-grey);
          font-size: clamp(10px, 2.5vw, 14px); 
          font-weight: 400;
          opacity: 0.9;
          white-space: nowrap;
        }

        /* --- CENTER-RIGHT: PHONE --- */
        .kast-phone-container {
          position: relative;
          width: 90px;
          height: 110px; 
          margin-top: 25px; 
          margin-right: 15px;
          z-index: 1;
          animation: kastFloatUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both;
          flex-shrink: 0;
        }

        .kast-phone-body {
          width: 100%;
          height: 100%;
          background: #FFFFFF; 
          border: 4px solid #1c1c1f; 
          border-radius: 14px;
          position: relative;
          box-shadow: 0 8px 16px rgba(0,0,0,0.5);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          padding-top: 14px; 
        }

        .kast-phone-notch {
          position: absolute;
          top: 5px;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 6px;
          background-color: #000;
          border-radius: 5px;
          z-index: 10;
        }

        .kast-screen-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 3px 6px;
          margin: 2px 4px;
          background: #F5F7FA;
          border-radius: 4px;
        }

        .kast-screen-text {
          display: flex;
          flex-direction: column;
        }

        .kast-label { font-size: 5px; color: #888; font-weight: 600; text-transform: uppercase;}
        .kast-value { font-size: 7px; color: #000; font-weight: 700; }
        .kast-thb { color: var(--kast-mint); }

        .kast-check {
          width: 8px;
          height: 8px;
          background: var(--kast-mint);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 5px;
          color: #000;
          font-weight: bold;
          transform: scale(0);
        }
        
        .kast-check::after { content: '✓'; }
        .kast-c1 { animation: kastPopIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.8s forwards; }
        .kast-c2 { animation: kastPopIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) 1.0s forwards; }

        /* --- RIGHT: CTA BUTTON --- */
        .kast-right-section {
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          flex-shrink: 0;
        }

        .kast-cta-btn {
          background-color: var(--kast-mint);
          color: var(--kast-black);
          font-size: clamp(10px, 2.5vw, 14px);
          font-weight: 800;
          padding: 8px 16px;
          border-radius: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          white-space: nowrap;
          transition: all 0.2s ease;
          animation: kastScaleIn 0.5s ease 0.6s both;
          box-shadow: 0 4px 10px rgba(30, 186, 152, 0.3);
        }

        .kast-banner:hover .kast-cta-btn {
          transform: translateY(-2px);
          background-color: white;
          box-shadow: 0 6px 15px rgba(255, 255, 255, 0.4);
        }

        @keyframes kastSlideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes kastFloatUp { from { transform: translateY(40px); opacity: 0; } to { transform: translateY(0); opacity: 1; } } 
        @keyframes kastPopIn { to { transform: scale(1); } }
        @keyframes kastScaleIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }

        .kast-glow-bg {
          position: absolute;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(30,186,152,0.15) 0%, transparent 70%);
          top: -50%;
          left: 30%;
          pointer-events: none;
        }

        /* --- RESPONSIVENESS --- */
        @media (max-width: 640px) {
          .kast-banner {
            padding: 0 15px;
          }
          .kast-phone-container {
            display: none; /* Hide phone on mobile to save space */
          }
          .kast-logo-img {
            height: 18px;
          }
          .kast-text-group {
            padding: 0 5px;
          }
        }
        
        @media (max-width: 480px) {
           .kast-banner {
            padding: 0 10px;
            height: 70px;
          }
          .kast-headline {
            font-size: 14px;
          }
          .kast-subline {
            font-size: 9px;
          }
          .kast-cta-btn {
            font-size: 9px;
            padding: 6px 10px;
          }
        }
      ` }} />

      <div className="kast-banner-container kast-brand-vars">
        <a href="https://go.phuketradar.com/kast" target="_blank" rel="noopener noreferrer" className="kast-banner">
          <div className="kast-glow-bg"></div>

          <div className="kast-logo-section">
            <img src={kastLogo} alt="KAST" className="kast-logo-img" />
          </div>

          <div className="kast-text-group">
            <div className="kast-headline">Crypto &rarr; Thai Baht</div>
            <div className="kast-subline">Instant off-ramp to any Thai bank.</div>
          </div>

          <div className="kast-phone-container">
            <div className="kast-phone-body">
              <div className="kast-phone-notch"></div>
              <div className="kast-screen-row">
                <div className="kast-screen-text">
                  <span className="kast-label">Sent</span>
                  <span className="kast-value">1,000 USDC</span>
                </div>
                <div className="kast-check kast-c1"></div>
              </div>
              <div className="kast-screen-row">
                <div className="kast-screen-text">
                  <span className="kast-label">Received</span>
                  <span className="kast-value kast-thb">฿34,000</span>
                </div>
                <div className="kast-check kast-c2"></div>
              </div>
            </div>
          </div>

          <div className="kast-right-section">
            <div className="kast-cta-btn">Get Kast</div>
          </div>
        </a>
      </div>
    </>
  );
};
