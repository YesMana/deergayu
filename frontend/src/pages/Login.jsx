import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import './Login.css';

const Login = () => {
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'forgot'
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const { loginWithEmail, signupWithEmail, loginWithGoogle, resetPassword } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleAdminRouting = (user) => {
    const superAdmins = ['yes.manujaya@gmail.com'];
    if (user && superAdmins.includes(user.email)) {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    try {
      if (mode === 'login') {
        const userCredential = await loginWithEmail(email, password);
        handleAdminRouting(userCredential.user);
      } else if (mode === 'signup') {
        if (!name) {
          setError('Please enter your name');
          return;
        }
        const userCredential = await signupWithEmail(email, password, name, role);
        handleAdminRouting(userCredential.user);
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setMessage('Password reset email sent! Check your inbox.');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const userCredential = await loginWithGoogle();
      handleAdminRouting(userCredential.user);
    } catch (err) {
      setError('Google Sign-In failed.');
    }
  };

  return (
    <div className="login-container animate-fade-in">
      <div className="login-card glass-panel">
        <div className="login-header">
          <img src="/logo.png" alt="Deergayu Logo" className="login-logo" />
          <h2>
            {mode === 'login' ? t('nav_login') : mode === 'signup' ? 'Create Account' : 'Reset Password'}
          </h2>
          <p>
            {mode === 'login' ? 'Welcome back to Deergayu Platform' : 
             mode === 'signup' ? 'Join our platform today' : 
             'Enter your email to receive a reset link'}
          </p>
        </div>
        
        {error && <div className="login-error" style={{color: 'var(--error-color)', marginBottom: '1rem', textAlign: 'center', background: '#ffebee', padding: '0.5rem', borderRadius: '4px'}}>{error}</div>}
        {message && <div className="login-success" style={{color: 'var(--success-color)', marginBottom: '1rem', textAlign: 'center', background: '#e8f5e9', padding: '0.5rem', borderRadius: '4px'}}>{message}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'signup' && (
            <>
              <div className="form-group">
                <label>Full Name / Organization Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required 
                />
              </div>
              <div className="form-group">
                <label>Account Type</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} required>
                  <option value="user">Normal User</option>
                  <option value="doctor">Doctor</option>
                  <option value="clinic">Medical Clinic</option>
                  <option value="organization">Organization</option>
                </select>
              </div>
            </>
          )}
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required 
            />
          </div>
          {mode !== 'forgot' && (
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required 
              />
            </div>
          )}
          <button type="submit" className="btn btn-primary login-btn">
            {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Send Reset Link'}
          </button>
        </form>

        {mode !== 'forgot' && (
          <>
            <div className="auth-divider" style={{textAlign: 'center', margin: '1.5rem 0', position: 'relative'}}>
              <span style={{background: 'var(--surface-color)', padding: '0 10px', position: 'relative', zIndex: 1, color: 'var(--text-secondary)'}}>OR</span>
              <div style={{position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'rgba(0,0,0,0.1)'}}></div>
            </div>
            <button onClick={handleGoogleAuth} className="btn btn-outline login-btn" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', marginBottom: '1rem'}}>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{width: '18px'}}/>
              Continue with Google
            </button>
          </>
        )}

        <div className="auth-links" style={{textAlign: 'center', marginTop: '1rem', fontSize: '0.9rem'}}>
          {mode === 'login' ? (
            <>
              <p>Don't have an account? <span onClick={() => setMode('signup')} style={{color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold'}}>Sign up</span></p>
              <p style={{marginTop: '0.5rem'}}><span onClick={() => setMode('forgot')} style={{color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline'}}>Forgot your password?</span></p>
            </>
          ) : (
            <p>Already have an account? <span onClick={() => setMode('login')} style={{color: 'var(--primary-color)', cursor: 'pointer', fontWeight: 'bold'}}>Sign in</span></p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
