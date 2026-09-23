import React, { useState } from 'react';

const STAGES = [
  { id: 0, label: 'REGISTRATION', desc: 'Farmer details & crop registered' },
  { id: 1, label: 'SLOT BOOKED', desc: 'Delivery date & arrival window confirmed' },
  { id: 2, label: 'CHECKED IN', desc: 'Arrived at Mandi entry boom barrier' },
  { id: 3, label: 'WEIGHING', desc: 'Gross & tare weighbridge recorded' },
  { id: 4, label: 'QUALITY CHECK', desc: 'Moisture % and foreign matter graded' },
  { id: 5, label: 'PROCUREMENT ACCEPTED', desc: 'Official mandi purchase order approved' },
  { id: 6, label: 'PAYMENT INITIATED', desc: 'DBT / UPI payment batch queued' },
  { id: 7, label: 'PAYMENT RECEIVED', desc: 'Guaranteed funds settled in farmer bank' },
];

export default function TokenStatusManager({ adminCenterCode = 'CTR-01' }) {
  const [searchInput, setSearchInput] = useState('');
  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [errorType, setErrorType] = useState(null); // '403', '404', or 'generic'
  const [successMessage, setSuccessMessage] = useState(null);

  // Helper to fetch authorization token from localStorage/cookies
  const getAuthHeaders = () => {
    const jwt = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    return {
      'Content-Type': 'application/json',
      'x-center-code': adminCenterCode,
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    };
  };

  // 1. Search Token
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    const query = searchInput.trim();
    if (!query) return;

    setLoading(true);
    setErrorMessage(null);
    setErrorType(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/queue/${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          setErrorType('403');
          setErrorMessage(data.error || 'Access Denied: Token belongs to another procurement center.');
        } else if (res.status === 404) {
          setErrorType('404');
          setErrorMessage(data.error || 'Token not found. Verify the Token ID.');
        } else {
          setErrorType('generic');
          setErrorMessage(data.error || 'Failed to retrieve token.');
        }
        setTokenData(null);
        return;
      }

      setTokenData(data.data);
    } catch (err) {
      setErrorType('generic');
      setErrorMessage('Network error: Unable to contact the procurement server.');
      setTokenData(null);
    } finally {
      setLoading(false);
    }
  };

  // 2. Advance Status
  const handleAdvance = async () => {
    if (!tokenData || tokenData.statusIndex >= STAGES.length - 1) return;

    setAdvancing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/queue/${encodeURIComponent(tokenData.tokenId)}/advance`, {
        method: 'PUT',
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to advance token status.');
        return;
      }

      // Smoothly update local state
      setTokenData((prev) => ({
        ...prev,
        statusIndex: data.data.statusIndex,
        updatedAt: data.data.updatedAt || new Date().toISOString(),
      }));

      setSuccessMessage(
        `Token #${tokenData.tokenId} successfully advanced to "${STAGES[data.data.statusIndex].label}"!`
      );
    } catch (err) {
      setErrorMessage('Network error: Failed to update token status.');
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 font-sans">
      {/* Top Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-emerald-900 tracking-tight">
            Token Status Manager
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Mandi Procurement System • SIH26032
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
            Assigned Mandi Scope:
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-2 h-2 mr-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
            {adminCenterCode}
          </span>
        </div>
      </div>

      {/* Search Bar Form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Enter Token ID (e.g., TKN-1042 or PRC-2026-001)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full px-4 py-3 text-base rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-medium text-slate-800 placeholder-slate-400"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !searchInput.trim()}
            className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 min-w-[130px]"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Searching</span>
              </>
            ) : (
              <span>Search Token</span>
            )}
          </button>
        </form>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div
            className={`mt-4 p-4 rounded-lg border text-sm flex items-start gap-3 ${
              errorType === '403'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-red-50 border-red-300 text-red-900'
            }`}
          >
            <span className="text-xl">{errorType === '403' ? '🔒' : '⚠️'}</span>
            <div>
              <p className="font-bold">
                {errorType === '403' ? 'Security Restriction (403 Forbidden)' : 'Search Error'}
              </p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="mt-4 p-4 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-900 text-sm flex items-center gap-3">
            <span className="text-xl">✅</span>
            <p className="font-bold">{successMessage}</p>
          </div>
        )}
      </div>

      {/* Main Token Details & Timeline Section */}
      {tokenData && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Card Header with Farmer Summary */}
          <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">
                Farmer Token Profile
              </span>
              <div className="flex items-center gap-3 mt-1">
                <h2 className="text-2xl font-black text-slate-800">
                  #{tokenData.tokenId}
                </h2>
                <span className="px-3 py-0.5 text-xs font-extrabold rounded-full bg-emerald-100 text-emerald-800">
                  {tokenData.centerCode}
                </span>
              </div>
              <p className="text-sm text-slate-600 font-semibold mt-1">
                Farmer: <span className="text-slate-900 font-bold">{tokenData.farmerName}</span>
                {tokenData.crop && ` • Crop: ${tokenData.crop}`}
                {tokenData.quantityKg && ` (${tokenData.quantityKg} kg)`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleAdvance}
                disabled={advancing || tokenData.statusIndex >= STAGES.length - 1}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold rounded-lg shadow-sm transition-all flex items-center gap-2"
              >
                {advancing ? (
                  <span>Updating...</span>
                ) : tokenData.statusIndex >= STAGES.length - 1 ? (
                  <span>All Steps Completed 🎉</span>
                ) : (
                  <>
                    <span>Advance to Next Step</span>
                    <span className="text-lg">→</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 8-Step Visual Timeline */}
          <div className="p-6 md:p-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-8">
              8-Step Procurement Lifecycle
            </h3>

            {/* Stepper container */}
            <div className="relative">
              <div className="space-y-6">
                {STAGES.map((stage, idx) => {
                  const isCompleted = idx < tokenData.statusIndex;
                  const isCurrent = idx === tokenData.statusIndex;
                  const isUpcoming = idx > tokenData.statusIndex;

                  return (
                    <div key={stage.id} className="relative flex items-start gap-4">
                      {/* Vertical line connecting nodes */}
                      {idx !== STAGES.length - 1 && (
                        <div
                          className={`absolute left-5 top-10 w-0.5 h-12 -ml-px ${
                            idx < tokenData.statusIndex ? 'bg-emerald-600' : 'bg-slate-200'
                          }`}
                        />
                      )}

                      {/* Circle node indicator */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm z-10 transition-all ${
                          isCompleted
                            ? 'bg-emerald-600 text-white ring-4 ring-emerald-50'
                            : isCurrent
                            ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 shadow-md animate-pulse'
                            : 'bg-slate-100 text-slate-400 border border-slate-300'
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          idx
                        )}
                      </div>

                      {/* Text info for step */}
                      <div className="pt-1.5 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4
                              className={`text-sm font-black tracking-wide ${
                                isCurrent
                                  ? 'text-emerald-800'
                                  : isCompleted
                                  ? 'text-slate-800'
                                  : 'text-slate-400'
                              }`}
                            >
                              {stage.label}
                            </h4>

                            {isCurrent && (
                              <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded bg-emerald-100 text-emerald-700 tracking-wider">
                                Current Active Step
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{stage.desc}</p>
                        </div>

                        <div className="text-right">
                          <span
                            className={`text-xs font-bold uppercase tracking-wider ${
                              isCompleted
                                ? 'text-emerald-600'
                                : isCurrent
                                ? 'text-emerald-700'
                                : 'text-slate-300'
                            }`}
                          >
                            {isCompleted ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
