'use client'

import React from 'react'

const DEFAULT_CENTER = { lat: 36.6159, lng: -88.3227 }
const DEFAULT_ZOOM = 15
const FOCUS_ZOOM = 17
const GOOGLE_MAPS_SCRIPT_ID = 'pocketquad-google-maps-script'
const DEFAULT_MARKER_ICON = 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
const SELECTED_MARKER_ICON = 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png'

let googleMapsPromise

function resolveStoredCoordinates(building) {
  if (Number.isFinite(building.latitude) && Number.isFinite(building.longitude)) {
    return {
      lat: Number(building.latitude),
      lng: Number(building.longitude),
    }
  }

  return null
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function buildInfoWindowContent(marker) {
  return `
    <div style="min-width: 180px; font-family: var(--font-body);">
      <div style="font-weight: 700; font-size: 14px; color: #0f172a;">${escapeHtml(marker.name)}</div>
      <div style="margin-top: 4px; font-size: 12px; color: #475569;">${escapeHtml(marker.type)}</div>
      <div style="margin-top: 6px; font-size: 12px; color: #64748b;">${escapeHtml(marker.address)}</div>
    </div>
  `
}

function loadGoogleMapsApi(apiKey) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps can only load in the browser'))
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google.maps)
  }

  if (googleMapsPromise) {
    return googleMapsPromise
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID)

    const handleLoad = () => {
      if (window.google?.maps) {
        resolve(window.google.maps)
      } else {
        reject(new Error('Google Maps loaded without exposing the maps API'))
      }
    }

    const handleError = () => {
      googleMapsPromise = undefined
      reject(new Error('Unable to load the Google Maps JavaScript API'))
    }

    if (existingScript) {
      existingScript.addEventListener('load', handleLoad, { once: true })
      existingScript.addEventListener('error', handleError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`
    script.async = true
    script.defer = true
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    document.head.appendChild(script)
  })

  return googleMapsPromise
}

export default function CampusGoogleMap({
  buildings,
  selectedBuildingId,
  focusBuildingId = null,
  focusNonce = 0,
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? ''
  const mapElementRef = React.useRef(null)
  const mapRef = React.useRef(null)
  const mapsRef = React.useRef(null)
  const infoWindowRef = React.useRef(null)
  const markersRef = React.useRef(new Map())
  const handledFocusRequestRef = React.useRef(null)
  const [mapStatus, setMapStatus] = React.useState(
    apiKey ? 'Loading Google Maps…' : 'Add a Google Maps API key to enable the map.',
  )
  const [mapReady, setMapReady] = React.useState(false)
  const visibleBuildings = React.useMemo(() => {
    if (!selectedBuildingId) return []
    return buildings.filter((building) => building.id === selectedBuildingId)
  }, [buildings, selectedBuildingId])

  React.useEffect(() => {
    if (!apiKey) {
      setMapReady(false)
      setMapStatus('Add a Google Maps API key to enable the map.')
      return
    }

    let isActive = true

    void loadGoogleMapsApi(apiKey)
      .then((maps) => {
        if (!isActive || !mapElementRef.current) return

        mapsRef.current = maps

        if (!mapRef.current) {
          mapRef.current = new maps.Map(mapElementRef.current, {
            center: DEFAULT_CENTER,
            zoom: DEFAULT_ZOOM,
            fullscreenControl: true,
            mapTypeControl: false,
            streetViewControl: false,
            gestureHandling: 'greedy',
          })
        }

        if (!infoWindowRef.current) {
          infoWindowRef.current = new maps.InfoWindow()
        }

        setMapReady(true)
        setMapStatus('Google Maps is ready.')
      })
      .catch((error) => {
        console.error(error)
        if (!isActive) return
        setMapReady(false)
        setMapStatus('Unable to load Google Maps. Check the API key and allowed referrers.')
      })

    return () => {
      isActive = false
    }
  }, [apiKey])

  const markers = React.useMemo(
    () =>
      visibleBuildings
        .map((building) => {
          const coords = resolveStoredCoordinates(building)
          if (!coords) return null

          return {
            id: building.id,
            name: building.name,
            type: building.type,
            address: building.address,
            position: coords,
          }
        })
        .filter(Boolean),
    [visibleBuildings],
  )

  React.useEffect(() => {
    if (!mapReady || !mapRef.current || !mapsRef.current) return

    const maps = mapsRef.current
    const map = mapRef.current
    const infoWindow = infoWindowRef.current
    const markerIds = new Set(markers.map((marker) => marker.id))

    markersRef.current.forEach((entry, markerId) => {
      if (!markerIds.has(markerId)) {
        entry.setMap(null)
        markersRef.current.delete(markerId)
      }
    })

    for (const markerData of markers) {
      const existingMarker = markersRef.current.get(markerData.id)

      if (existingMarker) {
        existingMarker.setPosition(markerData.position)
        existingMarker.setIcon(
          markerData.id === selectedBuildingId ? SELECTED_MARKER_ICON : DEFAULT_MARKER_ICON,
        )
        existingMarker.setTitle(markerData.name)
        existingMarker.__pocketquadData = markerData
        continue
      }

      const marker = new maps.Marker({
        map,
        position: markerData.position,
        title: markerData.name,
        icon: markerData.id === selectedBuildingId ? SELECTED_MARKER_ICON : DEFAULT_MARKER_ICON,
      })

      marker.__pocketquadData = markerData
      marker.addListener('click', () => {
        infoWindow.setContent(buildInfoWindowContent(markerData))
        infoWindow.open({ anchor: marker, map })
      })

      markersRef.current.set(markerData.id, marker)
    }

    if (markers.length === 0) {
      map.setCenter(DEFAULT_CENTER)
      map.setZoom(DEFAULT_ZOOM)
      infoWindow?.close()
      setMapStatus(
        apiKey
          ? selectedBuildingId
            ? 'The selected building does not have an exact map pin yet.'
            : 'Select a building to show its pin on the map.'
          : 'Add a Google Maps API key to enable the map.',
      )
      return
    }

    setMapStatus(
      'Showing the selected building on the map.',
    )
  }, [apiKey, mapReady, markers, selectedBuildingId])

  React.useEffect(() => {
    if (!mapReady || !mapRef.current || !mapsRef.current || !focusBuildingId || focusNonce <= 0) {
      return
    }

    const focusRequestKey = `${focusBuildingId}:${focusNonce}`
    if (handledFocusRequestRef.current === focusRequestKey) {
      return
    }

    const target = markers.find((marker) => marker.id === focusBuildingId)
    if (!target) {
      return
    }

    handledFocusRequestRef.current = focusRequestKey
    const map = mapRef.current
    const maps = mapsRef.current
    const infoWindow = infoWindowRef.current
    const marker = markersRef.current.get(target.id)

    map.panTo(target.position)
    map.setZoom(FOCUS_ZOOM)

    if (marker) {
      marker.setAnimation(maps.Animation.DROP)
      window.setTimeout(() => marker.setAnimation(null), 700)
      infoWindow.setContent(buildInfoWindowContent(target))
      infoWindow.open({ anchor: marker, map })
    }
  }, [focusBuildingId, focusNonce, mapReady, markers])

  React.useEffect(() => {
    const markers = markersRef.current

    return () => {
      markers.forEach((marker) => marker.setMap(null))
      markers.clear()
    }
  }, [])

  return (
    <div className="overflow-hidden rounded-[24px] border border-border/60">
      <div ref={mapElementRef} className="h-[420px] w-full bg-muted/20" />
      <div className="border-t border-border/60 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
        {mapStatus}
      </div>
    </div>
  )
}
