import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import './Login.css';
import { API_URL } from '../config/api';

/** Firebase auth/unauthorized-domain helper — report the real browser hostname. */
function unauthorizedDomainMessage() {
  const host =
    typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : '(unknown host)';
  return (
    `Error: This domain (${host}) is not authorized in Firebase. ` +
    'Please add it in Firebase Console → Authentication → Settings → Authorized domains.'
  );
}

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
  
  // Provider specific details
  const [address, setAddress] = useState('');
  const [telephone, setTelephone] = useState('');
  const [doctorType, setDoctorType] = useState('Ayurvedic Physician');
  const [specialty, setSpecialty] = useState('');
  const [astrologyServices, setAstrologyServices] = useState([]);
  const [traditionalSpecialties, setTraditionalSpecialties] = useState([]);
  const [experience, setExperience] = useState('');
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
  
  const { loginWithEmail, signupWithEmail, loginWithGoogle, resetPassword, completeRegistration } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleAdminRouting = async (user) => {
    const returnUrl = searchParams.get('returnUrl');
    
    const superAdmins = ['yes.manujaya@gmail.com'];
    if (user && superAdmins.includes(user.email)) {
      navigate(returnUrl || '/admin');
      return;
    }
    
    // Fetch user document to check role
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (['vendor', 'doctor', 'clinic', 'organization'].includes(data.role)) {
          navigate(returnUrl || '/vendor');
          return;
        }
      }
    } catch (e) {
      console.error("Error fetching role for routing:", e);
    }
    
    navigate(returnUrl || '/');
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
          setError(t('login_name_required'));
          return;
        }
        if (role !== 'user') {
          if (!address || !telephone) {
            setError(t('login_expert_details_required'));
            return;
          }
        }
        
        const actualRole = role === 'astrologer' ? 'doctor' : role;
        const finalDoctorType = role === 'astrologer' ? 'Vedic Astrologer' : doctorType;

        const profileDetails = actualRole !== 'user' ? {
          address,
          telephone,
          doctorType: finalDoctorType,
          specialty: role === 'astrologer' ? 'Yantra & Mantra' : (doctorType === 'traditional' ? traditionalSpecialties : specialty),
          astrologyServices: role === 'astrologer' ? astrologyServices : [],
          experience
        } : null;
        
        const userCredential = await signupWithEmail(email, password, name, actualRole, profileDetails);
        await handleAdminRouting(userCredential.user);
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setMessage(t('login_reset_sent'));
      }
    } catch (err) {
      if (err.code === 'auth/unauthorized-domain') {
        setError(unauthorizedDomainMessage());
      } else {
        setError(err.message || t('login_auth_failed'));
      }
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const userCredential = await loginWithGoogle();
      const user = userCredential.user;
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Never set admin/role/status from the client — Admin SDK handles privilege fields
        await completeRegistration(user, {
          name: user.displayName || 'New User',
          role: 'user',
        });
        try {
          const token = await user.getIdToken();
          await fetch(`${API_URL}/api/auth/register-notify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: user.displayName || 'New User',
              email: user.email,
              role: 'user',
            }),
          });
        } catch (e) {
          console.error('Register notify error:', e);
        }
      }
      await handleAdminRouting(user);
    } catch (err) {
      console.error("Google Auth Error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError(unauthorizedDomainMessage());
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError(''); // User just closed the popup
      } else {
        setError(`${t('login_google_failed')}: ${err.message}`);
      }
    }
  };



  return (
    <div className="login-container animate-fade-in">
      <div className="login-card glass-panel">
        <div className="login-header">
          <img src="/logo.png" alt="Deergayu Logo" className="login-logo" />
          <h2>
            {mode === 'login' ? t('nav_login') : mode === 'signup' ? t('login_create_account') : t('login_reset_password')}
          </h2>
          <p>
            {mode === 'login' ? t('login_welcome_back') :
             mode === 'signup' ? t('login_join_platform') :
             t('login_reset_instruction')}
          </p>
        </div>
        
        {error && <div className="login-error" style={{color: 'var(--error-color)', marginBottom: '1rem', textAlign: 'center', background: '#ffebee', padding: '0.5rem', borderRadius: '4px'}}>{error}</div>}
        {message && <div className="login-success" style={{color: 'var(--success-color)', marginBottom: '1rem', textAlign: 'center', background: '#e8f5e9', padding: '0.5rem', borderRadius: '4px'}}>{message}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'signup' && (
            <>
              <div className="form-group">
                <label>{t('login_full_name_org')}</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('login_name_placeholder')}
                  required 
                />
              </div>
              <div className="form-group">
                <label>{t('login_account_type')}</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} required>
                  <option value="user">{t('login_role_user')}</option>
                  <option value="doctor">{t('login_role_doctor')}</option>
                  <option value="astrologer">{t('login_role_astrologer')}</option>
                  <option value="clinic">{t('login_role_clinic')}</option>
                  <option value="organization">{t('login_role_organization')}</option>
                </select>
              </div>
              
              {role !== 'user' && (
                <div className="expert-fields" style={{background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(0,0,0,0.05)'}}>
                  <h4 style={{marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--primary-color)'}}>{t('login_professional_details')}</h4>
                  
                  {role === 'doctor' && (
                    <div className="form-group">
                      <label>{t('login_doctor_type')}</label>
                      <select value={doctorType} onChange={(e) => setDoctorType(e.target.value)} required>
                        <option value="Ayurvedic Physician">{t('login_doctor_type_ayurvedic')}</option>
                        <option value="traditional">{t('login_doctor_type_traditional')}</option>
                      </select>
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label>{t('login_specialty_services')}</label>
                    {role === 'doctor' ? (
                      <select 
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        required
                      >
                        <option value="" disabled>{t('login_select_specialty')}</option>
                        <option value="Sarwanga Roga (General Medicine)">{t('specialty_Sarwanga_Roga_General')}</option>
                        <option value="Shalya Tantra (Surgery)">{t('specialty_Shalya_Tantra_Surgery')}</option>
                        <option value="Shalakya Tantra (ENT & Eye)">{t('specialty_Shalakya_Tantra_ENT_Eye')}</option>
                        <option value="Kaumarabhritya (Pediatrics)">{t('specialty_Kaumarabhritya_Pediatrics')}</option>
                        <option value="Prasuti & Stri Roga (Gynecology)">{t('specialty_Prasuti_Stri_Roga_Gynecology')}</option>
                        <option value="Agada Tantra (Toxicology)">{t('specialty_Agada_Tantra_Toxicology')}</option>
                        <option value="Manasa Roga (Psychiatry)">{t('specialty_Manasa_Roga_Psychiatry')}</option>
                        <option value="Panchakarma">{t('specialty_Panchakarma')}</option>
                        <option value="Kedum Bindum (Orthopedics)">{t('specialty_Kadum_Bindum_Orthopedic')}</option>
                        <option value="Skin Diseases (Dermatology)">{t('specialty_Skin_Diseases_Dermatology')}</option>
                        <option value="Other">{t('specialty_Other')}</option>
                      </select>
                    ) : role === 'astrologer' ? (
                      <div className="astrology-checkboxes" style={{ display: 'grid', gap: '0.5rem', background: 'var(--input-bg)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                          <input type="checkbox" value="Horoscope Reading" checked={astrologyServices.includes("Horoscope Reading")} onChange={(e) => {
                            if(e.target.checked) setAstrologyServices([...astrologyServices, e.target.value]);
                            else setAstrologyServices(astrologyServices.filter(s => s !== e.target.value));
                          }} style={{ width: 'auto', margin: 0 }} />
                          {t('specialty_Horoscope_Reading')}
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                          <input type="checkbox" value="Yanthra Preparation" checked={astrologyServices.includes("Yanthra Preparation")} onChange={(e) => {
                            if(e.target.checked) setAstrologyServices([...astrologyServices, e.target.value]);
                            else setAstrologyServices(astrologyServices.filter(s => s !== e.target.value));
                          }} style={{ width: 'auto', margin: 0 }} />
                          {t('specialty_Yanthra_Preparation')}
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                          <input type="checkbox" value="Auspicious Times" checked={astrologyServices.includes("Auspicious Times")} onChange={(e) => {
                            if(e.target.checked) setAstrologyServices([...astrologyServices, e.target.value]);
                            else setAstrologyServices(astrologyServices.filter(s => s !== e.target.value));
                          }} style={{ width: 'auto', margin: 0 }} />
                          {t('specialty_Auspicious_Times')}
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                          <input type="checkbox" value="Vasthu Vidya" checked={astrologyServices.includes("Vasthu Vidya")} onChange={(e) => {
                            if(e.target.checked) setAstrologyServices([...astrologyServices, e.target.value]);
                            else setAstrologyServices(astrologyServices.filter(s => s !== e.target.value));
                          }} style={{ width: 'auto', margin: 0 }} />
                          {t('specialty_Vasthu_Vidya')}
                        </label>
                    </div>
                    ) : doctorType === 'traditional' ? (
                      <div className="astrology-checkboxes" style={{ display: 'grid', gap: '0.5rem', background: 'var(--input-bg)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--glass-border)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                          <input type="checkbox" value="Yantra / Mantra" checked={traditionalSpecialties.includes("Yantra / Mantra")} onChange={(e) => {
                            if(e.target.checked) setTraditionalSpecialties([...traditionalSpecialties, e.target.value]);
                            else setTraditionalSpecialties(traditionalSpecialties.filter(s => s !== e.target.value));
                          }} style={{ width: 'auto', margin: 0 }} />
                          {t('specialty_Yantra_Mantra')}
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                          <input type="checkbox" value="Yaga Homa" checked={traditionalSpecialties.includes("Yaga Homa")} onChange={(e) => {
                            if(e.target.checked) setTraditionalSpecialties([...traditionalSpecialties, e.target.value]);
                            else setTraditionalSpecialties(traditionalSpecialties.filter(s => s !== e.target.value));
                          }} style={{ width: 'auto', margin: 0 }} />
                          {t('specialty_Yaga_Homa')}
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                          <input type="checkbox" value="Kem Kram" checked={traditionalSpecialties.includes("Kem Kram")} onChange={(e) => {
                            if(e.target.checked) setTraditionalSpecialties([...traditionalSpecialties, e.target.value]);
                            else setTraditionalSpecialties(traditionalSpecialties.filter(s => s !== e.target.value));
                          }} style={{ width: 'auto', margin: 0 }} />
                          {t('specialty_Kem_Kram')}
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                          <input type="checkbox" value="Traditional Herbal Medicine" checked={traditionalSpecialties.includes("Traditional Herbal Medicine")} onChange={(e) => {
                            if(e.target.checked) setTraditionalSpecialties([...traditionalSpecialties, e.target.value]);
                            else setTraditionalSpecialties(traditionalSpecialties.filter(s => s !== e.target.value));
                          }} style={{ width: 'auto', margin: 0 }} />
                          {t('specialty_Traditional_Herbal_Medicine')}
                        </label>
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        placeholder={t('login_specialty_placeholder')}
                        required={role !== 'doctor'} 
                      />
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label>{t('login_experience_optional')}</label>
                    <input 
                      type="text" 
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      placeholder={t('login_experience_placeholder')}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>{t('login_address')}</label>
                    <input 
                      type="text" 
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder={t('login_address_placeholder')}
                      required 
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>{t('login_telephone')}</label>
                    <input 
                      type="tel" 
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      placeholder={t('login_phone_placeholder')}
                      required 
                    />
                  </div>
                </div>
              )}
            </>
          )}
          <div className="form-group">
            <label>{t('login_email')}</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('login_email_placeholder')}
              required 
            />
          </div>
          {mode !== 'forgot' && (
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>{t('login_password')}</label>
                {mode === 'login' && (
                  <span 
                    onClick={() => setMode('forgot')} 
                    style={{ fontSize: '0.85rem', color: 'var(--primary-color)', cursor: 'pointer' }}
                    className="login-link"
                  >
                    {t('login_forgot_password')}
                  </span>
                )}
              </div>
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
            {mode === 'login' ? t('login_sign_in') : mode === 'signup' ? t('login_sign_up') : t('login_send_reset_link')}
          </button>
        </form>

        {mode !== 'forgot' && !(mode === 'signup' && role !== 'user') && (
          <>
            <div className="auth-divider" style={{textAlign: 'center', margin: '1.5rem 0', position: 'relative'}}>
              <span style={{background: 'var(--surface-color)', padding: '0 10px', position: 'relative', zIndex: 1, color: 'var(--text-secondary)'}}>{t('login_or')}</span>
              <div style={{position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'rgba(0,0,0,0.1)'}}></div>
            </div>
            <button type="button" onClick={handleGoogleAuth} className="btn btn-outline login-btn" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', marginBottom: '1rem'}}>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt={t('login_google_alt')} style={{width: '18px'}}/>
              {t('login_continue_google')}
            </button>
          </>
        )}

        <div className="login-footer">
          {mode === 'login' ? (
            <p>{t('login_no_account')} <span onClick={() => setMode('signup')} className="login-link">{t('login_sign_up')}</span></p>
          ) : mode === 'signup' ? (
            <p>{t('login_already_account')} <span onClick={() => setMode('login')} className="login-link">{t('nav_login')}</span></p>
          ) : (
            <p>{t('login_remember_password')} <span onClick={() => setMode('login')} className="login-link">{t('nav_login')}</span></p>
          )}
        </div>
      </div>

    </div>
  );
};

export default Login;
