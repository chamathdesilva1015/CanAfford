import { useAuth0 } from '@auth0/auth0-react';
import { Navigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Search, DollarSign, ExternalLink, ChevronDown, MapPin, ShieldCheck } from 'lucide-react';
import './Home.css';

/* ── Scroll fade hook ── */
function useFadeIn() {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add('lp-visible'); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

export const Home = () => {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();
  const problemRef = useFadeIn();
  const howRef = useFadeIn();
  const footerRef = useFadeIn();
  const heroContentRef = useFadeIn();
  const heroRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const { left, top, width, height } = heroRef.current.getBoundingClientRect();
      const x = ((e.clientX - left) / width) * 100;
      const y = ((e.clientY - top) / height) * 100;
      heroRef.current.style.setProperty('--mouse-x', `${x}%`);
      heroRef.current.style.setProperty('--mouse-y', `${y}%`);
    };

    const heroEl = heroRef.current;
    if (heroEl) {
      heroEl.addEventListener('mousemove', handleMouseMove);
    }
    return () => {
      if (heroEl) {
        heroEl.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, []);

  if (!isLoading && isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleLogin = () => loginWithRedirect();

  return (
    <div className="lp-root">

      {/* ── FIXED NAV ── */}
      <nav className="lp-nav">
        <span className="lp-logo">CanAfford</span>
        <div className="lp-nav-links">
          <a href="#problem">Why It Matters</a>
          <a href="#how-it-works">How It Works</a>
          <button className="lp-nav-cta" onClick={handleLogin}>Log In</button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="lp-hero" ref={heroRef}>
        <div className="lp-hero-glow" aria-hidden="true" />
        <div className="lp-hero-content lp-fade" ref={heroContentRef as any}>
          <div className="lp-hero-badge">
            <ShieldCheck size={13} /> Verified data &nbsp;·&nbsp; No guessing
          </div>
          <h1 className="lp-headline">
            Find a Home You Can<br />
            <span className="lp-headline-accent">Actually Afford.</span>
          </h1>
          <p className="lp-subheadline">
            CanAfford uses Gemini AI live search to surface the <strong>true cost of living</strong>—rent,
            transit, and groceries—pulled directly from real, active listings.
          </p>
          <div className="lp-hero-actions">
            <button className="lp-btn-primary" onClick={handleLogin}>
              Log In to View Dashboard
            </button>
            <a href="#how-it-works" className="lp-btn-ghost">
              See How It Works <ChevronDown size={15} />
            </a>
          </div>
          <div className="lp-trust-row">
            <span><ShieldCheck size={12} /> Powered by Google Gemini AI</span>
            <span className="lp-dot">·</span>
            <span><MapPin size={12} /> Canadian Rental Market</span>
            <span className="lp-dot">·</span>
            <span><ExternalLink size={12} /> Source-Verified Listings</span>
          </div>
        </div>
        <a href="#problem" className="lp-scroll-hint" aria-label="Scroll down">
          <ChevronDown size={22} />
        </a>
      </section>

      {/* ── PROBLEM ── */}
      <section id="problem" className="lp-section lp-problem lp-fade" ref={problemRef as any}>
        <div className="lp-inner">
          <p className="lp-label">The Problem</p>
          <h2 className="lp-title">Rent is only the beginning.</h2>
          <p className="lp-body">
            Most rental sites show you a base price and stop there. But a $1,800 apartment in Guelph
            can cost you $2,300/mo once you factor in transit, groceries, and the commute you didn't
            account for. CanAfford closes that gap—<strong>before</strong> you sign a lease.
          </p>
          <div className="lp-problem-grid">
            <div className="lp-problem-card lp-problem-bad">
              <p className="lp-problem-label">What you see on other apps</p>
              <p className="lp-problem-price">$1,850<span>/mo</span></p>
              <p className="lp-problem-note">Base rent only. Transit, groceries, and commute: unknown.</p>
            </div>
            <div className="lp-problem-vs">vs</div>
            <div className="lp-problem-card lp-problem-good">
              <p className="lp-problem-label">What CanAfford shows you</p>
              <p className="lp-problem-price">$2,290<span>/mo</span></p>
              <p className="lp-problem-note">Rent + 2026 TTC pass ($156) + StatCan grocery average ($401). Your real number.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="lp-section lp-how lp-fade" ref={howRef as any}>
        <div className="lp-inner">
          <p className="lp-label">How It Works</p>
          <h2 className="lp-title">Transparency in every square foot.</h2>
          <p className="lp-body lp-body-center">
            Three layers of data work together to give you an honest number.
          </p>

          <div className="lp-features-grid">
            <div className="lp-feature-card">
              <div className="lp-feat-icon" style={{ background: 'rgba(96,239,255,0.12)', color: '#60efff' }}>
                <Search size={22} />
              </div>
              <h3>Live Market Scan</h3>
              <p>
                Gemini's Search Grounding scans Realtor.ca, Rentals.ca, and developer sites in real time.
                We extract the exact advertised price — no cached data, no invented numbers.
              </p>
            </div>

            <div className="lp-feature-card">
              <div className="lp-feat-icon" style={{ background: 'rgba(0,255,135,0.12)', color: '#00ff87' }}>
                <DollarSign size={22} />
              </div>
              <h3>Transparent Math</h3>
              <p>
                We add verified 2026 regional costs: the $156 TTC monthly pass (or $132 fare-capped),
                Ottawa OC Transpo at $138.50, and Statistics Canada's solo-living grocery average of
                $401/mo. Every line item is cited.
              </p>
            </div>

            <div className="lp-feature-card">
              <div className="lp-feat-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24' }}>
                <ExternalLink size={22} />
              </div>
              <h3>Direct Verification</h3>
              <p>
                Every listing card includes a deep-link straight to the original ad — labelled
                "View Original Ad on Rentals.ca" — so you can verify the price yourself before
                booking a viewing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAT FOOTER ── */}
      <footer id="footer" className="lp-footer lp-fade" ref={footerRef as any}>
        <div className="lp-footer-top">
          <div className="lp-footer-col lp-footer-brand">
            <span className="lp-footer-logo">CanAfford</span>
            <p>Ending hidden rental costs in Canada.</p>
            <button className="lp-btn-primary lp-footer-cta" onClick={handleLogin}>
              Log In to View Dashboard
            </button>
          </div>

          <div className="lp-footer-col">
            <h4>Resources</h4>
            <a href="#problem">Why It Matters</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#how-it-works">Data Methodology</a>
            <a href="https://github.com" target="_blank" rel="noreferrer">GitHub Repo</a>
          </div>

          <div className="lp-footer-col">
            <h4>Contact</h4>
            <a href="mailto:support@canafford.ca">support@canafford.ca</a>
            <span className="lp-footer-note">Based in Ontario, Canada</span>
            <span className="lp-footer-note">© 2026 CanAfford Inc.</span>
          </div>
        </div>

        <div className="lp-footer-bar">
          <span>© 2026 CanAfford Inc. All rights reserved.</span>
          <div className="lp-footer-legal">
            <a href="#">Privacy Policy</a>
            <span>·</span>
            <a href="#">Terms of Service</a>
          </div>
        </div>
      </footer>

    </div>
  );
};
