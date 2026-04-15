import { FormEvent, useEffect, useState, createContext, useContext } from 'react';
import { Link, Route, Routes, useNavigate, useParams, Navigate } from 'react-router-dom';

type BioLink = {
  label: string;
  url: string;
};

type BioPage = {
  id: string;
  userId: string;
  handle: string;
  displayName: string;
  bio: string;
  links: BioLink[];
  createdAt: string;
  updatedAt: string;
};

type AuthTokens = {
  accessToken: string;
  expiresIn: string;
};

type User = {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  createdAt: string;
};

type Sharing = {
  id: string;
  ownerHandle: string;
  sharedHandle: string;
  grantedFields: string[];
  createdAt: string;
  updatedAt: string;
};

type BioForm = {
  displayName: string;
  bio: string;
  links: BioLink[];
};

type AuthContextType = {
  tokens: AuthTokens | null;
  handle: string | null;
  login: (tokens: AuthTokens, handle: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType>({
  tokens: null,
  handle: null,
  login: () => { },
  logout: () => { },
});

function useAuth() {
  return useContext(AuthContext);
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function App() {
  const [tokens, setTokens] = useState<AuthTokens | null>(() => {
    const stored = localStorage.getItem('auth_tokens');
    return stored ? JSON.parse(stored) : null;
  });
  const [handle, setHandle] = useState<string | null>(() => {
    return localStorage.getItem('auth_handle');
  });

  const login = (newTokens: AuthTokens, userHandle: string) => {
    setTokens(newTokens);
    setHandle(userHandle);
    localStorage.setItem('auth_tokens', JSON.stringify(newTokens));
    localStorage.setItem('auth_handle', userHandle);
  };

  const logout = async () => {
    if (tokens) {
      try {
        await fetch(`${API_URL}/auth/sign-out`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });
      } catch {
        // Ignore errors on logout
      }
    }
    setTokens(null);
    setHandle(null);
    localStorage.removeItem('auth_tokens');
    localStorage.removeItem('auth_handle');
  };

  return (
    <AuthContext.Provider value={{ tokens, handle, login, logout }}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/sharing" element={<ProtectedRoute><SharingPage /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
        <Route path="/bio/:handle" element={<PublicBioPage />} />
        <Route path="/bio/:handle/edit" element={<ProtectedRoute><SharedBioEditPage /></ProtectedRoute>} />
      </Routes>
    </AuthContext.Provider>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { tokens } = useAuth();
  if (!tokens) {
    return <Navigate to="/sign-in" replace />;
  }
  return <>{children}</>;
}

function NavHeader() {
  const { tokens, handle, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="topbar">
      <div className="brand">
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="brand-mark">S</div>
          <div>
            <div className="brand-name">SecOrganic</div>
            <div className="brand-sub">Secure Bio Platform</div>
          </div>
        </Link>
      </div>

      <div className="user-box">
        {tokens ? (
          <>
            <span className="status-dot logged-in" />
            <span className="user-status">@{handle}</span>
            <button type="button" className="secondary" onClick={() => navigate('/users')}>Users</button>
            <button type="button" className="secondary" onClick={() => navigate('/dashboard')}>My Bio</button>
            <button type="button" className="secondary" onClick={() => navigate('/sharing')}>Sharing</button>
            <button type="button" className="cta" onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <span className="status-dot logged-out" />
            <span className="user-status">Guest</span>
            <button type="button" className="secondary" onClick={() => navigate('/sign-in')}>Sign In</button>
            <button type="button" className="cta" onClick={() => navigate('/sign-up')}>Sign Up</button>
          </>
        )}
      </div>
    </header>
  );
}

function HomePage() {
  return (
    <div className="app-shell">
      <NavHeader />
      <main className="page-wrap">
        <section className="panel public-card" style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>
          <div className="brand-mark" style={{ width: '80px', height: '80px', fontSize: '2.5rem', margin: '0 auto 1.5rem' }}>S</div>
          <h1 style={{ marginBottom: '1rem' }}>Welcome to SecOrganic</h1>
          <p style={{ marginBottom: '1.5rem', color: '#666' }}>
            SecOrganic is a secure bio page platform where you can create and share your professional profile.
            Built with security-first principles and modern authentication.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/sign-up" className="cta" style={{ textDecoration: 'none', padding: '0.75rem 1.5rem' }}>Get Started</Link>
            <Link to="/sign-in" className="secondary" style={{ textDecoration: 'none', padding: '0.75rem 1.5rem' }}>Sign In</Link>
          </div>
          <div style={{ marginTop: '2rem', padding: '1rem', background: '#f5f5f5', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '0.5rem' }}>Features</h3>
            <ul style={{ textAlign: 'left', margin: '0', paddingLeft: '1.5rem' }}>
              <li>Secure JWT authentication with RS256</li>
              <li>Personal bio page for each user</li>
              <li>View other users' public profiles</li>
              <li>SOC2-compliant password policy</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

function SignUpPage() {
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/sign-up`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, password, displayName: displayName || undefined, bio: bio || undefined }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Sign up failed');
        return;
      }

      navigate('/sign-in', { state: { message: 'Account created! Please sign in.' } });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <NavHeader />
      <main className="page-wrap">
        <section className="panel form-panel" style={{ maxWidth: '400px', margin: '2rem auto' }}>
          <h2>Create Account</h2>
          {error && <div className="notice" style={{ color: 'red' }}>{error}</div>}
          <form onSubmit={handleSubmit} className="form-grid">
            <label>
              Handle *
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                placeholder="yourhandle"
                required
                pattern="^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$"
                title="Lowercase letters, numbers, and hyphens only"
              />
            </label>
            <label>
              Password *
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 12 chars, mixed case, number, special"
                required
                minLength={12}
              />
            </label>
            <label>
              Display Name
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Name (optional)"
              />
            </label>
            <label>
              Bio
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself (optional)"
              />
            </label>
            <button type="submit" className="cta" disabled={loading}>
              {loading ? 'Creating...' : 'Sign Up'}
            </button>
          </form>
          <p style={{ marginTop: '1rem', textAlign: 'center' }}>
            Already have an account? <Link to="/sign-in">Sign In</Link>
          </p>
        </section>
      </main>
    </div>
  );
}

function SignInPage() {
  const [handle, setHandle] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/sign-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.message || 'Invalid credentials');
        return;
      }

      const tokens = await response.json() as AuthTokens;
      login(tokens, handle);
      navigate('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <NavHeader />
      <main className="page-wrap">
        <section className="panel form-panel" style={{ maxWidth: '400px', margin: '2rem auto' }}>
          <h2>Sign In</h2>
          {error && <div className="notice" style={{ color: 'red' }}>{error}</div>}
          <form onSubmit={handleSubmit} className="form-grid">
            <label>
              Handle
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                placeholder="yourhandle"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                required
              />
            </label>
            <button type="submit" className="cta" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <p style={{ marginTop: '1rem', textAlign: 'center' }}>
            Don't have an account? <Link to="/sign-up">Sign Up</Link>
          </p>
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f5f5f5', borderRadius: '4px', fontSize: '0.875rem' }}>
            <strong>Test accounts:</strong> jane-sec, matt-devrel, priya-product<br />
            <strong>Password:</strong> Test123456!@
          </div>
        </section>
      </main>
    </div>
  );
}

function DeleteAccountModal({
  handle,
  onConfirm,
  onCancel,
}: {
  handle: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}) {
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const matches = typed === handle;

  async function handleDelete() {
    if (!matches || deleting) return;
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Delete Account</h3>
        <p className="modal-body">
          This action is <strong>permanent and cannot be undone.</strong> Your account and bio page
          will be permanently deleted.
        </p>
        <p className="modal-body">
          Type <strong>@{handle}</strong> to confirm:
        </p>
        <input
          className="modal-input"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onPaste={(e) => e.preventDefault()}
          placeholder={handle}
          autoComplete="off"
          spellCheck={false}
        />
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            disabled={!matches || deleting}
            onClick={handleDelete}
          >
            {deleting ? 'Deleting…' : 'Delete my account'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { tokens, handle, logout } = useAuth();
  const [bioPage, setBioPage] = useState<BioPage | null>(null);
  const [form, setForm] = useState<BioForm>({ displayName: '', bio: '', links: [] });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadBioPage() {
      if (!tokens) return;
      try {
        const response = await fetch(`${API_URL}/bio-pages/me`, {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        });
        if (response.ok) {
          const data = await response.json() as BioPage;
          setBioPage(data);
          setForm({
            displayName: data.displayName,
            bio: data.bio,
            links: data.links.length > 0 ? data.links : [{ label: '', url: '' }],
          });
        }
      } catch {
        setMessage('Failed to load bio page');
      } finally {
        setLoading(false);
      }
    }
    loadBioPage();
  }, [tokens]);

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!tokens || !bioPage) return;
    setMessage('');

    const payload = {
      displayName: form.displayName.trim(),
      bio: form.bio.trim(),
      links: form.links.filter((l) => l.label.trim() && l.url.trim()),
    };

    try {
      const response = await fetch(`${API_URL}/bio-pages/${bioPage.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const updated = await response.json() as BioPage;
        setBioPage(updated);
        setMessage('Bio page updated!');
      } else {
        setMessage('Update failed');
      }
    } catch {
      setMessage('Network error');
    }
  }

  function updateLink(index: number, key: keyof BioLink, value: string) {
    setForm((prev) => {
      const nextLinks = [...prev.links];
      nextLinks[index] = { ...nextLinks[index], [key]: value };
      return { ...prev, links: nextLinks };
    });
  }

  function addLink() {
    setForm((prev) => ({ ...prev, links: [...prev.links, { label: '', url: '' }] }));
  }

  function removeLink(index: number) {
    setForm((prev) => ({
      ...prev,
      links: prev.links.length === 1 ? [{ label: '', url: '' }] : prev.links.filter((_, i) => i !== index),
    }));
  }

  async function handleDeleteAccount() {
    if (!tokens) return;
    await fetch(`${API_URL}/users/me`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    logout();
    navigate('/');
  }

  if (loading) {
    return (
      <div className="app-shell">
        <NavHeader />
        <main className="page-wrap"><p>Loading...</p></main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <NavHeader />
      <main className="page-wrap">
        <section className="panel form-panel" style={{ maxWidth: '600px', margin: '2rem auto' }}>
          <div className="panel-header">
            <h2>My Bio Page</h2>
            {bioPage && (
              <button className="secondary" onClick={() => navigate(`/bio/${handle}`)}>
                View Public Page
              </button>
            )}
          </div>
          {message && <div className="notice">{message}</div>}
          <form onSubmit={handleUpdate} className="form-grid">
            <label>
              Handle (read-only)
              <input value={handle || ''} disabled />
            </label>
            <label>
              Display Name
              <input
                value={form.displayName}
                onChange={(e) => setForm((prev) => ({ ...prev, displayName: e.target.value }))}
                placeholder="Your Name"
                required
              />
            </label>
            <label>
              Bio
              <textarea
                value={form.bio}
                onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself"
              />
            </label>
            <div className="links-editor">
              <div className="panel-header">
                <h3>Links</h3>
                <button type="button" className="secondary" onClick={addLink}>Add Link</button>
              </div>
              {form.links.map((link, index) => (
                <div key={index} className="link-row">
                  <input
                    value={link.label}
                    onChange={(e) => updateLink(index, 'label', e.target.value)}
                    placeholder="Label"
                  />
                  <input
                    value={link.url}
                    onChange={(e) => updateLink(index, 'url', e.target.value)}
                    placeholder="https://example.com"
                    type="url"
                  />
                  <button type="button" className="secondary" onClick={() => removeLink(index)}>Remove</button>
                </div>
              ))}
            </div>
            <button type="submit" className="cta">Save Changes</button>
          </form>

          <hr className="danger-divider" />
          <div className="danger-zone">
            <div>
              <strong>Delete account</strong>
              <p>Permanently delete your account and bio page. This cannot be undone.</p>
            </div>
            <button type="button" className="btn-danger" onClick={() => setShowDeleteModal(true)}>
              Delete account
            </button>
          </div>
        </section>
      </main>

      {showDeleteModal && handle && (
        <DeleteAccountModal
          handle={handle}
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}

function UsersPage() {
  const { tokens } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [received, setReceived] = useState<Sharing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      if (!tokens) return;
      try {
        const [usersRes, sharingRes] = await Promise.all([
          fetch(`${API_URL}/users`, { headers: { Authorization: `Bearer ${tokens.accessToken}` } }),
          fetch(`${API_URL}/sharing/received`, { headers: { Authorization: `Bearer ${tokens.accessToken}` } }),
        ]);
        if (usersRes.ok) setUsers(await usersRes.json() as User[]);
        if (sharingRes.ok) setReceived(await sharingRes.json() as Sharing[]);
      } catch {
        console.error('Failed to load users');
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [tokens]);

  function sharedPermission(handle: string): Sharing | undefined {
    return received.find((s) => s.ownerHandle === handle);
  }

  return (
    <div className="app-shell">
      <NavHeader />
      <main className="page-wrap">
        <section className="panel" style={{ maxWidth: '800px', margin: '2rem auto' }}>
          <h2>Users</h2>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div className="links-grid">
              {users.map((user) => {
                const perm = sharedPermission(user.handle);
                return (
                  <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid #ddd', borderRadius: '8px', background: '#fff', gap: '1rem' }}>
                    <Link to={`/bio/${user.handle}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                      <div className="avatar">{user.displayName.slice(0, 1).toUpperCase()}</div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <strong>{user.displayName}</strong>
                          {perm && (
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, background: '#dbeafe', color: '#1d4ed8', padding: '0.1rem 0.45rem', borderRadius: '999px' }}>
                              Shared
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, color: '#666', fontSize: '0.85rem' }}>@{user.handle}</p>
                        {perm && (
                          <p style={{ margin: '0.15rem 0 0', color: '#1d4ed8', fontSize: '0.78rem' }}>
                            can edit: {perm.grantedFields.join(', ')}
                          </p>
                        )}
                      </div>
                    </Link>
                    {perm && (
                      <Link to={`/bio/${user.handle}/edit`} className="cta" style={{ textDecoration: 'none', whiteSpace: 'nowrap', fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}>
                        Edit bio
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SharingPage() {
  const { tokens, handle } = useAuth();
  const [granted, setGranted] = useState<Sharing[]>([]);
  const [received, setReceived] = useState<Sharing[]>([]);
  const [sharedHandle, setSharedHandle] = useState('');
  const [grantedFields, setGrantedFields] = useState<Set<string>>(
    new Set(['bio', 'display_name', 'links']),
  );
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function authHeader(): Record<string, string> {
    return tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {};
  }

  async function loadGranted() {
    if (!tokens) return;
    const res = await fetch(`${API_URL}/sharing/granted`, { headers: authHeader() });
    if (res.ok) setGranted(await res.json() as Sharing[]);
  }

  async function loadReceived() {
    if (!tokens) return;
    const res = await fetch(`${API_URL}/sharing/received`, { headers: authHeader() });
    if (res.ok) setReceived(await res.json() as Sharing[]);
  }

  useEffect(() => {
    loadGranted().catch(() => {});
    loadReceived().catch(() => {});
  }, [tokens]);

  function toggleField(field: string) {
    setGrantedFields((prev) => {
      const next = new Set(prev);
      next.has(field) ? next.delete(field) : next.add(field);
      return next;
    });
  }

  async function handleGrant(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    setError('');
    if (grantedFields.size === 0) { setError('Select at least one field.'); return; }
    const res = await fetch(`${API_URL}/sharing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ sharedHandle: sharedHandle.trim(), grantedFields: [...grantedFields] }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || 'Failed to grant access.');
      return;
    }
    setSharedHandle('');
    setMessage('Access granted.');
    loadGranted().catch(() => {});
  }

  async function handleRevoke(id: string) {
    await fetch(`${API_URL}/sharing/${id}`, { method: 'DELETE', headers: authHeader() });
    loadGranted().catch(() => {});
  }

  return (
    <div className="app-shell">
      <NavHeader />
      <main className="page-wrap">
        <div style={{ maxWidth: '700px', margin: '2rem auto', display: 'grid', gap: '1.5rem' }}>

          {/* Grant access */}
          <section className="panel form-panel">
            <h2>Grant Edit Access</h2>
            <p style={{ color: '#666', margin: '0 0 0.75rem' }}>
              Allow another user to edit specific fields of <strong>@{handle}</strong>'s bio.
            </p>
            {error && <div className="notice" style={{ color: 'red' }}>{error}</div>}
            {message && <div className="notice">{message}</div>}
            <form onSubmit={handleGrant} className="form-grid">
              <label>
                User handle to grant access to
                <input
                  value={sharedHandle}
                  onChange={(e) => setSharedHandle(e.target.value.toLowerCase())}
                  placeholder="their-handle"
                  required
                />
              </label>
              <div>
                <p style={{ margin: '0 0 0.4rem', fontWeight: 600 }}>Fields they can edit</p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  {(['bio', 'display_name', 'links'] as const).map((f) => (
                    <label key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 400 }}>
                      <input
                        type="checkbox"
                        checked={grantedFields.has(f)}
                        onChange={() => toggleField(f)}
                        style={{ width: 'auto' }}
                      />
                      {f.replace('_', ' ')}
                    </label>
                  ))}
                </div>
              </div>
              <button type="submit" className="cta">Grant Access</button>
            </form>
          </section>

          {/* Who I've granted access to */}
          <section className="panel">
            <h2>Who Can Edit My Bio</h2>
            {granted.length === 0 ? (
              <p style={{ color: '#666' }}>You haven't granted access to anyone yet.</p>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.75rem' }}>
                {granted.map((s) => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.75rem', border: '1px solid #ddd', borderRadius: '8px', background: '#fff' }}>
                    <div>
                      <strong>@{s.sharedHandle}</strong>
                      <span style={{ marginLeft: '0.75rem', color: '#666', fontSize: '0.85rem' }}>
                        can edit: {s.grantedFields.join(', ')}
                      </span>
                    </div>
                    <button className="secondary" style={{ color: 'red', borderColor: '#fca5a5' }} onClick={() => handleRevoke(s.id)}>
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Bios I can edit */}
          {received.length > 0 && (
            <section className="panel">
              <h2>Bios Shared With Me</h2>
              <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.75rem' }}>
                {received.map((s) => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.75rem', border: '1px solid #ddd', borderRadius: '8px', background: '#fff' }}>
                    <div>
                      <strong>@{s.ownerHandle}</strong>
                      <span style={{ marginLeft: '0.75rem', color: '#666', fontSize: '0.85rem' }}>
                        you can edit: {s.grantedFields.join(', ')}
                      </span>
                    </div>
                    <Link to={`/bio/${s.ownerHandle}`} className="secondary" style={{ textDecoration: 'none' }}>
                      View bio
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function PublicBioPage() {
  const { handle } = useParams<{ handle: string }>();
  const { tokens, handle: currentHandle } = useAuth();
  const navigate = useNavigate();
  const [bioPage, setBioPage] = useState<BioPage | null>(null);
  const [sharingPerm, setSharingPerm] = useState<Sharing | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadBioPage() {
      if (!handle) {
        setError('Bio page not found.');
        return;
      }
      setError('');
      setBioPage(null);
      setSharingPerm(null);

      const response = await fetch(`${API_URL}/bio-pages/handle/${handle}`);
      if (!response.ok) {
        setError('Bio page not found.');
        return;
      }
      const data = await response.json() as BioPage;
      setBioPage(data);

      // Check if current user has edit permission for this bio
      if (tokens && handle !== currentHandle) {
        fetch(`${API_URL}/sharing/received`, {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        })
          .then((r) => r.json())
          .then((perms: Sharing[]) => {
            setSharingPerm(perms.find((p) => p.ownerHandle === handle) ?? null);
          })
          .catch(() => {});
      }
    }

    loadBioPage().catch(() => setError('Failed to load bio page.'));
  }, [handle, tokens]);

  if (error) {
    return (
      <div className="app-shell">
        <NavHeader />
        <main className="page-wrap public-page-wrap">
          <section className="panel public-card">
            <h1>Bio Page</h1>
            <p>{error}</p>
            <Link to="/">Back to Home</Link>
          </section>
        </main>
      </div>
    );
  }

  if (!bioPage) {
    return (
      <div className="app-shell">
        <NavHeader />
        <main className="page-wrap public-page-wrap">
          <section className="panel public-card">
            <p>Loading bio page...</p>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <NavHeader />
      <main className="page-wrap public-page-wrap">
        <section className="panel public-card">
          <div className="profile-head" style={{ justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="avatar">{bioPage.displayName.slice(0, 1).toUpperCase()}</div>
              <div>
                <h1>{bioPage.displayName}</h1>
                <p>@{bioPage.handle}</p>
              </div>
            </div>
            {sharingPerm && (
              <button className="cta" onClick={() => navigate(`/bio/${bioPage.handle}/edit`)}>
                Edit bio
              </button>
            )}
          </div>

          <p>{bioPage.bio}</p>

          {bioPage.links.length > 0 && (
            <div className="links-grid">
              {bioPage.links.map((link) => (
                <a key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noreferrer">
                  <span>{link.label}</span>
                  <small>{link.url}</small>
                </a>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function SharedBioEditPage() {
  const { handle } = useParams<{ handle: string }>();
  const { tokens } = useAuth();
  const navigate = useNavigate();
  const [bioPage, setBioPage] = useState<BioPage | null>(null);
  const [perm, setPerm] = useState<Sharing | null>(null);
  const [form, setForm] = useState<BioForm>({ displayName: '', bio: '', links: [] });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!tokens || !handle) return;
      try {
        const [bioRes, sharingRes] = await Promise.all([
          fetch(`${API_URL}/bio-pages/handle/${handle}`),
          fetch(`${API_URL}/sharing/received`, { headers: { Authorization: `Bearer ${tokens.accessToken}` } }),
        ]);

        if (!bioRes.ok) { navigate('/'); return; }
        const bio = await bioRes.json() as BioPage;
        setBioPage(bio);
        setForm({
          displayName: bio.displayName,
          bio: bio.bio,
          links: bio.links.length > 0 ? bio.links : [{ label: '', url: '' }],
        });

        if (sharingRes.ok) {
          const perms = await sharingRes.json() as Sharing[];
          const found = perms.find((p) => p.ownerHandle === handle) ?? null;
          setPerm(found);
          if (!found) navigate(`/bio/${handle}`); // no permission — go back
        }
      } finally {
        setLoading(false);
      }
    }
    load().catch(() => navigate('/'));
  }, [handle, tokens]);

  const can = (field: string) => perm?.grantedFields.includes(field as never) ?? false;

  function fieldStyle(field: string): React.CSSProperties {
    return can(field) ? {} : { opacity: 0.4, pointerEvents: 'none' };
  }

  function updateLink(index: number, key: keyof BioLink, value: string) {
    setForm((prev) => {
      const next = [...prev.links];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, links: next };
    });
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!bioPage || !tokens || !perm) return;
    setMessage('');

    const payload: Record<string, unknown> = {};
    if (can('display_name')) payload.displayName = form.displayName.trim();
    if (can('bio')) payload.bio = form.bio.trim();
    if (can('links')) payload.links = form.links.filter((l) => l.label.trim() && l.url.trim());

    const res = await fetch(`${API_URL}/bio-pages/${bioPage.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokens.accessToken}` },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const updated = await res.json() as BioPage;
      setBioPage(updated);
      setMessage('Saved!');
    } else {
      const data = await res.json().catch(() => ({})) as { message?: string };
      setMessage(data.message || 'Save failed.');
    }
  }

  if (loading) {
    return (
      <div className="app-shell">
        <NavHeader />
        <main className="page-wrap"><p>Loading...</p></main>
      </div>
    );
  }

  if (!bioPage || !perm) return null;

  return (
    <div className="app-shell">
      <NavHeader />
      <main className="page-wrap">
        <section className="panel form-panel" style={{ maxWidth: '600px', margin: '2rem auto' }}>
          <div className="panel-header">
            <div>
              <h2>Editing @{bioPage.handle}'s bio</h2>
              <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.85rem' }}>
                You can edit: <strong>{perm.grantedFields.join(', ')}</strong>
              </p>
            </div>
            <button className="secondary" onClick={() => navigate(`/bio/${bioPage.handle}`)}>
              View public page
            </button>
          </div>

          {message && <div className="notice">{message}</div>}

          <form onSubmit={handleSave} className="form-grid">
            {/* Handle — always read-only for non-owners */}
            <label style={{ opacity: 0.4 }}>
              Handle (read-only)
              <input value={bioPage.handle} disabled />
            </label>

            {/* Display name */}
            <label style={fieldStyle('display_name')}>
              Display Name
              {!can('display_name') && <span style={{ fontSize: '0.75rem', color: '#999', marginLeft: '0.4rem' }}>(no permission)</span>}
              <input
                value={form.displayName}
                onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))}
                disabled={!can('display_name')}
                placeholder="Display name"
              />
            </label>

            {/* Bio */}
            <label style={fieldStyle('bio')}>
              Bio
              {!can('bio') && <span style={{ fontSize: '0.75rem', color: '#999', marginLeft: '0.4rem' }}>(no permission)</span>}
              <textarea
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                disabled={!can('bio')}
                placeholder="Bio"
              />
            </label>

            {/* Links */}
            <div className="links-editor" style={fieldStyle('links')}>
              <div className="panel-header">
                <h3>
                  Links
                  {!can('links') && <span style={{ fontSize: '0.75rem', color: '#999', marginLeft: '0.4rem' }}>(no permission)</span>}
                </h3>
                {can('links') && (
                  <button type="button" className="secondary" onClick={() => setForm((p) => ({ ...p, links: [...p.links, { label: '', url: '' }] }))}>
                    Add Link
                  </button>
                )}
              </div>
              {form.links.map((link, i) => (
                <div key={i} className="link-row">
                  <input value={link.label} onChange={(e) => updateLink(i, 'label', e.target.value)} placeholder="Label" disabled={!can('links')} />
                  <input value={link.url} onChange={(e) => updateLink(i, 'url', e.target.value)} placeholder="https://example.com" type="url" disabled={!can('links')} />
                  {can('links') && (
                    <button type="button" className="secondary" onClick={() => setForm((p) => ({ ...p, links: p.links.length === 1 ? [{ label: '', url: '' }] : p.links.filter((_, j) => j !== i) }))}>
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button type="submit" className="cta">Save changes</button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default App;
