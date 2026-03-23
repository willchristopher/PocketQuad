'use client'

import React from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const DEFAULT_CENTER = [36.6159, -88.3227]
const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q='

const defaultMarkerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
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

function RecenterMap({ center }) {
  const map = useMap()

  React.useEffect(() => {
    if (!center) return
    map.flyTo([center.lat, center.lng], 16, { duration: 0.6 })
  }, [center, map])

  return null
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

export default function CampusLeafletMap({ buildings, selectedBuildingId }) {
  const [coordinatesById, setCoordinatesById] = React.useState({})

  React.useEffect(() => {
    let isActive = true

    const run = async () => {
      const updates = {}

      for (const building of buildings) {
        const existing = coordinatesById[building.id]
        if (existing) {
          updates[building.id] = existing
          continue
        }

        const parsed = parseCoordinateQuery(building.mapQuery)
        if (parsed) {
          updates[building.id] = parsed
          continue
        }

        const query = building.mapQuery || building.address || building.name
        if (!query) continue

        try {
          const geocoded = await geocodeQuery(query)
          if (geocoded) {
            updates[building.id] = geocoded
          }
        } catch {
          // Keep map functional even when geocoding fails for a location.
        }
      }

      if (isActive) {
        setCoordinatesById((previous) => ({ ...previous, ...updates }))
      }
    }

    void run()

    return () => {
      isActive = false
    }
  }, [buildings, coordinatesById])

  const markers = React.useMemo(
    () =>
      buildings
        .map((building) => {
          const coords = coordinatesById[building.id]
          if (!coords) return null

          return {
            id: building.id,
            name: building.name,
            type: building.type,
            address: building.address,
            mapQuery: building.mapQuery,
            lat: coords.lat,
            lng: coords.lng,
          }
        })
        .filter(Boolean),
    [buildings, coordinatesById],
  )

  const selectedCoords = selectedBuildingId ? coordinatesById[selectedBuildingId] : null

  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={15}
        scrollWheelZoom
        style={{ height: '360px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterMap center={selectedCoords} />

        {markers.map((marker) => (
          <Marker key={marker.id} position={[marker.lat, marker.lng]} icon={defaultMarkerIcon}>
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
    </div>
  )
}
