import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { analyzeLeaseAgreement } from '../services/geminiService';
import type { LeaseAnalysis } from '../services/geminiService';
import { Shield, AlertTriangle, CheckCircle, Loader2, FileText, ExternalLink } from 'lucide-react';
import './AdvocateTab.css';

export const AdvocateTab: React.FC = () => {
  const [leaseText, setLeaseText] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [analysis, setAnalysis] = useState<LeaseAnalysis | null>(null);

  const handleScanLease = async () => {
    if (!leaseText.trim()) {
      toast.error('Please paste a lease agreement to scan.');
      return;
    }
    setIsScanning(true);
    setAnalysis(null);
    const toastId = toast.loading('Scanning lease for illegal clauses...');
    try {
      const result = await analyzeLeaseAgreement(leaseText);
      setAnalysis(result);
      toast.success('Lease analysis complete', { id: toastId });
    } catch (err: any) {
      toast.error(`Analysis failed: ${err.message}`, { id: toastId });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="advocate-tab">
      <div className="advocate-header">
        <div className="advocate-title-row">
          <Shield size={24} />
          <div>
            <h2>Ontario Tenant Advocate</h2>
            <p>AI-powered lease analysis against the Residential Tenancies Act (RTA)</p>
          </div>
        </div>
      </div>

      <div className="advocate-layout">
        {/* LEFT: Lease Input */}
        <div className="advocate-input-panel">
          <label className="advocate-label">
            <FileText size={15} /> Paste Prospective Lease Agreement Here
          </label>
          <textarea
            className="advocate-textarea"
            placeholder="Paste the full text of any Ontario lease agreement here. Our AI advocate will review every clause for fairness, unusual terms, and RTA compliance..."
            value={leaseText}
            onChange={e => setLeaseText(e.target.value)}
            rows={18}
          />
          <button
            className={`advocate-scan-btn ${isScanning ? 'scanning' : ''}`}
            onClick={handleScanLease}
            disabled={isScanning}
          >
            {isScanning ? (
              <><Loader2 className="animate-spin" size={16} /> Reviewing Lease Agreement...</>
            ) : (
              <><Shield size={16} /> Review Full Lease Agreement</>
            )}
          </button>
        </div>

        {/* RIGHT: Analysis Results */}
        <div className="advocate-results-panel">
          {!analysis && !isScanning && (
            <div className="advocate-empty-state">
              <Shield size={48} strokeWidth={1} />
              <h3>Analysis Results</h3>
              <p>Paste a lease agreement and click "Review" to receive your AI Advocate report.</p>
            </div>
          )}

          {isScanning && (
            <div className="advocate-empty-state">
              <Loader2 className="animate-spin" size={48} strokeWidth={1} />
              <h3>Reviewing Lease...</h3>
              <p>Our AI Advocate is ensuring this agreement is fair, standard, and legally compliant with the Ontario RTA.</p>
            </div>
          )}

          {analysis && (
            <div className="advocate-report">
              {/* Overall Risk Badge */}
              <div className={`advocate-risk-badge risk-${analysis.overallRisk.toLowerCase()}`}>
                <span className="risk-level">{analysis.overallRisk} Risk</span>
                <span className="risk-counts">
                  {analysis.illegalClauses.length} Illegal · {analysis.unusualClauses.length} Unusual · {analysis.standardClauses.length} Standard
                </span>
              </div>

              <p className="advocate-summary">{analysis.summary}</p>

              {/* Illegal Flags */}
              {analysis.illegalClauses.length > 0 && (
                <div className="advocate-flags-section">
                  <h4 className="flags-header flags-header--red">
                    <AlertTriangle size={15} /> Illegal / Void Clauses (Violates RTA)
                  </h4>
                  {analysis.illegalClauses.map((flag, idx) => (
                    <div key={idx} className="flag-card flag-card--red">
                      <p className="flag-clause">"{flag.clause}"</p>
                      <p className="flag-reasoning">{flag.reasoning}</p>
                      {flag.referenceUrl && (
                        <a href={flag.referenceUrl} target="_blank" rel="noreferrer" className="flag-ref-link">
                          <ExternalLink size={11} /> View Official RTA Source
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Unusual Flags */}
              {analysis.unusualClauses.length > 0 && (
                <div className="advocate-flags-section">
                  <h4 className="flags-header flags-header--amber">
                    <AlertTriangle size={15} className="text-amber-400" /> Heads Up: Unusual Terms
                  </h4>
                  {analysis.unusualClauses.map((flag, idx) => (
                    <div key={idx} className="flag-card flag-card--amber">
                      <p className="flag-clause">"{flag.clause}"</p>
                      <p className="flag-reasoning">{flag.reasoning}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Standard Flags */}
              {analysis.standardClauses.length > 0 && (
                <div className="advocate-flags-section">
                  <h4 className="flags-header flags-header--green">
                    <CheckCircle size={15} /> Standard & Fair Clauses
                  </h4>
                  {analysis.standardClauses.map((flag, idx) => (
                    <div key={idx} className="flag-card flag-card--green">
                      <p className="flag-clause">"{flag.clause}"</p>
                      <p className="flag-reasoning">{flag.reasoning}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <p style={{fontSize: '0.7rem', fontStyle: 'italic', color: '#64748b', padding: '16px 32px 24px', lineHeight: 1.5}}>
        Disclaimer: CanAfford AI Advocate provides preliminary RTA screening and educational information. It does not constitute formal legal advice. Always verify with the Ontario Landlord and Tenant Board (LTB) or a licensed paralegal before signing a lease.
      </p>
    </div>
  );
};
