import { useState, useEffect, useMemo } from 'react';

import { AdvancedImage, placeholder, lazyload } from '@cloudinary/react';
import { fill } from '@cloudinary/url-gen/actions/resize';
import { format, quality } from '@cloudinary/url-gen/actions/delivery';
import { auto } from '@cloudinary/url-gen/qualifiers/format';
import { auto as autoQuality } from '@cloudinary/url-gen/qualifiers/quality';
import toast from 'react-hot-toast';
import { cld } from '../cloudinary/config';
import { fetchLiveMarketData } from '../services/geminiService';
import type { VerifiedListing, CityEconomics } from '../services/geminiService';
import { useBackboard } from '../hooks/useBackboard';
import { SearchFilters } from './SearchFilters';
import type { FilterState } from './SearchFilters';
import { MapView } from './MapView';
import { ComparisonView } from './ComparisonView';
import { SmartInsightPanel } from './SmartInsightPanel';
import { Vault } from './Vault';
import { SkeletonCard } from './SkeletonCard';
import { Scale } from 'lucide-react';
import type { UserLifestyle } from '../hooks/useBackboard';
import './AffordabilityDashboard.css';

export interface GeminiAnalysis {
  cityEconomics: CityEconomics;
  listings: Array<{
    id: string;
    status: 'Affordable' | 'Stretch' | 'Unavailable';
    calculatedTrueCost: number;
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
  
  const { flagListing, flaggedListings, vaultStatus, toggleVaultDoc } = useBackboard();

  // New Dashboard Overhaul State
  const [filters, setFilters] = useState<FilterState>({
    city: 'All',
    commuteTolerance: 60,
    trueCostOnly: false
  });
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  // Comparison Studio State
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

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

  useEffect(() => {
    const fetchAndAnalyze = async () => {
      if (!budget || budget <= 0 || !cities || cities.length === 0) return;
      
      // We use the absolute budget directly as the limiter
      // Cache version updated to v2 to invalidate the bugged trust-score constants from previous runs
      const cacheKey = `canAfford_v2_live_gemini_${budget}_${targetCity}_${lifestyle.commuteType}_${lifestyle.dietaryFocus}`;
      
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.validListings && parsed.analysis) {
            setValidListings(parsed.validListings);
            setAnalysis(parsed.analysis);
            return;
          }
        } catch (e) {
          localStorage.removeItem(cacheKey);
        }
      }

      setLoading(true);
      
      try {
        toast('Scanning live market with Google Search...', { icon: undefined, id: 'live-market-search' });
        
        // 1. Fetch live market config (Listings + 2026 City Economics) using the target budget
        const marketData = await fetchLiveMarketData(targetCity, budget);
        const { cityEconomics, listings } = marketData;
        const strictListings = targetCity === 'All' 
          ? listings 
          : listings.filter((l: VerifiedListing) => l.city.toLowerCase().includes(targetCity.toLowerCase()));
          
        setValidListings(strictListings);

        // 2. Deterministic UI Math evaluator using live Gemini Economics
        const transitCost = lifestyle.commuteType === 'Car' 
          ? 250 // Flat estimate for gas/parking
          : (lifestyle.isStudent ? cityEconomics.studentTransit : cityEconomics.adultTransit);

        // Simulated geographic string-distance math
        const calculateCommuteTime = (lat: number, lng: number, destination: string, mode: string) => {
          if (!destination) return 30; // default fallback
          // Mock engine: build a stable seed from the coordinates and string
          const seedStr = lat.toString() + lng.toString() + destination;
          let hash = 0;
          for (let i = 0; i < seedStr.length; i++) {
            hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
          }
          const baseMinutes = 15 + (Math.abs(hash) % 45); // Range: 15 to 60 mins
          return mode === 'Car' ? Math.max(10, Math.round(baseMinutes * 0.6)) : baseMinutes;
        };

        let groceryCost = cityEconomics.grocery;
        if (lifestyle.dietaryFocus === 'Budget') groceryCost = Math.round(cityEconomics.grocery * 0.8);
        if (lifestyle.dietaryFocus === 'Family' || !lifestyle.livesAlone) groceryCost = Math.round(cityEconomics.grocery * 1.5);

        const generatedAnalysis: GeminiAnalysis = {
          cityEconomics,
          listings: strictListings.map((r: VerifiedListing) => {
            const trueCost = r.verifiedRent + transitCost + groceryCost;
            
            let status: 'Affordable' | 'Stretch' | 'Unavailable' = 'Affordable';
            if (trueCost > budget * 1.1) status = 'Unavailable';
            else if (trueCost > budget) status = 'Stretch';

            let survivalTip = '';
            if (lifestyle.commuteType === 'Car') {
              survivalTip = `We added an estimated $250 for gas/parking. Note: Base rent is $${r.verifiedRent}, but parking is rarely included in ${targetCity}.`;
            } else if (lifestyle.isStudent) {
              survivalTip = `Since you are a student, we applied the cheaper ${cityEconomics.transitName} rate of $${transitCost}.`;
            } else {
              survivalTip = `We added $${transitCost} for the standard ${cityEconomics.transitName} pass in ${targetCity}.`;
            }

            return {
              id: r.id,
              status,
              calculatedTrueCost: trueCost,
              calculatedCommuteTime: calculateCommuteTime(r.lat, r.lng, lifestyle.isStudent && lifestyle.university ? lifestyle.university : lifestyle.workLocation, lifestyle.commuteType),
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
        
        toast.success(`Found ${strictListings.length} live listings with 2026 economic data`);
      } catch (err: any) {
        console.error("Live Market Fetch Error:", err.message);
        toast.error(`Market Search failed: ${err.message}`, { id: 'api-error' });
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchAndAnalyze();
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [budget, cities, lifestyle, filters.city]);

  // We remove the hard return for loading/error so the skeleton can render within the holy grail structure
  
  // Derive final visible listings based on Local Filters AND Gemini AI logic
  const filteredListings = useMemo(() => {
    return validListings.filter(listing => {
      // 1. Hard UI Filters (City)
      if (filters.city !== 'All' && !listing.city.toLowerCase().includes(filters.city.toLowerCase())) return false;

      // The Two-Step Engine Pipeline explicitly mandates we NEVER hide a listing
      // just because the evaluated True Cost blows the budget. We render it and
      // label it "Stretch" or "Unavailable" to show the user the math.
      
      return true;
    });
  }, [filters, validListings]);

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
              <SearchFilters filters={filters} setFilters={setFilters} />
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
              <div className="adb-card-grid">
                {loading
                  ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
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
                        const isExternal = listing.imageId.startsWith('http');
                        let displayImage: any = null;
                        if (!isExternal) {
                          displayImage = cld.image(listing.imageId)
                            .resize(fill().width(300).height(180))
                            .delivery(format(auto()))
                            .delivery(quality(autoQuality()));
                        }
                        return (
                          <div key={listing.id} className={`adb-card status-${sc} ${selectedListingId === listing.id ? 'adb-card--selected' : ''}`} onClick={() => setSelectedListingId(listing.id)}>
                            <div className="adb-card-img">
                              {isExternal ? <img src={listing.imageId} alt={listing.address} loading="lazy" /> : <AdvancedImage cldImg={displayImage} plugins={[placeholder({ mode: 'blur' }), lazyload()]} alt={listing.address} />}
                              <span className={`adb-badge adb-badge--${sc}`}>{status}</span>
                            </div>
                            <div className="adb-card-body">
                              <p className="adb-card-price" style={{marginBottom: '2px'}}>${Math.round(aiData?.calculatedTrueCost || listing.verifiedRent)}<span>/mo Total</span></p>
                              {aiData && (
                                <p style={{fontSize: '0.65rem', color: '#64748b', marginBottom: '8px', lineHeight: 1.3}}>
                                  Rent: ${aiData.mathBreakdown.rent} | Transit: ${aiData.mathBreakdown.transit} | Groceries: ${aiData.mathBreakdown.groceries}
                                </p>
                              )}
                              <p className="adb-card-addr">{listing.address}</p>
                              <label className="adb-compare-chk" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={compareIds.includes(listing.id)} onChange={() => handleToggleCompare(listing.id)} /> Compare
                              </label>
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
          <SearchFilters filters={filters} setFilters={setFilters} />
          <div className="adb-listings-grid">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
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
                    const isExternal = listing.imageId.startsWith('http');
                    let displayImage: any = null;
                    if (!isExternal) {
                      displayImage = cld.image(listing.imageId)
                        .resize(fill().width(400).height(240))
                        .delivery(format(auto()))
                        .delivery(quality(autoQuality()));
                    }
                    return (
                      <div key={listing.id} className={`adb-card adb-card--large status-${sc} ${selectedListingId === listing.id ? 'adb-card--selected' : ''}`} onClick={() => setSelectedListingId(listing.id)}>
                        <div className="adb-card-img">
                          {isExternal ? <img src={listing.imageId} alt={listing.address} loading="lazy" /> : <AdvancedImage cldImg={displayImage} plugins={[placeholder({ mode: 'blur' }), lazyload()]} alt={listing.address} />}
                          <span className={`adb-badge adb-badge--${sc}`}>{status}</span>
                        </div>
                        <div className="adb-card-body">
                          <p className="adb-card-price" style={{marginBottom: '2px'}}>${Math.round(aiData?.calculatedTrueCost || listing.verifiedRent)}<span>/mo Total</span></p>
                          {aiData && (
                            <div style={{fontSize: '0.72rem', color: '#64748b', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                              <span><strong>Rent:</strong> ${aiData.mathBreakdown.rent}</span>
                              <span style={{color: '#00ff87'}}><strong>Transit:</strong> ${aiData.mathBreakdown.transit} <span style={{fontSize: '0.65rem'}}>({aiData.mathBreakdown.transitSource})</span></span>
                              <span style={{color: '#f87171'}}><strong>Food:</strong> ${aiData.mathBreakdown.groceries} <span style={{fontSize: '0.65rem'}}>({aiData.mathBreakdown.grocerySource})</span></span>
                            </div>
                          )}
                          <p className="adb-card-addr">{listing.address}, {listing.city}</p>
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
            <h2>Application Vault</h2>
            <p>Manage your mandatory Ontario rental application documents.</p>
          </div>
          <div className="adb-vault-layout">
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

