import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import './Login.css';

const Login = () => {
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'forgot'
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  
  const { loginWithEmail, signupWithEmail, loginWithGoogle, resetPassword } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleAdminRouting = async (user) => {
    const superAdmins = ['yes.manujaya@gmail.com'];
    if (user && superAdmins.includes(user.email)) {
      navigate('/admin');
      return;
    }
    
    // Fetch user document to check role
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (['vendor', 'doctor', 'clinic', 'organization'].includes(data.role)) {
          navigate('/vendor');
          return;
        }
      }
    } catch (e) {
      console.error("Error fetching role for routing:", e);
    }
    
    navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    try {
      if (mode === 'login') {
        const userCredential = await loginWithEmail(email, password);
        await handleAdminRouting(userCredential.user);
      } else if (mode === 'signup') {
        if (!name) {
          setError('Please enter your name');
          return;
        }
        const userCredential = await signupWithEmail(email, password, name, role);
        await handleAdminRouting(userCredential.user);
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
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        setTempUser(userCredential.user);
        setName(userCredential.user.displayName || '');
        setShowRoleModal(true);
      } else {
        await handleAdminRouting(userCredential.user);
      }
    } catch (err) {
      setError('Google Sign-In failed.');
    }
  };

  const handleRoleSelectionSubmit = async (e) => {
    e.preventDefault();
    if (!tempUser) return;
    
    try {
      await setDoc(doc(db, 'users', tempUser.uid), {
        name: name || tempUser.displayName,
        email: tempUser.email,
        role: role,
        status: role === 'user' ? 'approved' : 'pending',
        createdAt: new Date().toISOString()
      });
      setShowRoleModal(false);
      await handleAdminRouting(tempUser);
    } catch (err) {
      setError('Failed to save profile. Please try again.');
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

        <div className="login-footer">
          {mode === 'login' ? (
            <p>Don't have an account? <span onClick={() => setMode('signup')} className="login-link">Sign up</span></p>
          ) : mode === 'signup' ? (
            <p>Already have an account? <span onClick={() => setMode('login')} className="login-link">Login</span></p>
          ) : (
            <p>Remember your password? <span onClick={() => setMode('login')} className="login-link">Login</span></p>
          )}
        </div>
      </div>

      {showRoleModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="modal-content glass-panel" style={{ padding: '2rem', maxWidth: '400px', width: '90%' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--secondary-color)' }}>Complete Your Profile</h3>
            <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>Please verify your name and select your account type to continue.</p>
            <form onSubmit={handleRoleSelectionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '4px' }}
                />
              </div>
              <div className="form-group">
                <label>Account Type</label>
                <select 
                  value={role} 
                  onChange={(e) => setRole(e.target.value)} 
                  required
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', background: 'var(--surface-color)', color: 'var(--text-primary)' }}
                >
                  <option value="user">Normal User</option>
                  <option value="doctor">Doctor</option>
                  <option value="clinic">Medical Clinic</option>
                  <option value="organization">Organization</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Complete Setup</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
