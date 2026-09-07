'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import maplibregl, {
  type Map as MapLibreMap,
  type StyleSpecification,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

import { WardLayer, bboxOf } from '@/components/map/WardLayer'
import { RISK_LABELS } from '@/lib/constants'
import type { WardCollection, WardRisk } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * Raster OSM. No key, no billing, no quota to explain to a municipal IT
 * department. Swap the URL here for a self-hosted tile server on deployment.
 */
const BASE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
}

const FIT_PADDING = 40

export interface HeatMapProps {
  geojson: WardCollection | undefined
  /** Risk rows for the selected day. */
  wards: WardRisk[]
  selectedWardId: string | null
  onWardSelect: (wardId: string) => void
  /** Offline with nothing cached — the map greys out instead of lying. */
  unavailable?: boolean
  className?: string
}

export default function HeatMap({
  geojson,
  wards,
  selectedWardId,
  onWardSelect,
  unavailable = false,
  className,
}: HeatMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const hasFitRef = useRef(false)

  // Read inside callbacks that must not re-subscribe when the data changes.
  const geojsonRef = useRef(geojson)
  geojsonRef.current = geojson

  const risks = useMemo(
    () => new Map(wards.map((w) => [w.ward_id, w])),
    [wards],
  )

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    let instance: MapLibreMap
    try {
      instance = new maplibregl.Map({
        container: containerRef.current,
        style: BASE_STYLE,
        center: [78.4744, 17.428],
        zoom: 10.5,
        attributionControl: { compact: true },
        // Rotation is a liability on a phone held one-handed in the field.
        dragRotate: false,
        pitchWithRotate: false,
        touchZoomRotate: true,
      })
    } catch (error) {
      setRenderError(
        error instanceof Error ? error.message : 'Map could not be created',
      )
      return
    }

    instance.touchZoomRotate.disableRotation()
    instance.keyboard.disableRotation()
    instance.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      'top-right',
    )

    instance.on('error', (event) => {
      // Tile 404s are noisy but harmless; only surface fatal style errors.
      if (event?.error?.message?.includes('WebGL')) {
        setRenderError(event.error.message)
      }
    })

    const ready = () => setMap(instance)
    if (instance.isStyleLoaded()) ready()
    else instance.on('load', ready)

    mapRef.current = instance

    return () => {
      instance.remove()
      mapRef.current = null
      setMap(null)
    }
  }, [])

  // Fit to all wards the first time geometry arrives — but only once the
  // container actually has a size, or the fit resolves to a zoomed-out world.
  const fitAll = useCallback(() => {
    const element = containerRef.current
    const instance = mapRef.current
    const collection = geojsonRef.current
    if (!element || !instance || !collection) return false
    if (element.clientWidth < 40 || element.clientHeight < 40) return false

    const bounds = bboxOf(collection.features)
    if (!bounds) return false

    instance.fitBounds(bounds, { padding: FIT_PADDING, duration: 0 })
    instance.triggerRepaint()
    return true
  }, [])

  useEffect(() => {
    if (!map || !geojson || hasFitRef.current) return
    if (fitAll()) hasFitRef.current = true
  }, [map, geojson, fitAll])

  /**
   * MapLibre only watches the window, not its container, so a panel opening or
   * the grid reflowing would otherwise leave a stretched canvas behind.
   */
  useEffect(() => {
    const element = containerRef.current
    if (!map || !element) return

    const observer = new ResizeObserver(() => {
      map.resize()
      if (!hasFitRef.current && fitAll()) hasFitRef.current = true
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [map, fitAll])

  // Fly to a ward when it is selected from anywhere in the app.
  useEffect(() => {
    if (!map || !geojson || !selectedWardId) return
    const feature = geojson.features.find(
      (f) => f.properties.ward_id === selectedWardId,
    )
    if (!feature) return
    const bounds = bboxOf([feature])
    if (!bounds) return
    map.fitBounds(bounds, { padding: 120, maxZoom: 14, duration: 600 })
  }, [map, geojson, selectedWardId])

  return (
    <div
      data-testid="heat-map"
      className={cn(
        'relative h-full w-full overflow-hidden rounded-lg border border-border bg-white',
        className,
      )}
    >
      <div ref={containerRef} className="h-full w-full" />

      {/* Text mirror of the choropleth: keyboard and screen-reader users get
          the same information the colours carry. */}
      <ul className="sr-only" data-testid="ward-risk-list">
        {wards.map((ward) => (
          <li key={ward.ward_id} data-ward-id={ward.ward_id}>
            {ward.ward_name} — Level {ward.risk_level}{' '}
            {RISK_LABELS[ward.risk_level]}
          </li>
        ))}
      </ul>

      {unavailable ? (
        <div
          data-testid="map-unavailable"
          className="absolute inset-0 flex items-center justify-center bg-slate-200/80 p-6 text-center backdrop-blur-[1px]"
        >
          <p className="max-w-xs text-sm font-medium text-foreground">
            Cached data unavailable — connect to internet
          </p>
        </div>
      ) : null}

      {renderError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 p-6 text-center">
          <p className="max-w-sm text-sm tapas-subtext">
            The map could not be drawn on this device ({renderError}). Ward risk
            levels are still listed in the ranking panel.
          </p>
        </div>
      ) : null}

      {map && geojson ? (
        <WardLayer
          map={map}
          geojson={geojson}
          risks={risks}
          selectedWardId={selectedWardId}
          onWardSelect={onWardSelect}
        />
      ) : null}
    </div>
  )
}
