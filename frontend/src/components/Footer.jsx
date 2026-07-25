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
            <Leaf size={22} aria-hidden="true" />
            <span>Deergayu</span>
          </Link>
          <p>
            Sri Lankan digital healthcare and Ayurveda platform — find approved providers, book
            consultations, and explore wellness services.
          </p>
          <SocialLinks variant="footer" />
        </div>

        <nav className="footer-nav" aria-label="Footer">
          <div className="footer-col">
            <h4>Care</h4>
            <Link to="/doctors">Find a Doctor</Link>
            <Link to="/channeling">Book / Channel</Link>
            <Link to="/ayurveda">Ayurveda</Link>
            <Link to="/specialties">Specialties</Link>
            <Link to="/online-consultation">Online consultation</Link>
          </div>
          <div className="footer-col">
            <h4>Explore</h4>
            <Link to="/shop">Shop</Link>
            <Link to="/ayurvedic-guide">Guide / Articles</Link>
            <Link to="/videos">Videos</Link>
            <Link to="/about">About</Link>
            <Link to="/join-as-doctor">Join as Doctor</Link>
          </div>
          <div className="footer-col">
            <h4>Support</h4>
            <Link to="/contact">Contact</Link>
            <Link to="/faq">FAQ</Link>
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
