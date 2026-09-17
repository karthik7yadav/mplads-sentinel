import React, { useEffect, useRef, useState, useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  STATE_NATIONAL_METRICS,
  type StateMetrics,
  NATIONAL_SUMMARY,
} from '../../data/realData'
import {
  MapPin,
  Search,
  SlidersHorizontal,
  Table,
  RotateCcw,
  ExternalLink,
  Building,
  X,
} from 'lucide-react'

// Legitimate geographic centroid coordinates for all 34 monitored Indian States & UTs
const STATE_COORDINATES: Record<string, [number, number]> = {
  'Uttar Pradesh': [26.4741, 80.1141],
  'Bihar': [25.7861, 85.5404],
  'Gujarat': [22.4192, 71.9506],
  'Madhya Pradesh': [24.0623, 78.2199],
  'Tamil Nadu': [11.2307, 78.3596],
  'West Bengal': [23.6031, 88.2905],
  'Odisha': [20.2555, 83.9181],
  'Punjab': [30.8829, 75.5589],
  'Telangana': [17.7733, 79.0406],
  'Andhra Pradesh': [15.8664, 80.042],
  'Rajasthan': [25.8871, 75.2329],
  'Karnataka': [14.9971, 76.5658],
  'Jharkhand': [23.6587, 85.7824],
  'Chhattisgarh': [21.1669, 82.0034],
  'Maharashtra': [19.4038, 76.4287],
  'Kerala': [10.8151, 76.3775],
  'Assam': [26.1067, 92.7125],
  'Haryana': [29.1572, 76.3453],
  'Himachal Pradesh': [31.8424, 77.3733],
  'Jammu & Kashmir': [33.5932, 74.9728],
  'Uttarakhand': [30.1423, 79.1589],
  'Meghalaya': [25.5782, 91.3978],
  'Delhi': [28.6397, 77.098],
  'Arunachal Pradesh': [27.8811, 94.8951],
  'Mizoram': [23.2286, 92.8585],
  'Goa': [15.3645, 74.0475],
  'Nagaland': [26.0225, 94.3634],
  'Tripura': [23.7337, 91.7592],
  'Manipur': [24.7511, 93.8239],
  'Sikkim': [27.5792, 88.4869],
  'Chandigarh': [30.7295, 76.7883],
  'Puducherry': [12.2302, 79.7467],
  'Andaman & Nicobar': [11.0982, 92.9755],
  'Lakshadweep': [11.2093, 72.7711],
}

interface IndiaRiskMapProps {
  onSelectState?: (state: StateMetrics) => void
  selectedState?: string | null
  className?: string
}

type FilterLevel = 'all' | 'critical' | 'moderate' | 'standard'

export const IndiaRiskMap: React.FC<IndiaRiskMapProps> = ({
  onSelectState,
  selectedState,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all')
  const [showTable, setShowTable] = useState(false)

  const states = STATE_NATIONAL_METRICS

  // Filtered states for map markers and table
  const filteredStates = useMemo(() => {
    return states.filter((st) => {
      // Risk filter
      if (filterLevel === 'critical' && st.criticalWorks < 50) return false
      if (filterLevel === 'moderate' && (st.criticalWorks < 10 || st.criticalWorks >= 50)) return false
      if (filterLevel === 'standard' && st.criticalWorks >= 10) return false

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = st.state.toLowerCase().includes(q)
        const matchCode = st.code.toLowerCase().includes(q)
        if (!matchName && !matchCode) return false
      }

      return true
    })
  }, [states, filterLevel, searchQuery])

  // Helper to get marker styling based on Critical Works volume
  const getMarkerStyle = (criticalCount: number, isSelected: boolean) => {
    if (isSelected) {
      return {
        bgColor: '#1e3a8a', // Navy highlight for selected
        borderColor: '#ffffff',
        label: 'Selected State',
        category: 'selected',
      }
    }
    if (criticalCount >= 50) {
      return {
        bgColor: '#dc2626', // Crimson Red
        borderColor: '#ffffff',
        label: 'High Review Concentration',
        category: 'critical',
      }
    }
    if (criticalCount >= 10) {
      return {
        bgColor: '#d97706', // Amber
        borderColor: '#ffffff',
        label: 'Moderate Review Concentration',
        category: 'moderate',
      }
    }
    if (criticalCount >= 1) {
      return {
        bgColor: '#059669', // Emerald
        borderColor: '#ffffff',
        label: 'Standard Review Pace',
        category: 'standard',
      }
    }
    return {
      bgColor: '#64748b', // Slate
      borderColor: '#ffffff',
      label: 'Normal Baseline',
      category: 'baseline',
    }
  }

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return

    // Avoid duplicate initialization
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    // Centered on India with appropriate national bounds
    const map = L.map(mapContainerRef.current, {
      center: [22.5, 79.5],
      zoom: 4.6,
      minZoom: 4,
      maxZoom: 9,
      zoomControl: true,
      attributionControl: false,
      maxBounds: [
        [5.0, 64.0],
        [39.0, 100.0],
      ],
      maxBoundsViscosity: 0.8,
    })

    // Neutral, clean government-grade CartoDB Positron tiles (real map context)
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      {
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(map)

    // Layer group for markers
    const markersGroup = L.layerGroup().addTo(map)
    markersLayerRef.current = markersGroup

    // Load subtle geographic state boundaries from public GeoJSON without any risk fill
    fetch('/india_states.geojson')
      .then((res) => (res.ok ? res.json() : null))
      .then((geoData) => {
        if (geoData && mapInstanceRef.current) {
          if (geojsonLayerRef.current) {
            geojsonLayerRef.current.remove()
          }
          const geoLayer = L.geoJSON(geoData, {
            style: {
              color: '#94a3b8',
              weight: 1,
              opacity: 0.45,
              fillColor: 'transparent',
              fillOpacity: 0,
            },
          }).addTo(map)
          geojsonLayerRef.current = geoLayer
        }
      })
      .catch(() => {
        // Subtle boundaries optional; tiles already show state names and borders
      })

    mapInstanceRef.current = map

    // Fix potential container layout sizing in dynamic grid
    setTimeout(() => {
      map.invalidateSize()
    }, 200)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Render location markers whenever filteredStates or selectedState changes
  useEffect(() => {
    const map = mapInstanceRef.current
    const markersGroup = markersLayerRef.current
    if (!map || !markersGroup) return

    markersGroup.clearLayers()

    filteredStates.forEach((st) => {
      const coords = STATE_COORDINATES[st.state]
      if (!coords) return

      const isSelected = !!selectedState && (
        selectedState.toLowerCase() === st.state.toLowerCase() ||
        selectedState.toLowerCase() === st.code.toLowerCase()
      )

      const style = getMarkerStyle(st.criticalWorks, isSelected)

      // Modern location pin badge with Critical Works count
      const isHighPriority = st.criticalWorks >= 50
      const pulseHtml = isHighPriority
        ? `<span class="absolute -inset-1 rounded-full bg-rose-500/35 animate-ping"></span>`
        : ''

      const iconHtml = `
        <div class="relative flex flex-col items-center cursor-pointer group" style="transform: translate(-50%, -100%);">
          ${pulseHtml}
          <div style="background-color: ${style.bgColor}; border-color: ${style.borderColor};" 
               class="relative flex items-center justify-center min-w-[28px] h-7 px-1.5 rounded-full shadow-md border-2 transition-transform duration-150 group-hover:scale-115">
            <span class="text-[11px] font-mono font-bold text-white leading-none">${st.criticalWorks}</span>
          </div>
          <div style="background-color: ${style.bgColor}; border-color: ${style.borderColor};" 
               class="w-2 h-2 rotate-45 -mt-1 border-r border-b"></div>
          <span class="mt-0.5 text-[9px] font-mono font-bold text-slate-800 bg-white/90 px-1 py-0.2 rounded shadow-2xs border border-slate-200 pointer-events-none whitespace-nowrap">
            ${st.code}
          </span>
        </div>
      `

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-state-pin',
        iconSize: [28, 38],
        iconAnchor: [14, 38],
      })

      const marker = L.marker(coords, { icon: customIcon })

      // Interactive Popup with real available data only
      const priorityLabel = isHighPriority
        ? 'HIGH REVIEW VOLUME'
        : st.criticalWorks >= 10
        ? 'MODERATE REVIEW'
        : 'STANDARD PACE'

      const badgeBg = isHighPriority
        ? 'bg-rose-50 text-rose-800 border-rose-200'
        : st.criticalWorks >= 10
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : 'bg-emerald-50 text-emerald-800 border-emerald-200'

      const popupHtml = `
        <div style="min-width: 230px; font-family: inherit;" class="p-1">
          <div class="flex items-start justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
            <div>
              <div class="font-bold text-sm text-slate-900 leading-tight">${st.state}</div>
              <span class="text-[10px] font-mono text-slate-400 uppercase">${st.code} &bull; State Monitoring Location</span>
            </div>
            <span class="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${badgeBg}">${priorityLabel}</span>
          </div>
          <div class="space-y-1.5 text-xs font-mono">
            <div class="flex justify-between items-center text-rose-700 bg-rose-50/70 px-2 py-1 rounded">
              <span class="font-sans font-semibold">Critical Works:</span>
              <strong class="font-bold text-sm">${st.criticalWorks}</strong>
            </div>
            <div class="flex justify-between items-center text-amber-800 px-2 py-0.5">
              <span class="font-sans">High-Risk Works:</span>
              <strong class="font-bold">${st.highRiskWorks}</strong>
            </div>
            <div class="flex justify-between items-center text-slate-600 px-2 py-0.5">
              <span class="font-sans">Active Execution:</span>
              <span>${st.activeWorks.toLocaleString('en-IN')}</span>
            </div>
            <div class="flex justify-between items-center text-slate-900 border-t border-slate-100 pt-1 px-2 font-sans font-semibold">
              <span>Total Works:</span>
              <strong class="font-mono text-xs">${st.totalWorks.toLocaleString('en-IN')}</strong>
            </div>
            <div class="flex justify-between items-center text-slate-500 px-2 text-[11px]">
              <span class="font-sans">Total Project Outlay:</span>
              <span>₹${st.sanctionedCrores} Cr</span>
            </div>
          </div>
          <div class="mt-3 pt-2 border-t border-slate-100">
            <button id="btn-select-${st.code}" 
                    style="background-color: #1e3a8a;"
                    class="w-full text-center py-1.5 px-3 hover:opacity-90 text-white rounded text-xs font-semibold font-sans transition-opacity shadow-2xs cursor-pointer">
              View State Monitoring &rarr;
            </button>
          </div>
          <div class="mt-1 text-[9px] text-slate-400 text-center font-sans">
            State-level monitoring center (actual GPS coordinates)
          </div>
        </div>
      `

      marker.bindPopup(popupHtml, {
        closeButton: true,
        className: 'custom-leaflet-popup',
        maxWidth: 280,
      })

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-select-${st.code}`)
        if (btn && onSelectState) {
          btn.onclick = () => {
            onSelectState(st)
          }
        }
      })

      markersGroup.addLayer(marker)

      // Auto-open popup if state is selected
      if (isSelected) {
        setTimeout(() => {
          marker.openPopup()
          map.setView(coords, 6, { animate: true })
        }, 300)
      }
    })
  }, [filteredStates, selectedState, onSelectState])

  // Reset View handler
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([22.5, 79.5], 4.6, { animate: true })
    }
    setSearchQuery('')
    setFilterLevel('all')
  }

  // Handle click on state row in accessible table
  const handleStateRowClick = (st: StateMetrics) => {
    const coords = STATE_COORDINATES[st.state]
    setShowTable(false)
    setTimeout(() => {
      if (coords && mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize()
        mapInstanceRef.current.setView(coords, 6, { animate: true })
      }
    }, 150)
    if (onSelectState) {
      onSelectState(st)
    }
  }

  return (
    <div className={`rounded-xl border border-slate-200/90 bg-white p-5 shadow-2xs ${className}`}>
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <MapPin size={16} className="text-blue-600" />
              Project Locations &amp; Risk Monitoring
            </h3>
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Interactive Map
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Geographic state monitoring locations representing all {NATIONAL_SUMMARY.totalWorks.toLocaleString('en-IN')} real works.
            Markers display Critical Works review priority count.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => {
              setShowTable(false)
              setTimeout(() => {
                mapInstanceRef.current?.invalidateSize()
              }, 100)
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
              !showTable
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin size={13} />
            Map View
          </button>
          <button
            type="button"
            onClick={() => setShowTable(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-colors cursor-pointer ${
              showTable
                ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table size={13} />
            Data Table
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 pt-1 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search state or code (e.g. Rajasthan, UP)..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:ring-1 focus:ring-blue-600 focus:bg-white text-slate-900 placeholder:text-slate-400"
            />
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 text-[11px] font-mono">
          <span className="text-slate-400 font-sans mr-1 flex items-center gap-1">
            <SlidersHorizontal size={11} /> Filter:
          </span>
          <button
            type="button"
            onClick={() => setFilterLevel('all')}
            className={`px-2 py-1 rounded cursor-pointer transition-colors ${
              filterLevel === 'all'
                ? 'bg-slate-900 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({states.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterLevel('critical')}
            className={`px-2 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 ${
              filterLevel === 'critical'
                ? 'bg-rose-700 text-white font-bold'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            High Review (&ge;50)
          </button>
          <button
            type="button"
            onClick={() => setFilterLevel('moderate')}
            className={`px-2 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 ${
              filterLevel === 'moderate'
                ? 'bg-amber-700 text-white font-bold'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Moderate (10–49)
          </button>
          <button
            type="button"
            onClick={() => setFilterLevel('standard')}
            className={`px-2 py-1 rounded cursor-pointer transition-colors ${
              filterLevel === 'standard'
                ? 'bg-slate-700 text-white font-bold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Standard (&lt;10)
          </button>
          <button
            type="button"
            onClick={handleResetView}
            title="Reset to Pan-India view"
            className="p-1 text-slate-500 hover:text-slate-800 ml-1 rounded hover:bg-slate-100 cursor-pointer"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      </div>

      {/* Selected State Banner */}
      {selectedState && (
        <div className="mt-2.5 p-2.5 rounded-md bg-blue-50/90 border border-blue-200 flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <Building size={14} className="text-blue-700 shrink-0" />
            <span>
              Selected State: <strong className="font-bold">{selectedState}</strong> — Map centered on monitoring location.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSelectState && onSelectState({} as StateMetrics)}
            className="flex items-center gap-1 text-[11px] font-medium text-blue-700 hover:text-blue-900 bg-white px-2 py-0.5 rounded border border-blue-200 shadow-2xs cursor-pointer"
          >
            <X size={11} /> Clear Selection
          </button>
        </div>
      )}

      {/* Primary Map Canvas Container */}
      <div className={`mt-3 relative rounded-lg border border-slate-200 overflow-hidden ${showTable ? 'hidden' : 'block'}`}>
        <div
          ref={mapContainerRef}
          style={{ height: '450px', width: '100%', zIndex: 1 }}
          className="bg-slate-100"
        />

        {/* Legend Overlay on Map */}
        <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs p-2.5 rounded-md shadow-md border border-slate-200 text-xs z-10 space-y-1.5 font-sans pointer-events-auto">
          <span className="text-[10px] font-bold uppercase font-mono text-slate-700 block">
            Marker Review Priority
          </span>
          <div className="space-y-1 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#dc2626] border border-white shrink-0" />
              <span className="text-slate-700">&ge; 50 Critical Works</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#d97706] border border-white shrink-0" />
              <span className="text-slate-700">10–49 Critical Works</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#059669] border border-white shrink-0" />
              <span className="text-slate-700">1–9 Critical Works</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#64748b] border border-white shrink-0" />
              <span className="text-slate-700">0 Critical Works</span>
            </div>
          </div>
          <div className="pt-1 border-t border-slate-100 text-[9px] text-slate-400 font-mono">
            Pin numbers = Critical Works
          </div>
        </div>

        {/* Data Attribution Badge */}
        <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-0.5 rounded text-[9px] font-mono text-slate-500 border border-slate-200 z-10">
          State-Level Aggregated Records &bull; CartoDB Positron
        </div>
      </div>

      {/* Accessible Alternative: State Table */}
      {showTable && (
        <div className="mt-3 pt-2 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase font-mono flex items-center gap-1.5">
              <Table size={13} className="text-blue-600" />
              State Monitoring Records (Accessible Alternative)
            </h4>
            <span className="text-[11px] font-mono text-slate-400">
              Showing {filteredStates.length} of {states.length} states
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-60 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold z-10">
                <tr>
                  <th className="p-2.5">State</th>
                  <th className="p-2.5 text-right text-rose-700">Critical Works</th>
                  <th className="p-2.5 text-right text-amber-700">High-Risk Works</th>
                  <th className="p-2.5 text-right">Total Works</th>
                  <th className="p-2.5 text-right">Review Priority</th>
                  <th className="p-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredStates.map((st) => {
                  const isSelected = selectedState?.toLowerCase() === st.state.toLowerCase()
                  return (
                    <tr
                      key={st.code}
                      onClick={() => handleStateRowClick(st)}
                      className={`hover:bg-blue-50/40 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50/80 font-bold' : ''
                      }`}
                    >
                      <td className="p-2.5 font-sans font-medium text-slate-900 flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                          {st.code}
                        </span>
                        {st.state}
                      </td>
                      <td className="p-2.5 text-right font-bold text-rose-700 bg-rose-50/30">
                        {st.criticalWorks}
                      </td>
                      <td className="p-2.5 text-right font-semibold text-amber-700">
                        {st.highRiskWorks}
                      </td>
                      <td className="p-2.5 text-right font-semibold text-slate-800">
                        {st.totalWorks.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 text-right font-sans">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                            st.criticalWorks >= 50
                              ? 'bg-rose-100 text-rose-800'
                              : st.criticalWorks >= 10
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {st.criticalWorks >= 50 ? 'High Review' : st.criticalWorks >= 10 ? 'Moderate' : 'Standard'}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStateRowClick(st)
                          }}
                          className="px-2 py-0.5 text-[11px] font-sans font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          View <ExternalLink size={10} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
