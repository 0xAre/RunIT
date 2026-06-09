'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: 'venue' | 'vendor' | 'catering' | 'equipment' | 'other';
  rating?: string;
  address?: string;
  reasoning?: string;
}

interface MapComponentProps {
  center?: [number, number];
  zoom?: number;
  radiusKm?: number;
  markers?: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  /** Called when user clicks on map to pick a location */
  onLocationPick?: (lat: number, lng: number) => void;
  /** If true, clicking the map sets a pin (venue picker mode) */
  interactive?: boolean;
  /** Show a crosshair cursor hint */
  showCrosshair?: boolean;
  /** Label for center pin when interactive */
  centerLabel?: string;
  style?: React.CSSProperties;
}

const CATEGORY_COLORS: Record<string, string> = {
  venue: '#7C6AF5',
  vendor: '#25D0AB',
  catering: '#FBBF24',
  equipment: '#00ADB5',
  other: '#A0A0A0',
};

const CATEGORY_EMOJI: Record<string, string> = {
  venue: '🏛️',
  vendor: '📦',
  catering: '🍽️',
  equipment: '🔧',
  other: '📍',
};

function createMarkerIcon(category: string) {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
  const emoji = CATEGORY_EMOJI[category] || '📍';
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        width:36px;height:36px;border-radius:50%;
        background:${color};
        border:3px solid rgba(255,255,255,0.9);
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
        font-size:16px;cursor:pointer;
        transition:transform 0.2s;
      " onmouseenter="this.style.transform='scale(1.2)'" onmouseleave="this.style.transform='scale(1)'">
        ${emoji}
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

export default function MapComponent({
  center = [-6.2088, 106.8456], // Default: Jakarta
  zoom = 13,
  radiusKm = 5,
  markers = [],
  onMarkerClick,
  onLocationPick,
  interactive = false,
  showCrosshair = false,
  centerLabel,
  style = {},
}: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const centerMarkerRef = useRef<L.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      zoomControl: false,
      attributionControl: false,
    });

    // Use a dark-themed tile layer for premium feel
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Add zoom control to bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Attribution
    L.control.attribution({ position: 'bottomleft', prefix: false })
      .addAttribution('© OpenStreetMap · CartoDB')
      .addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Click-to-pick handler
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !interactive) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (onLocationPick) onLocationPick(lat, lng);
    };

    map.on('click', handleClick);
    if (showCrosshair) map.getContainer().style.cursor = 'crosshair';
    else map.getContainer().style.cursor = '';

    return () => {
      map.off('click', handleClick);
      if (map.getContainer()) map.getContainer().style.cursor = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, onLocationPick, showCrosshair, mapReady]);

  // Center pin (for interactive / venue picker mode)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (centerMarkerRef.current) {
      centerMarkerRef.current.remove();
      centerMarkerRef.current = null;
    }

    if (interactive) {
      const pinIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div style="
          width:44px;height:44px;border-radius:50%;
          background:linear-gradient(135deg,#7C6AF5,#00ADB5);
          border:3px solid rgba(255,255,255,0.9);
          box-shadow:0 2px 12px rgba(124,106,245,0.6);
          display:flex;align-items:center;justify-content:center;
          font-size:20px;
          animation:pin-pulse 2s infinite;
        ">📍</div>`,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });
      const m = L.marker(center, { icon: pinIcon, zIndexOffset: 1000, draggable: true });
      if (centerLabel) m.bindTooltip(centerLabel, { permanent: true, direction: 'top', offset: [0, -28], className: 'runit-center-tooltip' });
      
      m.on('dragend', (e) => {
        const latlng = e.target.getLatLng();
        if (onLocationPick) onLocationPick(latlng.lat, latlng.lng);
      });
      
      m.addTo(map);
      centerMarkerRef.current = m;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, interactive, centerLabel, mapReady]);

  // Update center
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, zoom);
  }, [center, zoom]);

  // Update radius circle
  useEffect(() => {
    if (!mapRef.current) return;

    if (circleRef.current) {
      circleRef.current.remove();
    }

    circleRef.current = L.circle(center, {
      radius: radiusKm * 1000,
      color: '#7C6AF5',
      fillColor: '#7C6AF5',
      fillOpacity: 0.06,
      weight: 1.5,
      dashArray: '8 4',
    }).addTo(mapRef.current);
  }, [center, radiusKm]);

  // Update markers
  useEffect(() => {
    if (!markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    markers.forEach((m) => {
      const icon = createMarkerIcon(m.category);
      const marker = L.marker([m.lat, m.lng], { icon })
        .bindPopup(`
          <div style="font-family:var(--font-sans,system-ui);min-width:180px;padding:4px 0;">
            <div style="font-weight:700;font-size:0.9rem;margin-bottom:4px;color:#fff;">${m.name}</div>
            ${m.address ? `<div style="font-size:0.75rem;color:rgba(255,255,255,0.7);margin-bottom:4px;">📍 ${m.address}</div>` : ''}
            ${m.rating ? `<div style="font-size:0.75rem;color:#FBBF24;">⭐ ${m.rating}</div>` : ''}
            ${m.reasoning ? `<div style="font-size:0.72rem;color:rgba(255,255,255,0.6);margin-top:6px;line-height:1.4;">${m.reasoning}</div>` : ''}
          </div>
        `, {
          className: 'runit-map-popup',
        });

      if (onMarkerClick) {
        marker.on('click', () => onMarkerClick(m));
      }

      marker.addTo(markersLayerRef.current!);
    });
  }, [markers, onMarkerClick]);

  return (
    <>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 400,
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
          ...style,
        }}
      />
      <style>{`
        @keyframes pin-pulse {
          0%,100% { box-shadow: 0 2px 12px rgba(124,106,245,0.6); }
          50% { box-shadow: 0 2px 24px rgba(0,173,181,0.8), 0 0 0 8px rgba(124,106,245,0.15); }
        }
        .runit-center-tooltip {
          background: rgba(20,22,28,0.95) !important;
          border: 1px solid rgba(124,106,245,0.4) !important;
          color: #fff !important;
          font-size: 0.72rem !important;
          font-weight: 700 !important;
          border-radius: 6px !important;
          white-space: nowrap !important;
        }
        .runit-center-tooltip::before { display: none !important; }
        .custom-map-marker {
          background: transparent !important;
          border: none !important;
        }
        .runit-map-popup .leaflet-popup-content-wrapper {
          background: rgba(20, 22, 28, 0.95);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          color: #fff;
        }
        .runit-map-popup .leaflet-popup-tip {
          background: rgba(20, 22, 28, 0.95);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .runit-map-popup .leaflet-popup-close-button {
          color: rgba(255,255,255,0.5) !important;
        }
        .leaflet-control-zoom a {
          background: rgba(20, 22, 28, 0.9) !important;
          color: #fff !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
      `}</style>
    </>
  );
}
