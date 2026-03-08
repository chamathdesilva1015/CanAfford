import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { analyzeLeaseAgreement } from '../services/geminiService';
import type { LeaseAnalysis } from '../services/geminiService';
import { Shield, AlertTriangle, CheckCircle, Loader2, FileText } from 'lucide-react';
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
            placeholder="Paste the full text of any Ontario lease agreement here. Our AI paralegal will scan every clause against the Ontario RTA and flag anything illegal..."
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
              <><Loader2 className="animate-spin" size={16} /> Analyzing Against Ontario RTA...</>
            ) : (
              <><Shield size={16} /> Scan Lease for Illegal Clauses</>
            )}
          </button>
        </div>

        {/* RIGHT: Analysis Results */}
        <div className="advocate-results-panel">
          {!analysis && !isScanning && (
            <div className="advocate-empty-state">
              <Shield size={48} strokeWidth={1} />
              <h3>Analysis Results</h3>
              <p>Paste a lease agreement and click "Scan" to receive your AI legal analysis.</p>
            </div>
          )}

          {isScanning && (
            <div className="advocate-empty-state">
              <Loader2 className="animate-spin" size={48} strokeWidth={1} />
              <h3>Scanning Lease...</h3>
              <p>Our AI Paralegal is cross-referencing every clause against the Ontario Residential Tenancies Act.</p>
            </div>
          )}

          {analysis && (
            <div className="advocate-report">
              {/* Overall Risk Badge */}
              <div className={`advocate-risk-badge risk-${analysis.overallRisk.toLowerCase()}`}>
                <span className="risk-level">{analysis.overallRisk} Risk</span>
                <span className="risk-counts">
                  {analysis.redFlags.length} Red Flag{analysis.redFlags.length !== 1 ? 's' : ''} · {analysis.greenFlags.length} Green Flag{analysis.greenFlags.length !== 1 ? 's' : ''}
                </span>
              </div>

              <p className="advocate-summary">{analysis.summary}</p>

              {/* Red Flags */}
              {analysis.redFlags.length > 0 && (
                <div className="advocate-flags-section">
                  <h4 className="flags-header flags-header--red">
                    <AlertTriangle size={15} /> Red Flags — Illegal / Void Clauses
                  </h4>
                  {analysis.redFlags.map((flag, idx) => (
                    <div key={idx} className="flag-card flag-card--red">
                      <p className="flag-clause">"{flag.clause}"</p>
                      <p className="flag-reasoning">{flag.reasoning}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Green Flags */}
              {analysis.greenFlags.length > 0 && (
                <div className="advocate-flags-section">
                  <h4 className="flags-header flags-header--green">
                    <CheckCircle size={15} /> Green Flags — Compliant Clauses
                  </h4>
                  {analysis.greenFlags.map((flag, idx) => (
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
    </div>
  );
};
