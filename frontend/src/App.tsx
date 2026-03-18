import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';

type BioLink = {
  label: string;
  url: string;
};

type BioPage = {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  links: BioLink[];
  createdAt: string;
  updatedAt: string;
};

type BioForm = {
  handle: string;
  displayName: string;
  bio: string;
  links: BioLink[];
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const NEW_BIO_OPTION = '__new__';

const emptyForm: BioForm = {
  handle: '',
  displayName: '',
  bio: '',
  links: [{ label: '', url: '' }],
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<DashboardLayout />} />
      <Route path="/bio/:handle" element={<PublicBioPage />} />
    </Routes>
  );
}

function DashboardLayout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">B</div>
          <div>
            <div className="brand-name">BioBoard</div>
            <div className="brand-sub">Secure Bio API Starter</div>
          </div>
        </div>

        <div className="user-box">
          <span className="status-dot logged-out" />
          <span className="user-status">Logged out</span>
          <button type="button" className="cta">Login</button>
        </div>
      </header>

      <DashboardPage />
    </div>
  );
}

function DashboardPage() {
  const [bioPages, setBioPages] = useState<BioPage[]>([]);
  const [activeBioId, setActiveBioId] = useState<string>(NEW_BIO_OPTION);
  const [form, setForm] = useState<BioForm>(emptyForm);
  const [message, setMessage] = useState<string>('');
  const navigate = useNavigate();

  const activeBio = useMemo(
    () => bioPages.find((page) => page.id === activeBioId),
    [bioPages, activeBioId],
  );

  const isNewBio = activeBioId === NEW_BIO_OPTION;

  async function fetchBioPages() {
    const response = await fetch(`${API_URL}/bio-pages`);
    return (await response.json()) as BioPage[];
  }

  useEffect(() => {
    async function loadInitialData() {
      const data = await fetchBioPages();
      setBioPages(data);

      if (data.length > 0) {
        setActiveBioId(data[0].id);
        hydrateForm(data[0]);
      } else {
        setActiveBioId(NEW_BIO_OPTION);
        setForm(emptyForm);
      }
    }

    loadInitialData().catch(() => setMessage('Failed to load bio pages.'));
  }, []);

  function hydrateForm(page: BioPage) {
    setForm({
      handle: page.handle,
      displayName: page.displayName,
      bio: page.bio,
      links: page.links.length > 0 ? page.links : [{ label: '', url: '' }],
    });
  }

  function sanitizeLinks(links: BioLink[]) {
    return links
      .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
      .filter((link) => link.label && link.url);
  }

  function onActiveBioChange(nextId: string) {
    setMessage('');
    setActiveBioId(nextId);

    if (nextId === NEW_BIO_OPTION) {
      setForm(emptyForm);
      return;
    }

    const selected = bioPages.find((page) => page.id === nextId);
    if (selected) {
      hydrateForm(selected);
    }
  }

  function updateLink(index: number, key: keyof BioLink, value: string) {
    setForm((prev) => {
      const nextLinks = [...prev.links];
      nextLinks[index] = { ...nextLinks[index], [key]: value };
      return { ...prev, links: nextLinks };
    });
  }

  function addLinkRow() {
    setForm((prev) => ({ ...prev, links: [...prev.links, { label: '', url: '' }] }));
  }

  function removeLinkRow(index: number) {
    setForm((prev) => {
      if (prev.links.length === 1) {
        return { ...prev, links: [{ label: '', url: '' }] };
      }
      return { ...prev, links: prev.links.filter((_, i) => i !== index) };
    });
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setMessage('');

    const payload = {
      handle: form.handle.trim(),
      displayName: form.displayName.trim(),
      bio: form.bio.trim(),
      links: sanitizeLinks(form.links),
    };

    const response = await fetch(`${API_URL}/bio-pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setMessage('Create failed. Handle may already exist or payload is invalid.');
      return;
    }

    const created = (await response.json()) as BioPage;
    const refreshed = await fetchBioPages();
    setBioPages(refreshed);

    const selected = refreshed.find((page) => page.id === created.id) ?? created;
    setActiveBioId(selected.id);
    hydrateForm(selected);
    setMessage('Bio page created.');
  }

  async function handleUpdate(event: FormEvent) {
    event.preventDefault();
    if (!activeBio || isNewBio) {
      setMessage('Select a bio page first.');
      return;
    }

    const payload = {
      handle: form.handle.trim(),
      displayName: form.displayName.trim(),
      bio: form.bio.trim(),
      links: sanitizeLinks(form.links),
    };

    const response = await fetch(`${API_URL}/bio-pages/${activeBio.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setMessage('Update failed.');
      return;
    }

    const updated = (await response.json()) as BioPage;
    const refreshed = await fetchBioPages();
    setBioPages(refreshed);

    const selected = refreshed.find((page) => page.id === updated.id) ?? updated;
    setActiveBioId(selected.id);
    hydrateForm(selected);
    setMessage('Bio page updated.');
  }

  return (
    <main className="page-wrap">
      <section className="panel form-panel">
        {message ? <div className="notice">{message}</div> : null}
        <div className="panel-header">
          <h2>Active Bio</h2>
          <span>{bioPages.length} total</span>
        </div>

        <label>
          Select bio page
          <select
            value={activeBioId}
            onChange={(event) => onActiveBioChange(event.target.value)}
            className="bio-select"
          >
            <option value={NEW_BIO_OPTION}>+ New bio</option>
            {bioPages.map((page) => (
              <option key={page.id} value={page.id}>
                @{page.handle} ({page.displayName})
              </option>
            ))}
          </select>
        </label>

        <div className="panel-header inline-actions">
          <h3>{isNewBio ? 'Create Bio Page' : 'Edit Bio Page'}</h3>
          {!isNewBio && activeBio ? (
            <button
              className="secondary"
              type="button"
              onClick={() => navigate(`/bio/${activeBio.handle}`)}
            >
              View public page
            </button>
          ) : null}
        </div>

        <form onSubmit={isNewBio ? handleCreate : handleUpdate} className="form-grid">
          <label>
            Handle
            <input
              value={form.handle}
              onChange={(event) => setForm((prev) => ({ ...prev, handle: event.target.value }))}
              placeholder="jane"
              required
            />
          </label>

          <label>
            Display name
            <input
              value={form.displayName}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, displayName: event.target.value }))
              }
              placeholder="Jane Doe"
              required
            />
          </label>

          <label>
            Bio
            <textarea
              value={form.bio}
              onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))}
              placeholder="Product engineer"
              required
            />
          </label>

          <div className="links-editor">
            <div className="panel-header">
              <h3>Links</h3>
              <button type="button" className="secondary" onClick={addLinkRow}>
                Add link
              </button>
            </div>

            {form.links.map((link, index) => (
              <div key={`link-${index}`} className="link-row">
                <input
                  value={link.label}
                  onChange={(event) => updateLink(index, 'label', event.target.value)}
                  placeholder="Label"
                />
                <input
                  value={link.url}
                  onChange={(event) => updateLink(index, 'url', event.target.value)}
                  placeholder="https://example.com"
                  type="url"
                />
                <button type="button" className="secondary" onClick={() => removeLinkRow(index)}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button type="submit" className="cta">
            {isNewBio ? 'Create bio' : 'Save changes'}
          </button>

          {!isNewBio && activeBio ? (
            <Link to={`/bio/${activeBio.handle}`} className="route-link">
              Public URL: /bio/{activeBio.handle}
            </Link>
          ) : null}
        </form>
      </section>
    </main>
  );
}

function PublicBioPage() {
  const { handle } = useParams<{ handle: string }>();
  const [bioPage, setBioPage] = useState<BioPage | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function loadBioPage() {
      if (!handle) {
        setError('Bio page not found.');
        return;
      }
      setError('');
      setBioPage(null);

      const response = await fetch(`${API_URL}/bio-pages/handle/${handle}`);
      if (!response.ok) {
        setError('Bio page not found.');
        return;
      }

      const data = (await response.json()) as BioPage;
      setBioPage(data);
    }

    loadBioPage().catch(() => setError('Failed to load bio page.'));
  }, [handle]);

  if (error) {
    return (
      <main className="page-wrap public-page-wrap">
        <section className="panel public-card">
          <h1>Public Bio Page</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  if (!bioPage) {
    return (
      <main className="page-wrap public-page-wrap">
        <section className="panel public-card">
          <p>Loading bio page...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-wrap public-page-wrap">
      <section className="panel public-card">
        <div className="profile-head">
          <div className="avatar">{bioPage.displayName.slice(0, 1).toUpperCase()}</div>
          <div>
            <h1>{bioPage.displayName}</h1>
            <p>@{bioPage.handle}</p>
          </div>
        </div>

        <p>{bioPage.bio}</p>

        <div className="links-grid">
          {bioPage.links.map((link) => (
            <a key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noreferrer">
              <span>{link.label}</span>
              <small>{link.url}</small>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
