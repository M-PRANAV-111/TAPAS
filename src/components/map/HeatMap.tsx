'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, {
  type Map as MapLibreMap,
  type StyleSpecification,
  type GeoJSONSource,
  type MapLayerMouseEvent,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { ThermalLayer } from '@/components/map/ThermalLayer'
import { WardLayer, bboxOf } from '@/components/map/WardLayer'
import { RISK_COLORS } from '@/lib/constants'
import { locationKey, type SelectedLocation } from '@/lib/location'
import type { SafetyResource } from '@/lib/resources'
import type { WardCollection, WardRisk } from '@/lib/types'
import { cn } from '@/lib/utils'

const EMPTY: WardCollection = { type: 'FeatureCollection', features: [] }

const BASE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    dark_base: {
      type: 'raster',
      tiles: [
        process.env.NEXT_PUBLIC_MAP_TILE_URL ||
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 16,
      attribution:
        '&copy; <a href="https://www.esri.com/">Esri</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
    dark_labels: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 16,
    },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#100C09' } },
    { id: 'dark_base', type: 'raster', source: 'dark_base' },
    { id: 'dark_labels', type: 'raster', source: 'dark_labels' },
  ],
}

export interface HeatMapProps {
  geojson?: WardCollection
  wards: WardRisk[]
  selectedWardId: string | null
  onWardSelect: (id: string) => void
  location: SelectedLocation | null
  resources?: SafetyResource[]
  selectedResourceId?: string | null
  onResourceSelect?: (resource: SafetyResource) => void
  className?: string
  selectedDate: string
}

export default function HeatMap({
  geojson,
  wards,
  selectedWardId,
  onWardSelect,
  location,
  resources = [],
  selectedResourceId,
  onResourceSelect,
  className,
  selectedDate,
}: HeatMapProps) {
  const container = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<MapLibreMap | null>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [riskVisible, setRiskVisible] = useState(true)
  const [resourcesVisible, setResourcesVisible] = useState(true)

  const risks = useMemo(() => new Map(wards.map((w) => [w.ward_id, w])), [wards])
  const key = locationKey(location)

  // Top 5 hottest wards for the floating ranking overlay
  const hottestWards = useMemo(() => {
    return [...wards]
      .filter((w) => w.risk_level !== null)
      .sort((a, b) => (b.risk_level ?? 0) - (a.risk_level ?? 0) || (b.utci_max ?? 0) - (a.utci_max ?? 0))
      .slice(0, 5)
  }, [wards])

  // Initialize MapLibre
  useEffect(() => {
    if (!container.current || instanceRef.current) return
    let instance: MapLibreMap
    try {
      instance = new maplibregl.Map({
        container: container.current,
        style: BASE_STYLE,
        center: [78.9629, 21.5937], // Tight center on India
        zoom: 4.2,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      })
    } catch {
      setError('Interactive map unavailable on this device. Use accessible list views.')
      return
    }

    instanceRef.current = instance
    instance.touchZoomRotate.disableRotation()
    instance.keyboard.disableRotation()
    instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    instance.once('style.load', () => setMap(instance))
    instance.on('error', (event) => {
      if (event.error.message.includes('WebGL')) {
        setError('Map rendering failed. Accessible data lists remain available.')
      }
    })

    const observer = new ResizeObserver(() => instance.resize())
    observer.observe(container.current)

    return () => {
      observer.disconnect()
      instance.remove()
      instanceRef.current = null
    }
  }, [])

  // Handle location update
  useEffect(() => {
    if (!map) return
    if (!location) {
      map.flyTo({ center: [78.9629, 21.5937], zoom: 4.2, duration: 1200 })
      return
    }

    const marker = new maplibregl.Marker({ color: '#EA762B' })
      .setLngLat([location.longitude, location.latitude])
      .addTo(map)

    marker.getElement().setAttribute('aria-label', `Selected location: ${location.name}`)

    if (location.bounds) {
      map.fitBounds(location.bounds, { padding: 40, maxZoom: 10, duration: 800 })
    } else {
      map.flyTo({ center: [location.longitude, location.latitude], zoom: 10.5, duration: 800 })
    }

    return () => {
      marker.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key])

  // Fit to selected ward polygon
  useEffect(() => {
    if (!map || !geojson || !selectedWardId) return
    const f = geojson.features.find((feat) => feat.properties.ward_id === selectedWardId)
    const bounds = f ? bboxOf([f]) : null
    if (bounds) {
      map.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 800 })
    }
  }, [map, geojson, selectedWardId])

  // Resource / POI Layer
  useEffect(() => {
    if (!map) return
    if (!map.getSource('help')) {
      map.addSource('help', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 13,
        clusterRadius: 35,
      })
      map.addLayer({
        id: 'help-clusters',
        type: 'circle',
        source: 'help',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#EA762B',
          'circle-radius': 16,
          'circle-stroke-color': '#0B0907',
          'circle-stroke-width': 2,
        },
      })
      map.addLayer({
        id: 'help-points',
        type: 'circle',
        source: 'help',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match',
            ['get', 'category'],
            'cooling',
            '#F6C453',
            'water',
            '#EA762B',
            'medical',
            '#D3443F',
            '#C9AE8D',
          ],
          'circle-radius': ['case', ['==', ['get', 'id'], selectedResourceId ?? ''], 10, 6.5],
          'circle-stroke-color': '#0B0907',
          'circle-stroke-width': 1.5,
        },
      })
    }

    const source = map.getSource('help') as GeoJSONSource
    source.setData({
      type: 'FeatureCollection',
      features: (resourcesVisible ? resources : []).map((r) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r.longitude, r.latitude] },
        properties: { id: r.id, category: r.category, name: r.name },
      })),
    })

    map.setPaintProperty('help-points', 'circle-radius', [
      'case',
      ['==', ['get', 'id'], selectedResourceId ?? ''],
      10,
      6.5,
    ])
  }, [map, resources, resourcesVisible, selectedResourceId])

  // Click & popup handlers
  useEffect(() => {
    if (!map) return
    const click = (event: MapLayerMouseEvent) => {
      const resource = resources.find((r) => r.id === event.features?.[0]?.properties?.id)
      if (resource) onResourceSelect?.(resource)
    }

    const cluster = (event: MapLayerMouseEvent) => {
      const f = event.features?.[0]
      if (!f || f.geometry.type !== 'Point') return
      const center = f.geometry.coordinates as [number, number]
      void (map.getSource('help') as GeoJSONSource)
        .getClusterExpansionZoom(Number(f.properties?.cluster_id))
        .then((zoom) => {
          if (instanceRef.current === map) map.easeTo({ center, zoom, duration: 400 })
        })
        .catch(() => {})
    }

    map.on('click', 'help-points', click)
    map.on('click', 'help-clusters', cluster)
    return () => {
      map.off('click', 'help-points', click)
      map.off('click', 'help-clusters', cluster)
    }
  }, [map, resources, onResourceSelect])

  // Fly to selected resource
  useEffect(() => {
    const resource = resources.find((r) => r.id === selectedResourceId)
    if (!map || !resource || !resourcesVisible) return
    map.flyTo({ center: [resource.longitude, resource.latitude], zoom: 15, duration: 600 })
    const content = document.createElement('div')
    content.textContent = `${resource.name} · ${resource.category}`
    content.className = 'text-xs font-semibold'
    const popup = new maplibregl.Popup({ offset: 10 })
      .setLngLat([resource.longitude, resource.latitude])
      .setDOMContent(content)
      .addTo(map)
    return () => {
      popup.remove()
    }
  }, [map, resources, selectedResourceId, resourcesVisible])

  return (
    <div
      id="heat-map"
      data-testid="heat-map"
      className={cn(
        'relative flex h-full w-full min-h-[620px] flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-base)] shadow-2xl',
        className
      )}
    >
      <div className="relative min-h-0 flex-1">
        <div ref={container} className="h-full w-full" aria-label={`Heat Risk Map for ${location?.name ?? 'India'}`} />

        {/* OVERLAY PANEL 1: Top-Left Layer Selector */}
        <div className="absolute left-3 top-3 z-10 max-w-[280px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/95 p-3 text-xs shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 mb-2">
            <span className="font-bold text-[var(--text-primary)] truncate">
              {location?.name ?? 'India National Overview'}
            </span>
          </div>

          <div className="space-y-1.5 text-[11px] text-[var(--text-secondary)]">
            <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={riskVisible}
                onChange={(e) => setRiskVisible(e.target.checked)}
                className="accent-[var(--accent)] rounded"
              />
              <span>Ward Risk Choropleth</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer hover:text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={resourcesVisible}
                onChange={(e) => setResourcesVisible(e.target.checked)}
                className="accent-[var(--accent)] rounded"
              />
              <span>Cooling &amp; Health Resources ({resources.length})</span>
            </label>
          </div>
        </div>

        {/* OVERLAY PANEL 2: Top-Right Hottest Wards Ranking */}
        {hottestWards.length > 0 && (
          <div className="absolute right-3 top-3 z-10 hidden sm:block max-w-[260px] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/95 p-3 text-xs shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-1.5 mb-2">
              <span className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)]">
                Highest Risk Wards
              </span>
              <span className="text-[10px] font-mono text-[var(--accent)]">Today</span>
            </div>

            <ol className="space-y-1.5">
              {hottestWards.map((w, i) => {
                const isSelected = w.ward_id === selectedWardId
                const color = w.risk_level ? RISK_COLORS[w.risk_level] : 'var(--text-muted)'
                return (
                  <li key={w.ward_id}>
                    <button
                      type="button"
                      onClick={() => onWardSelect(w.ward_id)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left transition-colors',
                        isSelected
                          ? 'bg-[var(--accent)] text-[var(--bg-base)] font-bold'
                          : 'hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      )}
                    >
                      <span className="truncate text-[11px]">
                        {i + 1}. {w.ward_name}
                      </span>
                      <span
                        className="rounded px-1.5 py-0.2 text-[9px] font-black shrink-0"
                        style={{
                          backgroundColor: isSelected ? '#141009' : `${color}30`,
                          color: isSelected ? '#F6E7CF' : color,
                          border: `1px solid ${color}80`,
                        }}
                      >
                        L{w.risk_level ?? '?'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
        )}

        {/* OVERLAY PANEL 3: Bottom-Left Legend */}
        <div className="absolute left-3 bottom-4 z-10 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]/95 px-3 py-2 text-[10.5px] shadow-xl backdrop-blur-md">
          <span className="block font-bold uppercase tracking-wider text-[9px] text-[var(--text-muted)] mb-1.5">
            Heat Risk Scale
          </span>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((lvl) => {
              const col = RISK_COLORS[lvl as 1 | 2 | 3 | 4 | 5]
              return (
                <div key={lvl} className="flex items-center gap-1">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: col }}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                    L{lvl}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {error && (
          <p role="status" className="absolute inset-x-4 bottom-16 rounded-xl border border-[var(--risk-4)] bg-[var(--bg-primary)] p-3 text-xs text-[var(--risk-4)]">
            {error}
          </p>
        )}
      </div>

      <ThermalLayer map={map} date={selectedDate} />
      {map ? (
        <WardLayer
          map={map}
          geojson={riskVisible ? geojson ?? EMPTY : EMPTY}
          risks={risks}
          selectedWardId={selectedWardId}
          onWardSelect={onWardSelect}
        />
      ) : null}
    </div>
  )
}
