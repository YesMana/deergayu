import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import './Login.css';

const Login = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') || location.state?.mode || 'login';
  const initialRole = searchParams.get('role') || location.state?.role || 'user';
  
  const [mode, setMode] = useState(initialMode); // 'login', 'signup', 'forgot'
  const [name, setName] = useState('');
  const [role, setRole] = useState(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Expert specific fields
  const [address, setAddress] = useState('');
  const [telephone, setTelephone] = useState('');
  const [doctorType, setDoctorType] = useState('ayurvedic');
  const [specialty, setSpecialty] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  useEffect(() => {
    const qMode = searchParams.get('mode');
    const qRole = searchParams.get('role');
    if (qMode) setMode(qMode);
    else if (location.state?.mode) setMode(location.state.mode);
    
    if (qRole) setRole(qRole);
    else if (location.state?.role) setRole(location.state.role);
  }, [location.state, searchParams]);
  
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
        if (role !== 'user') {
          if (!address || !telephone) {
            setError('Please fill in all expert details (Address, Telephone)');
            return;
          }
        }
        
        const profileDetails = role !== 'user' ? {
          address,
          telephone,
          doctorType,
          specialty
        } : null;
        
        const userCredential = await signupWithEmail(email, password, name, role, profileDetails);
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
      const user = userCredential.user;
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        const isSuperAdmin = user.email && user.email.toLowerCase() === 'yes.manujaya@gmail.com';
        await setDoc(userDocRef, {
          name: user.displayName || 'New User',
          email: user.email,
          role: isSuperAdmin ? 'admin' : 'user',
          status: 'approved',
          createdAt: new Date().toISOString()
        });
      }
      await handleAdminRouting(user);
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
              
              {role !== 'user' && (
                <div className="expert-fields" style={{background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(0,0,0,0.05)'}}>
                  <h4 style={{marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--primary-color)'}}>Professional Details</h4>
                  
                  {role === 'doctor' && (
                    <div className="form-group">
                      <label>Doctor Type</label>
                      <select value={doctorType} onChange={(e) => setDoctorType(e.target.value)} required>
                        <option value="ayurvedic">Ayurvedic Doctor</option>
                        <option value="traditional">Paramparika Doctor (Traditional)</option>
                      </select>
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label>Specialty / Category</label>
                    <input 
                      type="text" 
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      placeholder="e.g. Sarwanga Roga, Skin Diseases..."
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Clinic/Practice Address</label>
                    <input 
                      type="text" 
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="123 Main St, City"
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Telephone Number</label>
                    <input 
                      type="tel" 
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      placeholder="077 123 4567"
                      required 
                    />
                  </div>
                </div>
              )}
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

    </div>
  );
};

export default Login;
