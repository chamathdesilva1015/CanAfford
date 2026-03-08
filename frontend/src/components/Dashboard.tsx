import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useBackboard } from '../hooks/useBackboard';
import type { UserPreferences } from '../hooks/useBackboard';
import { AffordabilityDashboard } from './AffordabilityDashboard';
import { Map, List, FolderLock, Activity, LogOut, Pencil, Save, X, User, Shield } from 'lucide-react';
import './Dashboard.css';

type Tab = 'explore' | 'listings' | 'vault' | 'advocate' | 'activity';

const CITY_SCHOOL_MAP: Record<string, string[]> = {
  'Toronto': ['University of Toronto', 'Toronto Metropolitan University', 'York University', 'George Brown College', 'Seneca College'],
  'Hamilton': ['McMaster University', 'Mohawk College'],
  'Guelph': ['University of Guelph', 'Conestoga College (Guelph)'],
  'Ottawa': ['University of Ottawa', 'Carleton University', 'Algonquin College'],
  'Mississauga': ['UTM (UofT Mississauga)', 'Sheridan College'],
  'Waterloo': ['University of Waterloo', 'Wilfrid Laurier University']
};

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'explore',  label: 'Explore',  icon: Map },
  { id: 'listings', label: 'Listings', icon: List },
  { id: 'vault',    label: 'Vault',    icon: FolderLock },
  { id: 'advocate', label: 'Advocate', icon: Shield },
  { id: 'activity', label: 'Activity', icon: Activity },
];

export const Dashboard = () => {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth0();
  const { getPreferences, saveUserBudget, loading: backboardLoading } = useBackboard();

  const [preferences, setPreferences] = useState<UserPreferences>({
    budget: 1500,
    cities: ['Toronto'],
    lifestyle: { commuteType: 'Public Transit', dietaryFocus: 'Budget', workLocation: '', livesAlone: true, isStudent: false }
  });
  const [editing, setEditing] = useState(false);
  const [draftBudget, setDraftBudget] = useState(1500);
  const [draftLifestyle, setDraftLifestyle] = useState(preferences.lifestyle);
  const [activeTab, setActiveTab] = useState<Tab>('explore');

  useEffect(() => {
    if (isAuthenticated && user?.sub) {
      getPreferences(user.sub).then(prefs => {
        if (prefs) {
          setPreferences(prefs);
          setDraftBudget(prefs.budget);
          setDraftLifestyle(prefs.lifestyle || { commuteType: 'Public Transit', dietaryFocus: 'Budget', workLocation: '', livesAlone: true, isStudent: false });
        }
      });
    }
  }, [isAuthenticated, user, getPreferences]);

  if (authLoading) return <div className="db-loading">Loading...</div>;
  if (!isAuthenticated) return <div className="db-error">Please log in to view the dashboard.</div>;

  const handleSave = async () => {
    if (user?.sub) {
      const newPrefs = { ...preferences, budget: draftBudget, lifestyle: draftLifestyle };
      await saveUserBudget(user.sub, draftBudget, preferences.cities, draftLifestyle);
      setPreferences(newPrefs);
      setEditing(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setDraftLifestyle(preferences.lifestyle || { commuteType: 'Public Transit', dietaryFocus: 'Budget', workLocation: '', livesAlone: true, isStudent: false });
    setDraftBudget(preferences.budget);
  };

  return (
    <div className="db-root">

      {/* ── TOP NAV ── */}
      <header className="db-topnav">
        <span className="db-logo">CanAfford</span>

        <nav className="db-tabs" role="tablist">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              className={`db-tab ${activeTab === id ? 'db-tab--active' : ''}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>

        <div className="db-topnav-right">
          <div className="db-user-pill">
            <User size={13} />
            <span>{user?.given_name || user?.name?.split(' ')[0] || 'You'}</span>
          </div>
          <button
            className="db-logout-btn"
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </header>

      {/* ── PROFILE MEMORY BAR (always visible) ── */}
      <section className="db-memory-bar">
        {editing ? (
          <div className="db-edit-form">
            <div className="db-form-grid">
              <div className="db-form-group">
                <label>Housing Budget ($/month)</label>
                <input
                  type="number"
                  value={draftBudget}
                  onChange={e => setDraftBudget(Number(e.target.value))}
                  className="db-input"
                />
              </div>
              <div className="db-form-group">
                <label>Preferred Cities (comma separated)</label>
                <input
                  type="text"
                  value={preferences.cities.join(', ')}
                  onChange={e => setPreferences({ ...preferences, cities: e.target.value.split(',').map(c => c.trim()).filter(Boolean) })}
                  placeholder="e.g., Toronto, Guelph..."
                  className="db-input"
                />
              </div>
              <div className="db-form-group">
                <label>Living Situation</label>
                <select
                  value={draftLifestyle.livesAlone ? 'yes' : 'no'}
                  onChange={e => setDraftLifestyle({ ...draftLifestyle, livesAlone: e.target.value === 'yes' })}
                  className="db-input"
                >
                  <option value="yes">Live Alone</option>
                  <option value="no">Roommates / Partner</option>
                </select>
              </div>
              <div className="db-form-group">
                <label>Occupation</label>
                <select
                  value={draftLifestyle.isStudent ? 'student' : 'professional'}
                  onChange={e => setDraftLifestyle({ ...draftLifestyle, isStudent: e.target.value === 'student' })}
                  className="db-input"
                >
                  <option value="professional">Professional</option>
                  <option value="student">Student</option>
                </select>
              </div>

              {draftLifestyle.isStudent && (
                <div className="db-form-group">
                  <label>University / College</label>
                  <select
                    value={draftLifestyle.university || ''}
                    onChange={e => setDraftLifestyle({ ...draftLifestyle, university: e.target.value })}
                    className="db-input"
                  >
                    {(CITY_SCHOOL_MAP[preferences.cities[0]] || CITY_SCHOOL_MAP['Toronto']).map(school => (
                      <option key={school} value={school}>{school}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="db-form-group">
                <label>Dietary Focus</label>
                <select
                  value={draftLifestyle.dietaryFocus}
                  onChange={e => setDraftLifestyle({ ...draftLifestyle, dietaryFocus: e.target.value as any })}
                  className="db-input"
                >
                  <option value="Budget">Budget</option>
                  <option value="Health">Health</option>
                  <option value="Family">Family</option>
                </select>
              </div>

              <div className="db-form-group">
                <label>Primary Commute Destination (Exact Address)</label>
                <input
                  type="text"
                  value={draftLifestyle.workLocation}
                  onChange={e => setDraftLifestyle({ ...draftLifestyle, workLocation: e.target.value })}
                  placeholder="e.g., Downtown Toronto"
                  className="db-input"
                />
              </div>
            </div>
            <div className="db-form-actions">
              <button className="db-btn-save" onClick={handleSave} disabled={backboardLoading}>
                <Save size={14} /> {backboardLoading ? 'Saving...' : 'Save to Memory'}
              </button>
              <button className="db-btn-cancel" onClick={handleCancel}>
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="db-memory-display">
            <div className="db-memory-stats">
              <div className="db-stat">
                <span className="db-stat-label">Budget</span>
                <span className="db-stat-value">${preferences.budget}/mo</span>
              </div>
              <div className="db-stat-div" />
              <div className="db-stat">
                <span className="db-stat-label">Cities</span>
                <span className="db-stat-value">{preferences.cities.join(', ') || 'Anywhere'}</span>
              </div>
              <div className="db-stat-div" />
              <div className="db-stat">
                <span className="db-stat-label">Lifestyle</span>
                <span className="db-stat-value">
                  {preferences.lifestyle?.isStudent ? 'Student' : 'Pro'} · {preferences.lifestyle?.livesAlone ? 'Solo' : 'Shared'} · {preferences.lifestyle?.commuteType} · {preferences.lifestyle?.dietaryFocus} Diet
                </span>
              </div>
              <div className="db-stat-div" />
              <div className="db-stat">
                <span className="db-stat-label">Commute Target</span>
                <span className="db-stat-value" style={{maxWidth: '180px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden'}} title={preferences.lifestyle?.isStudent && preferences.lifestyle?.university ? preferences.lifestyle.university : preferences.lifestyle?.workLocation}>
                  {preferences.lifestyle?.isStudent && preferences.lifestyle?.university ? preferences.lifestyle.university : (preferences.lifestyle?.workLocation || '—')}
                </span>
              </div>
            </div>
            <button className="db-btn-edit" onClick={() => setEditing(true)}>
              <Pencil size={13} /> Edit
            </button>
          </div>
        )}
      </section>

      {/* ── TAB CONTENT ── */}
      <main className="db-tab-content">
        <AffordabilityDashboard
          budget={preferences.budget}
          cities={preferences.cities}
          lifestyle={preferences.lifestyle}
          activeTab={activeTab}
        />
      </main>

    </div>
  );
};
