import { useState, useEffect, useMemo } from 'react';

import toast from 'react-hot-toast';
import { fetchLiveMarketData } from '../services/geminiService';
import type { VerifiedListing, CityEconomics } from '../services/geminiService';
import { useBackboard } from '../hooks/useBackboard';
import { SearchFilters } from './SearchFilters';
import type { FilterState } from './SearchFilters';
import { MapView } from './MapView';
import { ComparisonView } from './ComparisonView';
import { SmartInsightPanel } from './SmartInsightPanel';
import { Vault } from './Vault';
import { AdvocateTab } from './AdvocateTab';
import { LoadingScreen } from './LoadingScreen';
import { Scale, Home, Heart, Sparkles, Brain } from 'lucide-react';
import type { UserLifestyle } from '../hooks/useBackboard';
import type { RevealedPreferencesResult } from '../services/geminiService';
import { analyzeRevealedPreferences } from '../services/geminiService';
import './AffordabilityDashboard.css';

export interface GeminiAnalysis {
  cityEconomics: CityEconomics;
  listings: Array<{
    id: string;
    status: 'Affordable' | 'Stretch' | 'Unavailable';
    calculatedTrueCost: number;
    rentBurden: number;
    fullRent: number;
    isRoommateSplit: boolean;
    mathBreakdown: {
      rent: number;
      transit: number;
      groceries: number;
      transitSource: string;
      grocerySource: string;
    };
    survivalTip: string;
    calculatedCommuteTime: number;
  }>;
}

export const AffordabilityDashboard = ({ budget, cities, lifestyle, activeTab = 'explore' }: { budget: number, cities: string[], lifestyle: UserLifestyle, activeTab?: string }) => {
  const [analysis, setAnalysis] = useState<GeminiAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  
  const { flagListing, flaggedListings, vaultStatus, toggleVaultDoc, savedListings, saveListing, aiCalibratedFields, syncAiCalibratedFields, saveUserBudget } = useBackboard();

  // New Dashboard Overhaul State
  const [filters, setFilters] = useState<FilterState>({
    city: 'All',
    commuteTolerance: 60,
    trueCostOnly: false,
    isRoommateSplit: false
  });
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  // Comparison Studio State
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [revealedPrefs, setRevealedPrefs] = useState<RevealedPreferencesResult | null>(null);
  const [analyzingPrefs, setAnalyzingPrefs] = useState(false);
  
  const targetCity = filters.city !== 'All' ? filters.city : (cities[0] || 'Toronto');

  const handleToggleCompare = (id: string) => {
    setCompareIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const getGeminiListingData = (id: string) => {
    if (!analysis) return null;
    return analysis.listings.find(a => a.id === id) || null;
  };

  const [validListings, setValidListings] = useState<VerifiedListing[]>([]);

  const handleExecuteSearch = async () => {
    if (!budget || budget <= 0 || !cities || cities.length === 0) return;
    
    const cacheKey = `canAfford_v5_live_gemini_${budget}_${targetCity}_${lifestyle.commuteType}_${lifestyle.dietaryFocus}`;
    
    // We intentionally ignore cache on explicit search to allow the user to refresh the market.
    
    setLoading(true);
    
    try {
      toast('Scanning live market with Google Search...', { icon: undefined, id: 'live-market-search' });
      
      const marketData = await fetchLiveMarketData(targetCity, budget, lifestyle);
      const { cityEconomics, listings } = marketData;
      const fetchedListings = targetCity === 'All' 
        ? listings 
        : listings.filter((l: VerifiedListing) => l.city.toLowerCase().includes(targetCity.toLowerCase()));
        
      const strictListings = Array.from(
        new Map(fetchedListings.map(item => {
          const uniqueKey = item.address.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 15);
          return [uniqueKey, item];
        })).values()
      );
        
      setValidListings(strictListings as VerifiedListing[]);

      let transitCost = cityEconomics.adultTransit;
      if (lifestyle.commuteType === 'Car') {
        transitCost = 250; 
      } else if (lifestyle.isStudent) {
        transitCost = cityEconomics.studentTransit;
      }

      const calculateCommuteTime = (lat: number, lng: number, destination: string, mode: string) => {
        if (!destination) return 30; 
        const seedStr = lat.toString() + lng.toString() + destination;
        let hash = 0;
        for (let i = 0; i < seedStr.length; i++) {
          hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        const baseMinutes = 15 + (Math.abs(hash) % 45); 
        return mode === 'Car' ? Math.max(10, Math.round(baseMinutes * 0.6)) : baseMinutes;
      };

      let groceryCost = cityEconomics.grocery;
      if (lifestyle.dietaryFocus === 'Budget') groceryCost = Math.round(cityEconomics.grocery * 0.8);
      if (lifestyle.dietaryFocus === 'Family' || !lifestyle.livesAlone) groceryCost = Math.round(cityEconomics.grocery * 1.5);

      const generatedAnalysis: GeminiAnalysis = {
        cityEconomics,
        listings: strictListings.map((r: VerifiedListing) => {
          const rentBurden = filters.isRoommateSplit ? Math.round(r.verifiedRent / 2) : r.verifiedRent;
          const trueCost = rentBurden + transitCost + groceryCost;
          
          let status: 'Affordable' | 'Stretch' | 'Unavailable' = 'Affordable';
          if (trueCost > budget * 1.1) status = 'Unavailable';
          else if (trueCost > budget) status = 'Stretch';

          let survivalTip = r.financialInsight || '';
          if (!survivalTip) {
            if (lifestyle.commuteType === 'Car') {
              survivalTip = `We added an estimated $250 for gas/parking. Note: Base rent is $${r.verifiedRent}, but parking is rarely included in ${targetCity}.`;
            } else if (lifestyle.isStudent) {
              survivalTip = `Since you are a student, we applied the cheaper ${cityEconomics.transitName} rate of $${transitCost}.`;
            } else {
              survivalTip = `We added $${transitCost} for the standard ${cityEconomics.transitName} pass in ${targetCity}.`;
            }
          }

          return {
            id: r.id,
            status,
            calculatedTrueCost: trueCost,
            rentBurden: rentBurden,
            fullRent: r.verifiedRent,
            isRoommateSplit: filters.isRoommateSplit,
            calculatedCommuteTime: calculateCommuteTime(r.lat, r.lng, lifestyle.isStudent && lifestyle.university ? lifestyle.university : (lifestyle.workLocation || `${targetCity} Geographic Center`), lifestyle.commuteType),
            mathBreakdown: { 
              rent: r.verifiedRent, 
              transit: transitCost, 
              groceries: groceryCost,
              transitSource: cityEconomics.transitName,
              grocerySource: cityEconomics.grocerySource
            },
            survivalTip: survivalTip
          };
        })
      };

      setAnalysis(generatedAnalysis);
      
      localStorage.setItem(cacheKey, JSON.stringify({
        validListings: strictListings,
        analysis: generatedAnalysis
      }));
      
      // Ensure state updates are flushed before we hide loading
      setTimeout(() => {
        setLoading(false);
        toast.success(`Found ${strictListings.length} live listings with 2026 economic data`);
      }, 500);
    } catch (err: any) {
      console.error("Live Market Fetch Error:", err.message);
      toast.error(`Market Search failed: ${err.message}`, { id: 'api-error' });
      setLoading(false);
    }
  };

  // Initial load only
  useEffect(() => {
    // Only fetch if we have absolutely no listings securely cached for this session yet
    if (validListings.length === 0) {
      handleExecuteSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // We remove the hard return for loading/error so the skeleton can render within the holy grail structure
  
  // Derive final visible listings based on Local Filters AND Gemini AI logic
  const filteredListings = useMemo(() => {
    return validListings.filter(listing => {
      // 1. Hard UI Filters (City)
      if (filters.city !== 'All' && !listing.city.toLowerCase().includes(filters.city.toLowerCase())) return false;

      // 2. Hide Unavailable if requested
      if (filters.trueCostOnly) {
        const aiData = analysis?.listings.find(a => a.id === listing.id);
        if (aiData && aiData.status === 'Unavailable') return false;
      }
      
      return true;
    });
  }, [filters, validListings, analysis]);

  // Extract true costs mapped safely
  const trueCostsMap: Record<string, number> = {};
  if (analysis) {
    analysis.listings.forEach(a => {
      trueCostsMap[a.id] = a.calculatedTrueCost;
    });
  }

  return (
    <div className="adb-root">

      {/* ── EXPLORE: Map + Sidebar + mini card grid ── */}
      {activeTab === 'explore' && (
        <>
          <div className="adb-explore-layout">
            <aside className="adb-sidebar">
              <SearchFilters 
                filters={filters} 
                setFilters={setFilters} 
                onExecuteSearch={handleExecuteSearch} 
                isLoading={loading} 
              />
            </aside>
            <main className="adb-explore-main">
              <div className="adb-map-wrap">
                <MapView
                  listings={filteredListings}
                  selectedListingId={selectedListingId}
                  onSelectListing={setSelectedListingId}
                  activeCity={targetCity}
                />
              </div>
              <div className="adb-card-grid gap-6">
                {loading
                  ? <div style={{gridColumn: '1 / -1'}}><LoadingScreen /></div>
                  : filteredListings.length === 0
                    ? (
                        <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', color: '#94a3b8'}}>
                          <h3 style={{color: '#f8fafc', marginBottom: '8px'}}>No Matches Found</h3>
                          <p>No live listings found in {targetCity} matching your ${budget}/mo budget criteria.</p>
                        </div>
                      )
                    : filteredListings.map(listing => {
                        const aiData = getGeminiListingData(listing.id);
                        const status = aiData?.status || 'Unavailable';
                        const sc = status.toLowerCase();
                        return (
                          <div key={listing.id} className={`adb-card status-${sc} ${selectedListingId === listing.id ? 'adb-card--selected' : ''}`} onClick={() => setSelectedListingId(listing.id)}>
                            <div className="adb-card-img">
                              <div className="adb-card-placeholder">
                                <Home size={42} strokeWidth={1.5} />
                              </div>
                              <span className={`adb-badge adb-badge--${sc}`}>{status}</span>
                            </div>
                            <div className="adb-card-body p-4">
                              <p className="adb-card-price pr-20" style={{marginBottom: '2px'}}>${Math.round(aiData?.calculatedTrueCost || listing.verifiedRent)}<span>/mo Total</span></p>
                              {aiData?.isRoommateSplit && (
                                <p className="text-emerald-400" style={{fontSize: '0.7rem', marginBottom: '4px', fontWeight: 600}}>Your Share: ${aiData.rentBurden} (Half of ${aiData.fullRent})</p>
                              )}
                              {aiData && (
                                <p className="text-slate-400 truncate" style={{fontSize: '0.65rem', marginBottom: '8px', lineHeight: 1.3}}>
                                  Rent: ${aiData.isRoommateSplit ? aiData.rentBurden : aiData.mathBreakdown.rent} | Transit: ${aiData.mathBreakdown.transit} | Food: ${aiData.mathBreakdown.groceries}
                                </p>
                              )}
                              <p className="adb-card-addr text-slate-300 truncate">{listing.address}</p>
                              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px'}}>
                                <label className="adb-compare-chk" onClick={e => e.stopPropagation()}>
                                  <input type="checkbox" checked={compareIds.includes(listing.id)} onChange={() => handleToggleCompare(listing.id)} /> Compare
                                </label>
                                <button 
                                  className={`adb-save-btn ${savedListings.find(s => s.id === listing.id) ? 'saved' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); saveListing(listing); }}
                                  title={savedListings.find(s => s.id === listing.id) ? 'Unsave' : 'Save'}
                                >
                                  <Heart size={13} fill={savedListings.find(s => s.id === listing.id) ? '#ef4444' : 'none'} color={savedListings.find(s => s.id === listing.id) ? '#ef4444' : '#64748b'} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                }
              </div>
            </main>
          </div>
          {compareIds.length >= 2 && (
            <button className="adb-compare-launch" onClick={() => setShowComparison(true)}>
              <Scale size={14} /> Compare {compareIds.length} listings
            </button>
          )}
        </>
      )}

      {/* ── LISTINGS: Full 3-column grid, no map ── */}
      {activeTab === 'listings' && (
        <div className="adb-listings-tab">
          <div className="adb-tab-header">
            <h2>All Listings</h2>
            <p>{filteredListings.length} result{filteredListings.length !== 1 ? 's' : ''} · {cities.join(', ')}</p>
          </div>
          <SearchFilters 
            filters={filters} 
            setFilters={setFilters} 
            onExecuteSearch={handleExecuteSearch} 
            isLoading={loading} 
          />
          <div className="adb-listings-grid gap-6">
            {loading
              ? <div style={{gridColumn: '1 / -1'}}><LoadingScreen /></div>
              : filteredListings.length === 0
                ? (
                    <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '80px 20px', color: '#94a3b8', background: '#000000', borderRadius: '12px', border: '1px solid #1e293b'}}>
                      <h3 style={{color: '#f8fafc', marginBottom: '8px', fontSize: '1.2rem'}}>Market Search Empty</h3>
                      <p>No live listings found in {targetCity} matching your ${budget}/mo budget criteria.</p>
                    </div>
                  )
                : filteredListings.map(listing => {
                    const aiData = getGeminiListingData(listing.id);
                    const status = aiData?.status || 'Unavailable';
                    const sc = status.toLowerCase();
                    return (
                      <div key={listing.id} className={`adb-card adb-card--large status-${sc} ${selectedListingId === listing.id ? 'adb-card--selected' : ''}`} onClick={() => setSelectedListingId(listing.id)}>
                        <div className="adb-card-img">
                          <div className="adb-card-placeholder">
                            <Home size={48} strokeWidth={1.2} />
                          </div>
                          <span className={`adb-badge adb-badge--${sc}`}>{status}</span>
                        </div>
                        <div className="adb-card-body p-4">
                          <p className="adb-card-price pr-20" style={{marginBottom: '2px'}}>${Math.round(aiData?.calculatedTrueCost || listing.verifiedRent)}<span>/mo Total</span></p>
                          {aiData && (
                            <div className="text-slate-400 truncate" style={{fontSize: '0.72rem', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                              <span>Rent: ${aiData.mathBreakdown.rent} | Transit: ${aiData.mathBreakdown.transit} | Food: ${aiData.mathBreakdown.groceries}</span>
                            </div>
                          )}
                          <p className="adb-card-addr text-slate-300 truncate">{listing.address}, {listing.city}</p>
                          <label className="adb-compare-chk" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={compareIds.includes(listing.id)} onChange={() => handleToggleCompare(listing.id)} /> Compare
                          </label>
                        </div>
                      </div>
                    );
                  })
            }
          </div>
          {compareIds.length >= 2 && (
            <button className="adb-compare-launch" onClick={() => setShowComparison(true)}>
              <Scale size={14} /> Compare {compareIds.length} listings
            </button>
          )}
        </div>
      )}

      {/* ── VAULT ── */}
      {activeTab === 'vault' && (
        <div className="adb-vault-tab">
          <div className="adb-tab-header">
            <h2>Behavioral Intelligence Vault</h2>
            <p>Your stated preferences vs. what your saving behavior reveals.</p>
          </div>

          {/* ── BEHAVIORAL SPLIT PANE ── */}
          <div className="adb-behavioral-dashboard">
            <div className="adb-pref-pane adb-pref-stated">
              <h4><Brain size={15} /> Stated Preferences (Backboard Memory)</h4>
              <ul className="adb-pref-list">
                <li><strong>Budget:</strong> ${budget}/mo {aiCalibratedFields.includes('budget') && <span className="ai-calibrated-badge">✨ AI Calibrated</span>}</li>
                <li><strong>Commute:</strong> {lifestyle.commuteType} {aiCalibratedFields.includes('commuteType') && <span className="ai-calibrated-badge">✨ AI Calibrated</span>}</li>
                <li><strong>Diet Focus:</strong> {lifestyle.dietaryFocus} {aiCalibratedFields.includes('dietaryFocus') && <span className="ai-calibrated-badge">✨ AI Calibrated</span>}</li>
                <li><strong>Living:</strong> {lifestyle.livesAlone ? 'Solo' : 'Shared'} {aiCalibratedFields.includes('livesAlone') && <span className="ai-calibrated-badge">✨ AI Calibrated</span>}</li>
                <li><strong>Student:</strong> {lifestyle.isStudent ? `Yes (${lifestyle.university})` : 'No'}</li>
                <li><strong>Cities:</strong> {cities.join(', ')}</li>
              </ul>
            </div>

            <div className="adb-pref-pane adb-pref-revealed">
              <h4><Sparkles size={15} /> Revealed Preferences (Behavioral AI)</h4>
              {savedListings.length < 3 ? (
                <div className="adb-pref-empty">
                  <Heart size={32} strokeWidth={1} color="#334155" />
                  <p>Save at least <strong>3 properties</strong> to unlock AI behavioral analysis.</p>
                  <p className="adb-pref-count">{savedListings.length} / 3 saved</p>
                </div>
              ) : analyzingPrefs ? (
                <div className="adb-pref-empty">
                  <span className="btn-spinner" style={{width: 28, height: 28}} />
                  <p>Analyzing your saving behavior...</p>
                </div>
              ) : revealedPrefs ? (
                <div className="adb-revealed-results">
                  <p className="adb-revealed-insight">{revealedPrefs.revealedInsights}</p>
                  <ul className="adb-pref-list">
                    <li><strong>Avg. Saved Rent:</strong> <span className="text-emerald-400">${revealedPrefs.avgSavedRent}/mo</span></li>
                    <li><strong>Preferred Type:</strong> {revealedPrefs.preferredPropertyType}</li>
                    {revealedPrefs.detectedTraits.map((trait, i) => (
                      <li key={i} className="adb-trait-tag">{trait}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="adb-pref-empty">
                  <Sparkles size={32} strokeWidth={1} color="#334155" />
                  <p>Click "Analyze" below to run behavioral comparison.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── SYNC BUTTON ── */}
          {savedListings.length >= 3 && (
            <div className="adb-sync-row">
              {!revealedPrefs ? (
                <button 
                  className="adb-sync-btn adb-sync-analyze"
                  onClick={async () => {
                    setAnalyzingPrefs(true);
                    try {
                      const result = await analyzeRevealedPreferences(
                        savedListings.map(l => ({ address: l.address, verifiedRent: l.verifiedRent, lat: l.lat, lng: l.lng, beds: l.beds, type: l.type })),
                        { budget, commuteType: lifestyle.commuteType, dietaryFocus: lifestyle.dietaryFocus, livesAlone: lifestyle.livesAlone, isStudent: lifestyle.isStudent, workLocation: lifestyle.workLocation }
                      );
                      setRevealedPrefs(result);
                      toast.success('Behavioral analysis complete!');
                    } catch (err: any) {
                      toast.error(err.message);
                    } finally {
                      setAnalyzingPrefs(false);
                    }
                  }}
                  disabled={analyzingPrefs}
                >
                  {analyzingPrefs ? <><span className="btn-spinner" /> Analyzing...</> : <><Brain size={16} /> Analyze Saved Behavior</>}
                </button>
              ) : (
                <button 
                  className="adb-sync-btn"
                  onClick={async () => {
                    const updates = revealedPrefs.suggestedUpdates;
                    const newBudget = updates.budget || budget;
                    const newLifestyle = { ...lifestyle };
                    const calibratedFields: string[] = [];

                    if (updates.budget && updates.budget !== budget) calibratedFields.push('budget');
                    if (updates.commuteType && updates.commuteType !== lifestyle.commuteType) {
                      newLifestyle.commuteType = updates.commuteType as any;
                      calibratedFields.push('commuteType');
                    }
                    if (updates.dietaryFocus && updates.dietaryFocus !== lifestyle.dietaryFocus) {
                      newLifestyle.dietaryFocus = updates.dietaryFocus as any;
                      calibratedFields.push('dietaryFocus');
                    }
                    if (updates.livesAlone != null && updates.livesAlone !== lifestyle.livesAlone) {
                      newLifestyle.livesAlone = updates.livesAlone;
                      calibratedFields.push('livesAlone');
                    }

                    await saveUserBudget('default_user', newBudget, cities, newLifestyle);
                    syncAiCalibratedFields(calibratedFields);
                    toast.success('Memory Updated: Backboard synced with your behavioral data.', { icon: '✨', duration: 4000 });
                  }}
                >
                  <Sparkles size={16} /> Sync Backboard to Reality
                </button>
              )}
            </div>
          )}

          {/* ── ORIGINAL VAULT DOCUMENTS ── */}
          <div className="adb-vault-layout" style={{marginTop: '24px'}}>
            <Vault vaultStatus={vaultStatus} onToggleDoc={toggleVaultDoc} />
            <div className="adb-vault-health">
              <h3>Document Health</h3>
              <div className="adb-health-track">
                <div
                  className="adb-health-fill"
                  style={{ width: `${Math.round((Object.values(vaultStatus).filter(Boolean).length / Math.max(Object.keys(vaultStatus).length, 1)) * 100)}%` }}
                />
              </div>
              <p>{Object.values(vaultStatus).filter(Boolean).length} of {Object.keys(vaultStatus).length} documents secured</p>
              <button className="adb-upload-btn">+ Upload New Document</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADVOCATE ── */}
      {activeTab === 'advocate' && (
        <AdvocateTab />
      )}

      {/* ── ACTIVITY ── */}
      {activeTab === 'activity' && (
        <div className="adb-activity-tab">
          <div className="adb-tab-header">
            <h2>Recent Activity</h2>
            <p>Your AI market scans and property history.</p>
          </div>
          <div className="adb-activity-list">
            {validListings.length === 0 ? (
              <p className="adb-activity-empty">No scans yet — go to Explore to run a live market search.</p>
            ) : (
              validListings.map((listing, i) => {
                const aiData = getGeminiListingData(listing.id);
                return (
                  <div key={listing.id} className="adb-activity-item">
                    <div className="adb-activity-dot" />
                    <div>
                      <p className="adb-activity-title">AI Market Scan #{i + 1}</p>
                      <p className="adb-activity-detail">{listing.address} — ${listing.verifiedRent}/mo</p>
                      {aiData && <p className="adb-activity-cost">True Cost ~${Math.round(aiData.calculatedTrueCost)}/mo · Status: {aiData.status}</p>}
                      <a className="adb-activity-source" href={listing.deepLink || listing.sourceUrl} target="_blank" rel="noreferrer">{listing.sourceName}</a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* INSIGHT PANEL (global slide-over, shown in any tab) */}
      <SmartInsightPanel
        listing={selectedListingId ? validListings.find(l => l.id === selectedListingId) || null : null}
        aiData={selectedListingId ? getGeminiListingData(selectedListingId) : null}
        budget={budget}
        lifestyle={lifestyle}
        isFlagged={selectedListingId ? flaggedListings.includes(selectedListingId) : false}
        onFlag={flagListing}
        onClose={() => setSelectedListingId(null)}
      />

      {showComparison && (
        <ComparisonView
          listings={useMemo(() => validListings?.filter(l => compareIds?.includes(l.id)) || [], [compareIds, validListings])}
          budget={budget}
          lifestyle={lifestyle}
          trueCosts={trueCostsMap}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
};

