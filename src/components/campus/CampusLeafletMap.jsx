'use client'

import React from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_CENTER = [36.6159, -88.3227]
const DEFAULT_ZOOM = 15
const FOCUS_ZOOM = 17
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q='

function createMarkerIcon({ fill, stroke, centerFill, shadowColor }) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="52" viewBox="0 0 40 52" fill="none">
      <path d="M20 50C20 50 36 28.864 36 16C36 7.16344 28.8366 0 20 0C11.1634 0 4 7.16344 4 16C4 28.864 20 50 20 50Z" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>
      <circle cx="20" cy="16" r="6.5" fill="${centerFill}"/>
      <ellipse cx="20" cy="48" rx="10" ry="3.5" fill="${shadowColor}" />
    </svg>
  `

  return L.icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    iconSize: [40, 52],
    iconAnchor: [20, 50],
    popupAnchor: [0, -42],
  })
}

const defaultMarkerIcon = createMarkerIcon({
  fill: '#1d4ed8',
  stroke: '#ffffff',
  centerFill: '#eff6ff',
  shadowColor: 'rgba(15, 23, 42, 0.18)',
})

const selectedMarkerIcon = createMarkerIcon({
  fill: '#ea580c',
  stroke: '#fff7ed',
  centerFill: '#ffffff',
  shadowColor: 'rgba(234, 88, 12, 0.28)',
})

function parseCoordinateQuery(input) {
  const match = input?.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
  if (!match) return null

  const lat = Number(match[1])
  const lng = Number(match[2])

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  return { lat, lng }
}

function resolveStoredCoordinates(building) {
  if (Number.isFinite(building.latitude) && Number.isFinite(building.longitude)) {
    return {
      lat: Number(building.latitude),
      lng: Number(building.longitude),
    }
  }

  return parseCoordinateQuery(building.mapQuery)
}

async function geocodeQuery(query) {
  const response = await fetch(`${NOMINATIM_ENDPOINT}${encodeURIComponent(query)}`, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Geocoding failed')
  }

  const results = await response.json()
  const first = results?.[0]
  if (!first) return null

  const lat = Number(first.lat)
  const lng = Number(first.lon)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  return { lat, lng }
}

function MapViewportController({ focusRequestKey, focusTarget, markerRefs }) {
  const map = useMap()
  const handledFocusRequest = React.useRef(null)

  React.useEffect(() => {
    if (!focusRequestKey || !focusTarget) return
    if (handledFocusRequest.current === focusRequestKey) return

    handledFocusRequest.current = focusRequestKey
    map.flyTo([focusTarget.lat, focusTarget.lng], FOCUS_ZOOM, { duration: 0.6 })

    const timeoutId = window.setTimeout(() => {
      markerRefs.current[focusTarget.id]?.openPopup()
    }, 180)

    return () => window.clearTimeout(timeoutId)
  }, [focusRequestKey, focusTarget, map, markerRefs])

  return null
}

export default function CampusLeafletMap({
  buildings,
  selectedBuildingId,
  focusBuildingId = null,
  focusNonce = 0,
}) {
  const [coordinatesById, setCoordinatesById] = React.useState({})
  const markerRefs = React.useRef({})
  const attemptedGeocodeIdsRef = React.useRef(new Set())
  const priorityBuildingId = focusBuildingId ?? selectedBuildingId ?? null

  React.useEffect(() => {
    let isActive = true

    const unresolvedBuildings = buildings
      .filter((building) => {
        if (coordinatesById[building.id]) return false
        if (attemptedGeocodeIdsRef.current.has(building.id)) return false
        return !resolveStoredCoordinates(building)
      })
      .sort((left, right) => {
        const leftPriority = left.id === priorityBuildingId ? -1 : 0
        const rightPriority = right.id === priorityBuildingId ? -1 : 0
        return leftPriority - rightPriority
      })

    if (unresolvedBuildings.length === 0) {
      return undefined
    }

    const run = async () => {
      const updates = {}

      for (const building of unresolvedBuildings) {
        const query = building.mapQuery || building.address || building.name
        if (!query) continue

        attemptedGeocodeIdsRef.current.add(building.id)

        try {
          const geocoded = await geocodeQuery(query)
          if (geocoded) {
            updates[building.id] = geocoded
          }
        } catch {
          // Keep map usable even when fallback geocoding fails.
        }
      }

      if (isActive && Object.keys(updates).length > 0) {
        setCoordinatesById((previous) => ({ ...previous, ...updates }))
      }
    }

    void run()

    return () => {
      isActive = false
    }
  }, [buildings, coordinatesById, priorityBuildingId])

  const markers = React.useMemo(
    () =>
      buildings
        .map((building) => {
          const coords = resolveStoredCoordinates(building) ?? coordinatesById[building.id]
          if (!coords) return null

          return {
            id: building.id,
            name: building.name,
            type: building.type,
            address: building.address,
            lat: coords.lat,
            lng: coords.lng,
          }
        })
        .filter(Boolean),
    [buildings, coordinatesById],
  )

  const focusRequestKey = focusBuildingId && focusNonce > 0 ? `${focusBuildingId}:${focusNonce}` : null
  const focusTarget = React.useMemo(
    () => markers.find((marker) => marker.id === focusBuildingId) ?? null,
    [focusBuildingId, markers],
  )

  return (
    <div className="overflow-hidden rounded-[24px] border border-border/60">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        style={{ height: '420px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewportController
          focusRequestKey={focusRequestKey}
          focusTarget={focusTarget}
          markerRefs={markerRefs}
        />

        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.lat, marker.lng]}
            icon={marker.id === selectedBuildingId ? selectedMarkerIcon : defaultMarkerIcon}
            ref={(instance) => {
              if (instance) {
                markerRefs.current[marker.id] = instance
              } else {
                delete markerRefs.current[marker.id]
              }
            }}
          >
            <Popup>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{marker.name}</p>
                <p className="text-xs text-muted-foreground">{marker.type}</p>
                <p className="text-xs text-muted-foreground">{marker.address}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {markers.length === 0 ? (
        <div className="border-t border-border/60 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
          No mappable locations are available for the current results yet.
        </div>
      ) : (
        <div className="border-t border-border/60 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
          {selectedBuildingId
            ? 'Selected building pins use a high-contrast marker so they stand out on the map.'
            : 'Select a building and use Show location to focus its pin on the map.'}
        </div>
      )}
    </div>
  )
}
