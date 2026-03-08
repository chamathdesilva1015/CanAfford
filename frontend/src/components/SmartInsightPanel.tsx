import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import toast from 'react-hot-toast';
import type { VerifiedListing } from '../services/geminiService';
import type { UserLifestyle } from '../hooks/useBackboard';
import { generatePropertyBrief } from '../services/voiceService';
import type { PropertyBriefInput } from '../services/voiceService';
import { MOCK_ONTARIO_LEASE } from '../data/mockLease';
import { fetchDeepNeighborhoodReport } from '../services/geminiService';
import type { NeighborhoodReport } from '../services/geminiService';
import { 
  ExternalLink, Volume2, AlertTriangle, FileText, 
  Mail, Lightbulb, Home, Train, ShoppingCart, Info, 
  Search, Copy, Link2, ChevronRight 
} from 'lucide-react';
import './SmartInsightPanel.css';

interface SmartInsightPanelProps {
  listing: VerifiedListing | null;
  aiData: any; // Using the sub-object from GeminiAnalysis
  budget: number;
  lifestyle: UserLifestyle;
  onClose: () => void;
}

export const SmartInsightPanel: React.FC<SmartInsightPanelProps> = ({ 
  listing, aiData, budget, lifestyle, onClose 
}) => {
  const [isClosing, setIsClosing] = useState(false);
  
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300); // match CSS animation duration
  };

  // State Reset on Listing Change (Safety)
  React.useEffect(() => {
    setLeaseFlags(null);
    setIntroEmail(null);
    setDeepReport(null);
    setAudioState('idle');
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }, [listing?.id]);
  const [audioState, setAudioState] = React.useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  
  // Logistics State
  const [scanningLease, setScanningLease] = useState(false);
  const [leaseFlags, setLeaseFlags] = useState<string | null>(null);
  
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [introEmail, setIntroEmail] = useState<string | null>(null);

  // Deep Research State
  const [isResearching, setIsResearching] = useState(false);
  const [deepReport, setDeepReport] = useState<NeighborhoodReport | null>(null);

  if (!listing) return null;

  const status = aiData?.status || 'Unavailable';

  // --- Determine price type from literal extraction ---
  const hasSinglePrice = typeof listing.singlePrice === 'number';
  const hasRange = !!(listing.priceRange?.min && listing.priceRange?.max);
  const priceMin = listing.priceRange?.min ?? listing.verifiedRent;
  const priceMax = listing.priceRange?.max ?? listing.verifiedRent;

  // Partial affordability: range straddles budget (low fits, high doesn't)
  const isPartialMatch = hasRange && priceMin <= budget && priceMax > budget;

  // --- Externalize AI Computed Values ---
  const transit = aiData?.mathBreakdown?.transit || 0;
  const groceries = aiData?.mathBreakdown?.groceries || 0;
  const grocerySource = aiData?.mathBreakdown?.grocerySource || 'Regional API';
  
  const trueCost = Number((aiData?.calculatedTrueCost || listing.verifiedRent + transit + groceries).toFixed(2));
  const costDelta = budget - trueCost;
  const isOverBudget = !isPartialMatch && costDelta < 0;
  const costDeltaDisplay = Math.abs(costDelta).toFixed(2);

  // --- Verify button label ---
  const verifyLabel = listing.sourceName
    ? `View Original Ad on ${listing.sourceName}`
    : 'View Listing';
  const verifyUrl = listing.deepLink || listing.sourceUrl || '#';
  
  const handleAudioPlay = async () => {
    // If already playing, toggle pause/resume
    if (audioState === 'playing' && audioRef.current) {
      audioRef.current.pause();
      setAudioState('paused');
      return;
    }
    if (audioState === 'paused' && audioRef.current) {
      audioRef.current.play();
      setAudioState('playing');
      return;
    }

    // Generate new audio
    setAudioState('loading');
    const toastId = toast.loading('Generating affordability brief...');
    try {
      const briefInput: PropertyBriefInput = {
        listingId: listing.id,
        address: listing.address,
        city: listing.city || '',
        rent: listing.verifiedRent,
        hasRange,
        rentMin: priceMin,
        rentMax: priceMax,
        transitLow: transit, // Pass exact
        transitHigh: transit,
        groceryLow: groceries,
        groceryHigh: groceries,
        trueCostLow: trueCost,
        trueCostHigh: trueCost,
        budget,
        status,
        financialTip: aiData?.survivalTip || 'Here is your financial breakdown limit review.'
      };

      const blobUrl = await generatePropertyBrief(briefInput);
      if (!blobUrl) {
        toast.error('Voice service unavailable — check your ElevenLabs API key', { id: toastId });
        setAudioState('idle');
        return;
      }

      // Stop any previous audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const audio = new Audio(blobUrl);
      audioRef.current = audio;
      audio.onended = () => setAudioState('idle');
      audio.onerror = () => { setAudioState('idle'); toast.error('Audio playback error'); };
      await audio.play();
      setAudioState('playing');
      toast.success('Playing affordability brief', { id: toastId });
    } catch (err: any) {
      toast.error('Audio synthesis failed', { id: toastId });
      setAudioState('idle');
    }
  };

  const handleAudioStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setAudioState('idle');
  };

  const handleScanLease = async () => {
    setScanningLease(true);
    setLeaseFlags(null);
    const toastId = toast.loading('Scanning lease document...');
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Missing Gemini Key");
      
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const prompt = `Analyze this Ontario Standard Lease. Identify any illegal deposits (like damage deposits which are illegal in ON), hidden utility costs, or restrictive clauses. Summarize them as highly concise "Red Flags" for the prospective tenant.
        
        LEASE TEXT:
        ${MOCK_ONTARIO_LEASE}
        `;
        
        const result = await model.generateContent(prompt);
        setLeaseFlags(result.response.text());
        toast.success('Lease analysis complete', { id: toastId });
      } catch (err: any) {
        if (err.message && err.message.includes('429')) {
          toast.error("Gemini API Free Tier Limit Reached. Please pause 30 seconds.", { id: toastId });
        } else {
          toast.error(`Scan failed: ${err.message}`, { id: toastId });
        }
      }
    } catch (err: any) {
      toast.error(`Initialization failed: ${err.message}`, { id: toastId });
    } finally {
      setScanningLease(false);
    }
  };

  const handleGenerateEmail = async () => {
    setGeneratingEmail(true);
    setIntroEmail(null);
    const toastId = toast.loading('Drafting introduction email...');
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Missing Gemini Key");
      
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const prompt = `Draft a short, empathetic, and professional introduction email to a landlord for the property at "${listing.address}".
        The user is a highly reliable tenant with these traits:
        - Work Location: ${lifestyle.workLocation}
        - Commute style: ${lifestyle.commuteType}
        - Diet/Focus: ${lifestyle.dietaryFocus}
        
        Make it sound natural, polite, and no longer than 3 paragraphs. Do NOT include placeholders like [Your Name] just sign off generically as 'A very interested tenant'.`;
        
        const result = await model.generateContent(prompt);
        setIntroEmail(result.response.text());
        toast.success('Email drafted successfully', { id: toastId });
      } catch (err: any) {
        if (err.message && err.message.includes('429')) {
          toast.error("Gemini API Free Tier Limit Reached. Please pause 30 seconds.", { id: toastId });
        } else {
          toast.error(`Drafting failed: ${err.message}`, { id: toastId });
        }
      }
    } catch (err: any) {
      toast.error(`Initialization failed: ${err.message}`, { id: toastId });
    } finally {
      setGeneratingEmail(false);
    }
  };

  const handleDeepResearch = async () => {
    setIsResearching(true);
    setDeepReport(null);
    const toastId = toast.loading('Running deep background check...');
    try {
      const report = await fetchDeepNeighborhoodReport(listing.address, listing.city);
      setDeepReport(report);
      toast.success('Neighborhood report complete', { id: toastId });
    } catch (err: any) {
      toast.error(`Research failed: ${err.message}`, { id: toastId });
    } finally {
      setIsResearching(false);
    }
  };

  return (
    <aside className={`smart-insight-panel ${isClosing ? 'closing' : ''} pro-theme`}>
      <header className="sip-header">
        <h2>Property Insights</h2>
        <button className="close-panel-btn" onClick={handleClose}>&times;</button>
      </header>

      <div className="sip-content">
        <div className="sip-hero">
          <div className="adb-card-placeholder" style={{ height: '100%' }}>
            <Home size={64} strokeWidth={1.2} />
          </div>
          <div className={`sip-badge sip-badge--${status.toLowerCase()}`}>{status}</div>
        </div>

        <section className="sip-section header-info">
          <h3>{listing.address}</h3>
          
          <p className="base-rent">
            {hasSinglePrice && (
              <>
                <span className="rent-label">Listed Price</span><br/>
                <strong>${listing.singlePrice}/mo</strong>
              </>
            )}
            {hasRange && (
              <>
                <span className="rent-label">Market Rent Range</span><br/>
                <strong>${priceMin} – ${priceMax}/mo</strong>
                <span className="rent-note">Exact range sourced from listing</span>
              </>
            )}
            {!hasSinglePrice && !hasRange && (
              <>
                <span className="rent-label">Estimated Rent</span><br/>
                <strong>${listing.verifiedRent}/mo</strong>
              </>
            )}
          </p>

          {isPartialMatch && (
            <div className="partial-match-badge">
              Partial Match — entry-level units may fit your budget
            </div>
          )}

          <p className="sip-desc">"{listing.description}"</p>
          <a href={verifyUrl} target="_blank" rel="noreferrer" className="verify-link-btn">
            <ExternalLink size={15} />
            {verifyLabel}
          </a>
          {listing.verificationSource && (
            <p className="source-note">
              Source: {listing.verificationSource}
            </p>
          )}
        </section>

        <section className="sip-section true-cost-breakdown">
          <h4 className="text-slate-900">How We Calculated This</h4>
          <div className="math-row">
            <span className="label text-slate-600"><Home size={13} style={{display:'inline', marginRight: 5}} />Starting Rent:</span>
            <span className="text-slate-900">${listing.verifiedRent}/mo</span>
          </div>
          <div className="info-subtext text-slate-500" style={{fontSize:'0.72rem', marginBottom:8}}>
            <Info size={11} style={{display:'inline', marginRight: 4}} />Starting market rate based on your search
          </div>
          <div className="math-row">
            <span className="label"><Train size={13} style={{display:'inline', marginRight: 5}} />Commute ({lifestyle.commuteType}):</span>
            <span className="impact-calc">${transit}</span>
          </div>
          <div className="info-subtext text-slate-500">
            <Info size={11} style={{display:'inline', marginRight: 4}} />Estimated Time: {aiData?.calculatedCommuteTime || 30} minutes to {lifestyle.isStudent && lifestyle.university ? lifestyle.university : (lifestyle.workLocation || 'your destination')}.
          </div>
          <div className="math-row">
            <span className="label"><ShoppingCart size={13} style={{display:'inline', marginRight: 5}} />Groceries ({lifestyle.dietaryFocus}):</span>
            <span className="impact-calc">${groceries}</span>
          </div>
          <div className="info-subtext text-slate-500">
            <Info size={11} style={{display:'inline', marginRight: 4}} />We added ${groceries} based on {grocerySource} for a single adult.
          </div>
          <div className="math-row total-calc mt-4">
            <span className="label">Estimated Total Monthly:</span>
            <span className={`final-est ${isOverBudget ? 'over-budget' : isPartialMatch ? 'status-stretch' : 'under-budget'}`}>
              ${trueCost}/mo
            </span>
          </div>
          {isPartialMatch ? (
            <div className="budget-delta" style={{color:'#d97706', fontWeight:600}}>
              Entry units may fit your ${budget} budget
            </div>
          ) : (
            <div className={`budget-delta ${isOverBudget ? 'delta-neg' : 'delta-pos'}`}>
              {isOverBudget
                ? `+$${costDeltaDisplay} above your $${budget} total budget`
                : `-$${costDeltaDisplay} under your $${budget} total budget`}
            </div>
          )}
        </section>

        <section className="sip-section gemini-insight">
          <h4 className="text-slate-900"><Lightbulb size={15} style={{display:'inline', marginRight:6}} />Financial Insight</h4>
          <div className="insight-card">
            <p>{aiData?.survivalTip}</p>
          </div>

          {/* ElevenLabs Affordability Brief */}
          <div className="sip-audio-controls">
            <button
              className={`sip-audio-btn ${audioState !== 'idle' ? 'sip-audio-btn--active' : ''}`}
              onClick={handleAudioPlay}
              disabled={audioState === 'loading'}
            >
              {audioState === 'loading' && <><span className="btn-spinner" /> Generating Brief...</>}
              {audioState === 'idle' && <><Volume2 size={14} /> Listen to Affordability Brief</>}
              {audioState === 'playing' && <><Volume2 size={14} /> Pause Brief</>}
              {audioState === 'paused' && <><Volume2 size={14} /> Resume Brief</>}
            </button>
            {(audioState === 'playing' || audioState === 'paused') && (
              <button className="sip-audio-stop" onClick={handleAudioStop}>Stop</button>
            )}
            {audioState === 'playing' && (
              <div className="sip-waveform" aria-hidden="true">
                <span /><span /><span /><span /><span />
              </div>
            )}
          </div>
          <p className="sip-audio-credit">Powered by ElevenLabs AI</p>
        </section>

        <section className="sip-section community-vetting">
          <h4 className="text-slate-900">Neighborhood & Livability Index</h4>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <div className={`trust-ring score-${listing.trustScore > 80 ? 'high' : listing.trustScore > 60 ? 'med' : 'low'}`}>
              <span className="score-num">{listing.trustScore}</span>
            </div>
            <span className="score-label" style={{marginLeft: '12px'}}>Livability Score</span>
          </div>
          <p className="text-slate-500" style={{fontSize: '0.72rem', marginBottom: '1rem', lineHeight: 1.3}}>
            Calculated using regional walkability, transit density, and aggregate community safety data.
          </p>
          
          <ul className="sip-notes">
            {listing.communityNotes.map((note, idx) => (
              <li key={idx}>
                {note} <span style={{color: '#10b981', fontSize: '0.65rem', marginLeft: '4px', whiteSpace: 'nowrap'}}>✓ Verified via Map Data</span>
              </li>
            ))}
          </ul>
          
          {!deepReport ? (
            <button 
              className={`sip-tool-btn sip-research-btn ${isResearching ? 'processing' : ''}`} 
              onClick={handleDeepResearch}
              disabled={isResearching}
              style={{ width: '100%', marginTop: '1rem', background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1' }}
            >
              {isResearching ? (
                <><span className="btn-spinner"></span> Scanning Community Reviews & Safety Data...</>
              ) : (
                <><Search size={14} /> Run Deep Neighborhood Background Check</>
              )}
            </button>
          ) : (
            <div className="deep-report-card">
              <h5 style={{fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)'}}>Target Deep Background Report</h5>
              
              <div className="report-item" style={{marginBottom: '16px'}}>
                <span className="report-label" style={{display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '8px'}}>Building/Landlord Reputation</span>
                <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  {deepReport.reputation.map((item, idx) => (
                    <li key={idx} style={{display: 'flex', flexDirection: 'column', gap: '3px'}}>
                      <span style={{display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.8rem', lineHeight: 1.4, color: '#cbd5e1'}}>
                        <ChevronRight size={13} style={{marginTop: '2px', flexShrink: 0, color: '#64748b'}} />
                        {item.claim}
                      </span>
                      {item.source && (
                        item.url ? (
                          <a href={item.url} target="_blank" rel="noreferrer" style={{display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#60efff', fontStyle: 'italic', marginLeft: '19px', textDecoration: 'none', transition: 'color 0.2s'}}>
                            <Link2 size={10} /> Source: {item.source.split(',')[0].trim()}
                          </a>
                        ) : (
                          <span style={{display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#64748b', fontStyle: 'italic', marginLeft: '19px'}}>
                            <Link2 size={10} /> Source: {item.source.split(',')[0].trim()}
                          </span>
                        )
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="report-item" style={{marginBottom: '16px'}}>
                <span className="report-label" style={{display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '8px'}}>Safety & Crime Profile</span>
                <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px'}}>
                  {deepReport.safety.map((item, idx) => (
                    <li key={idx} style={{display: 'flex', flexDirection: 'column', gap: '3px'}}>
                      <span style={{display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.8rem', lineHeight: 1.4, color: '#cbd5e1'}}>
                        <ChevronRight size={13} style={{marginTop: '2px', flexShrink: 0, color: '#64748b'}} />
                        {item.claim}
                      </span>
                      {item.source && (
                        item.url ? (
                          <a href={item.url} target="_blank" rel="noreferrer" style={{display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#60efff', fontStyle: 'italic', marginLeft: '19px', textDecoration: 'none', transition: 'color 0.2s'}}>
                            <Link2 size={10} /> Source: {item.source.split(',')[0].trim()}
                          </a>
                        ) : (
                          <span style={{display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#64748b', fontStyle: 'italic', marginLeft: '19px'}}>
                            <Link2 size={10} /> Source: {item.source.split(',')[0].trim()}
                          </span>
                        )
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="report-item" style={{marginBottom: '12px'}}>
                <span className="report-label" style={{display: 'block', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '8px'}}>Environmental Vibe</span>
                <ul style={{listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  {deepReport.environmentalVibe.map((item, idx) => (
                    <li key={idx} style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                      <div style={{display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.8rem', lineHeight: 1.4, color: '#cbd5e1'}}>
                        <ChevronRight size={13} style={{marginTop: '2px', flexShrink: 0, color: '#64748b'}} />
                        <span>{item.claim}</span>
                      </div>
                      {item.source && (
                        item.url ? (
                          <a href={item.url} target="_blank" rel="noreferrer" style={{display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#60efff', fontStyle: 'italic', marginLeft: '19px', textDecoration: 'none', transition: 'color 0.2s'}}>
                            <Link2 size={10} /> Source: {item.source.split(',')[0].trim()}
                          </a>
                        ) : (
                          <span style={{display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#64748b', fontStyle: 'italic', marginLeft: '19px'}}>
                            <Link2 size={10} /> Source: {item.source.split(',')[0].trim()}
                          </span>
                        )
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

        </section>

        <section className="sip-section logistics-toolkit">
            <h4 className="text-slate-900">Application Logistics Tools</h4>
            
            <div className="toolkit-action">
              <button 
                className={`sip-tool-btn ${scanningLease ? 'processing' : ''}`} 
                onClick={handleScanLease}
                disabled={scanningLease}
              >
                {scanningLease ? <><span className="btn-spinner"></span> Scanning...</> : <><FileText size={14} /> Scan Potential Lease</>}
              </button>
              {leaseFlags && (
                <div className="lease-flags-output">
                  <strong><AlertTriangle size={13} style={{display:'inline', marginRight:4}} />Lease Red Flags:</strong>
                  <div className="ai-text-box">{leaseFlags}</div>
                </div>
              )}
            </div>

            <div className="toolkit-action">
              <button 
                className={`sip-tool-btn email-btn ${generatingEmail ? 'processing' : ''}`} 
                onClick={handleGenerateEmail}
                disabled={generatingEmail}
              >
                {generatingEmail ? <><span className="btn-spinner"></span> Drafting...</> : <><Mail size={14} /> Generate Intro Email</>}
              </button>
              {introEmail && (
                <div className="intro-email-output">
                  <strong>Draft Ready:</strong>
                  <textarea 
                    className="ai-text-box selectable" 
                    readOnly 
                    value={introEmail}
                    style={{width: '100%', minHeight: '160px', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.8rem', padding: '12px', background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: '8px', marginTop: '8px', lineHeight: 1.5}}
                  />
                  <button 
                    className="sip-tool-btn" 
                    onClick={() => { navigator.clipboard.writeText(introEmail); toast.success('Email copied to clipboard!'); }}
                    style={{marginTop: '8px', width: '100%'}}
                  >
                    <Copy size={14} /> Copy to Clipboard
                  </button>
                </div>
              )}
            </div>
        </section>
      </div>
    </aside>
  );
};
