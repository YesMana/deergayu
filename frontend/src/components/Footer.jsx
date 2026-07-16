import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import SocialLinks from './SocialLinks';
import './Footer.css';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <Leaf size={22} />
            <span>Deergayu</span>
          </Link>
          <p>
            Sri Lanka&apos;s Ayurvedic platform for authentic herbs, doctor channeling, and holistic
            wellness.
          </p>
          <SocialLinks variant="footer" />
        </div>

        <nav className="footer-nav" aria-label="Footer">
          <div className="footer-col">
            <h4>Explore</h4>
            <Link to="/shop">Shop</Link>
            <Link to="/channeling">Channeling</Link>
            <Link to="/ayurvedic-guide">Guide</Link>
            <Link to="/videos">Videos</Link>
          </div>
          <div className="footer-col">
            <h4>Support</h4>
            <Link to="/contact">Contact</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/refund-policy">Refund Policy</Link>
          </div>
        </nav>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <p>&copy; {year} Deergayu. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
