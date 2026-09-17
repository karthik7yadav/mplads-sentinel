import React, { useState, useEffect, useMemo } from 'react'
import type { AiWorkSuggestion } from '../../types'
import { useAuth } from '../../context/AuthContext'
import { useProjectData } from '../../context/ProjectDataContext'
import { X, Send, AlertCircle, MapPin } from 'lucide-react'

interface DraftRecommendationModalProps {
  suggestion: AiWorkSuggestion | null
  isOpen: boolean
  onClose: () => void
}

export const DraftRecommendationModal: React.FC<DraftRecommendationModalProps> = ({
  suggestion,
  isOpen,
  onClose,
}) => {
  const { currentUser } = useAuth()
  const { citizenNeeds, submitMpRecommendation } = useProjectData()

  // Compute default location from suggestion's linked need or constituency default
  const getDefaultLocation = (sug: AiWorkSuggestion | null): string => {
    if (sug) {
      const matchedNeed = citizenNeeds.find((n) => n.id === sug.needId)
      if (matchedNeed && matchedNeed.location) {
        return matchedNeed.location
      }
    }
    return `${currentUser.constituency || 'Rajsamand'}, ${currentUser.state || 'Rajasthan'}`
  }

  const [projectName, setProjectName] = useState(suggestion ? suggestion.suggestedTitle : '')
  const [location, setLocation] = useState(() => getDefaultLocation(suggestion))
  const [estimatedLakhs, setEstimatedLakhs] = useState(
    suggestion ? suggestion.peerMedianLakhs : 25.0,
  )
  const [beneficiaries, setBeneficiaries] = useState(3500)
  const [justification, setJustification] = useState(
    suggestion ? suggestion.rationale : 'Public amenity project based on resident representation.',
  )

  // Sync when suggestion or active MP changes
  useEffect(() => {
    if (suggestion) {
      setProjectName(suggestion.suggestedTitle)
      setEstimatedLakhs(suggestion.peerMedianLakhs)
      setJustification(suggestion.rationale)
      setLocation(getDefaultLocation(suggestion))
    } else {
      setLocation(`${currentUser.constituency || 'Rajsamand'}, ${currentUser.state || 'Rajasthan'}`)
    }
  }, [suggestion, currentUser])

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Constituency Validation: Location must belong to the active MP's constituency / state
  const isLocationValid = useMemo(() => {
    if (!location || !location.trim()) return false
    const locLower = location.toLowerCase().trim()
    const activeConstLower = (currentUser.constituency || '').toLowerCase().trim()
    const activeStateLower = (currentUser.state || '').toLowerCase().trim()

    // Unrelated states and jurisdictions from demo data that are explicitly outside the active MP's scope
    const unrelatedScopes = [
      'surat', 'gujarat',
      'ludhiana', 'punjab',
      'nashik', 'maharashtra',
      'jaunpur', 'uttar pradesh',
      'howrah', 'west bengal',
      'hyderabad', 'telangana',
      'amravati', 'virudhunagar', 'arakkonam', 'erode', 'warangal', 'guna', 'mandsour',
    ].filter((s) => s !== activeConstLower && s !== activeStateLower)

    const hasUnrelated = unrelatedScopes.some((u) => locLower.includes(u))
    if (hasUnrelated) return false

    return true
  }, [location, currentUser])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLocationValid) return

    submitMpRecommendation({
      projectName: projectName.trim(),
      location: location.trim(),
      constituency: currentUser.constituency || 'RAJSAMAND',
      state: currentUser.state || 'Rajasthan',
      estimatedLakhs: Number(estimatedLakhs),
      category: suggestion?.category || 'Civic Amenities',
      status: 'Submitted',
      justification: justification.trim(),
      beneficiaryCount: Number(beneficiaries),
    })
    onClose()
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 font-semibold">
              Constituency Development Proposal • {currentUser.constituency}
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-1">
              Prepare MP Recommendation Order
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Authorized by: {currentUser.displayName} • {currentUser.constituency} Constituency ({currentUser.state})
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 text-xs">
          {/* Section 1 — Work Details */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              <span>Section 1</span>
              <span>•</span>
              <span>Recommended Work</span>
            </div>
            <label className="block text-xs font-semibold text-slate-700">
              Work Name / Title
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              required
              placeholder="e.g., Construction of Community Hall or Solar Water Facility"
              className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-medium text-slate-900 outline-none transition-all"
            />
          </div>

          {/* Section 2 — Location & Estimate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              <div className="flex items-center gap-1.5">
                <span>Section 2</span>
                <span>•</span>
                <span>Location & Fiscal Estimate</span>
              </div>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {currentUser.constituency} Scope
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Location & Ward / Area
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                    placeholder={`e.g., Sector 2, ${currentUser.constituency}`}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 outline-none transition-all font-medium ${
                      isLocationValid
                        ? 'border-slate-200 focus:ring-blue-600 focus:border-blue-600 text-slate-900'
                        : 'border-rose-300 bg-rose-50/40 focus:ring-rose-500 focus:border-rose-500 text-rose-900'
                    }`}
                  />
                  <MapPin size={14} className="absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
                {!isLocationValid && (
                  <div className="mt-1.5 p-2 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-1.5 font-medium">
                    <AlertCircle size={13} className="shrink-0 text-rose-600" />
                    <span>Location must belong to the active constituency ({currentUser.constituency}, {currentUser.state}).</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estimated Outlay (₹ Lakhs)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={estimatedLakhs}
                  onChange={(e) => setEstimatedLakhs(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono text-slate-900 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 3 — Public Need & Justification */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              <span>Section 3</span>
              <span>•</span>
              <span>Public Need & Beneficiaries</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estimated Beneficiary Count
              </label>
              <input
                type="number"
                min="1"
                value={beneficiaries}
                onChange={(e) => setBeneficiaries(Number(e.target.value))}
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono text-slate-900 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Public Need & Developmental Justification
              </label>
              <textarea
                rows={3}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                required
                placeholder="Detail community demand, lack of existing facilities, or urgent public welfare rationale..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-slate-800 leading-relaxed outline-none transition-all"
              />
            </div>
          </div>

          {/* Section 4 — Authority Confirmation */}
          <div className="p-3.5 bg-blue-50/70 rounded-lg border border-blue-200/80 text-slate-700 text-xs leading-relaxed">
            <strong className="text-blue-950 font-bold block mb-1">
              Section 4 • Statutory MP Authority Confirmation (Demonstration Workflow)
            </strong>
            The Member of Parliament exercises statutory discretion to recommend eligible works in {currentUser.constituency} Constituency. The District Authority ({currentUser.state}) shall verify technical estimates and sanction execution in accordance with MPLADS guidelines.
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer transition-colors active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isLocationValid || !projectName.trim()}
              className={`px-4.5 py-2 rounded-lg font-semibold shadow-2xs inline-flex items-center gap-2 transition-all ${
                isLocationValid && projectName.trim()
                  ? 'bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white cursor-pointer active:scale-[0.98]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              }`}
            >
              <Send size={14} />
              Submit Recommendation to District
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
