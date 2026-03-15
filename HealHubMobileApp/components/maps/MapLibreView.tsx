import React, { useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';

export type MapLibreMarker = {
  id: string | number;
  lat: number;
  lng: number;
  color?: string;
  title?: string;
  /**
   * Optional marker kind; used to render an appropriate icon when `iconText` isn't provided.
   * Kept intentionally small to avoid introducing a whole marker system.
   */
  kind?: 'ambulance' | 'patient' | 'pin' | 'default';
  /**
   * Optional text icon rendered as a MapLibre symbol (e.g. "🚑" or "📍").
   */
  iconText?: string;
};

export type MapLibrePolylinePoint = { lat: number; lng: number };

type Props = {
  styleUrl?: string;
  markers: MapLibreMarker[];
  polyline?: MapLibrePolylinePoint[] | null;
  focus?: { lat: number; lng: number; zoom?: number } | null;
  onLoadError?: () => void;
};

// Map style selector.
// Many networks block vector tile endpoints; a raster OSM basemap is often more compatible.
// For production, host your own tiles/style or use a provider that allows production use.
export const MAPLIBRE_STYLE_OSM_RASTER = 'osm-raster';
export const MAPLIBRE_STYLE_CARTO_VOYAGER = 'carto-voyager';
export const MAPLIBRE_STYLE_DEMO_STREETS_URL = 'https://demotiles.maplibre.org/style.json';

// Backwards-friendly name used by app screens.
export const MAPLIBRE_STYLE_STREETS_URL = MAPLIBRE_STYLE_CARTO_VOYAGER;

function makeHtml(styleUrl: string) {
  // MapLibre GL JS in a WebView (no Google API key needed).
  // Note: This uses a public demo style URL. For production, host your own tiles/style or use a provider that allows production use.
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
  <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
  <style>
    html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #fff; }
    .maplibregl-ctrl-attrib { font-size: 10px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <script>
    (function() {
      var STYLE_URL = ${JSON.stringify(styleUrl)};

      // Inline raster style for OpenStreetMap Standard tiles.
      // NOTE: This is for development/demo. For production, use a proper tile provider.
      var OSM_RASTER_STYLE = {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          { id: 'osm', type: 'raster', source: 'osm' }
        ]
      };

      // A nicer-looking raster street basemap.
      var CARTO_VOYAGER_STYLE = {
        version: 8,
        sources: {
          carto: {
            type: 'raster',
            tiles: [
              'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
              'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
              'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
              'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors © CARTO'
          }
        },
        layers: [
          { id: 'carto', type: 'raster', source: 'carto' }
        ]
      };

      var resolvedStyle = STYLE_URL;
      if (STYLE_URL === 'osm-raster') {
        resolvedStyle = OSM_RASTER_STYLE;
      }
      if (STYLE_URL === 'carto-voyager') {
        resolvedStyle = CARTO_VOYAGER_STYLE;
      }
      function initialViewFromPayload(p) {
        try {
          if (p && p.focus && typeof p.focus.lat === 'number' && typeof p.focus.lng === 'number') {
            return { center: [Number(p.focus.lng), Number(p.focus.lat)], zoom: Number(p.focus.zoom || 15) };
          }
          var markers = (p && Array.isArray(p.markers)) ? p.markers : [];
          if (markers.length > 0 && typeof markers[0].lat === 'number' && typeof markers[0].lng === 'number') {
            return { center: [Number(markers[0].lng), Number(markers[0].lat)], zoom: 13 };
          }
          var line = (p && Array.isArray(p.polyline)) ? p.polyline : [];
          if (line.length > 0 && typeof line[0].lat === 'number' && typeof line[0].lng === 'number') {
            return { center: [Number(line[0].lng), Number(line[0].lat)], zoom: 12 };
          }
        } catch (e) {}
        return { center: [0, 0], zoom: 2 };
      }

      // The React Native WebView injects window.__INITIAL_PAYLOAD__ before content loads.
      // Use it to avoid a brief "world view" flash.
      var initial = initialViewFromPayload(window.__INITIAL_PAYLOAD__);

      var map = new maplibregl.Map({
        container: 'map',
        style: resolvedStyle,
        center: initial.center,
        zoom: initial.zoom,
        attributionControl: true
      });

      // Surface style/tile errors to RN so callers can fall back.
      map.on('error', function() {
        safePost('map_error');
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

      function safePost(msg) {
        try {
          if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
            window.ReactNativeWebView.postMessage(String(msg));
          }
        } catch (e) {}
      }

      function toFeatureCollection(markers) {
        return {
          type: 'FeatureCollection',
          features: (markers || []).map(function(m) {
            var kind = (m && m.kind) ? String(m.kind) : 'default';
            return {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [Number(m.lng), Number(m.lat)] },
              properties: {
                id: String(m.id),
                color: m.color || '#2E8B57',
                title: m.title || '',
                kind: kind
              }
            };
          })
        };
      }

      // DOM markers (more reliable than symbol icons in some WebViews).
      var __domMarkers = {};
      var __activePopup = null;
      var __lastFitKey = null;

      function getIconSvg(kind) {
        // Backwards compat: old signature. Default accent.
        return getIconSvgWithAccent(kind, '#2E8B57');
      }

      function safeAccentColor(input) {
        var c = String(input || '').trim();
        // Allow only hex colors to avoid CSS injection.
        if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(c)) return c;
        return '#2E8B57';
      }

      function isLightHex(hex) {
        try {
          var h = String(hex).replace('#', '');
          if (h.length === 3) h = h[0]+h[0] + h[1]+h[1] + h[2]+h[2];
          if (h.length < 6) return false;
          var r = parseInt(h.slice(0,2), 16) / 255;
          var g = parseInt(h.slice(2,4), 16) / 255;
          var b = parseInt(h.slice(4,6), 16) / 255;
          // Relative luminance (sRGB)
          var L = 0.2126*r + 0.7152*g + 0.0722*b;
          return L > 0.72;
        } catch (e) {
          return false;
        }
      }

      function getIconSvgWithAccent(kind, accent) {
        var bg = safeAccentColor(accent);
        var fg = isLightHex(bg) ? '#0f172a' : '#ffffff';

        // Badge-style icon: circle background + crisp glyph.
        if (kind === 'ambulance') {
          return (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true">'
            + '<circle cx="32" cy="32" r="28" fill="' + bg + '"/>'
            + '<g stroke="' + fg + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none">'
            // Main body (front view)
            + '<rect x="18" y="18" width="28" height="30" rx="7"/>'
            // Windshield
            + '<path d="M22 26c0-3 2.5-5.5 5.5-5.5h9c3 0 5.5 2.5 5.5 5.5v6H22z"/>'
            // Grill/bumper line
            + '<path d="M21 40h22"/>'
            // Lights
            + '<path d="M21 44h3"/>'
            + '<path d="M40 44h3"/>'
            + '</g>'
            // Medical cross (solid)
            + '<g fill="' + fg + '">'
            + '<path d="M30.8 31.2h2.8v-2.8h2.8v2.8h2.8V34h-2.8v2.8h-2.8V34h-2.8z"/>'
            + '</g>'
            + '</svg>'
          );
        }

        if (kind === 'patient') {
          return (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true">'
            + '<circle cx="32" cy="32" r="28" fill="' + bg + '"/>'
            + '<g fill="' + fg + '">'
            + '<circle cx="32" cy="28" r="8"/>'
            + '<path d="M18 48c1.5-8.3 8.1-13 14-13s12.5 4.7 14 13"/>'
            + '</g>'
            + '</svg>'
          );
        }

        // pin/default
        return (
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true">'
          + '<circle cx="32" cy="32" r="28" fill="' + bg + '"/>'
          + '<g fill="' + fg + '">'
          + '<path d="M32 50c6.7-6.4 12-12.2 12-20.1C44 23 38.6 18 32 18S20 23 20 29.9C20 37.8 25.3 43.6 32 50z"/>'
          + '<circle cx="32" cy="30" r="5.2" fill="' + bg + '" opacity="0.35"/>'
          + '</g>'
          + '</svg>'
        );
      }

      function escapeHtml(text) {
        return String(text)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function defaultTitleForKind(kind) {
        if (kind === 'patient') return 'You';
        if (kind === 'ambulance') return 'Ambulance';
        return 'Location';
      }

      function openPopupAt(lngLat, title) {
        try {
          if (__activePopup) {
            try { __activePopup.remove(); } catch (e) {}
            __activePopup = null;
          }
          var safeTitle = escapeHtml(title || '');
          var html = '<div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; font-size: 12px; font-weight: 700; color: #0f172a; padding: 6px 8px;">'
            + safeTitle
            + '</div>';
          __activePopup = new maplibregl.Popup({ closeButton: false, closeOnClick: true, offset: 18 })
            .setLngLat(lngLat)
            .setHTML(html)
            .addTo(map);
        } catch (e) {}
      }

      function makeMarkerElement(kind, title, color) {
        var el = document.createElement('div');
        el.style.width = (kind === 'ambulance' ? '34px' : kind === 'patient' ? '32px' : '30px');
        el.style.height = (kind === 'ambulance' ? '34px' : kind === 'patient' ? '32px' : '30px');
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.pointerEvents = 'auto';
        el.style.transform = 'translateZ(0)';
        el.style.cursor = 'pointer';
        el.style.webkitTapHighlightColor = 'transparent';
        if (title) el.title = String(title);

        // Subtle shadow for a more "native" look.
        el.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,0.22))';

        // Fallback dot (always visible).
        var dot = document.createElement('div');
        dot.style.position = 'absolute';
        dot.style.width = '10px';
        dot.style.height = '10px';
        dot.style.borderRadius = '999px';
        dot.style.background = String(color || '#2E8B57');
        dot.style.border = '2px solid #ffffff';
        dot.style.boxShadow = '0 1px 2px rgba(0,0,0,0.22)';

        // Inline SVG icon (more WebView-friendly than data-URI backgrounds).
        var svgWrap = document.createElement('div');
        svgWrap.style.width = '100%';
        svgWrap.style.height = '100%';
        svgWrap.style.position = 'relative';
        svgWrap.style.display = 'block';
        svgWrap.innerHTML = getIconSvgWithAccent(kind, color);

        // Make sure the SVG scales to the container.
        try {
          var svg = svgWrap.querySelector('svg');
          if (svg) {
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
          }
        } catch (e) {}

        el.style.position = 'relative';
        el.appendChild(dot);
        el.appendChild(svgWrap);

        // Show title on tap/click.
        var clickHandler = function(ev) {
          try { if (ev && ev.preventDefault) ev.preventDefault(); } catch (e) {}
          try { if (ev && ev.stopPropagation) ev.stopPropagation(); } catch (e) {}
          try {
            if (el.__getLngLat) {
              openPopupAt(el.__getLngLat(), title);
              return;
            }
          } catch (e) {}
        };
        el.addEventListener('click', clickHandler);
        el.addEventListener('touchend', clickHandler);

        return el;
      }

      function dist(a, b) {
        var dx = (a.lng - b.lng);
        var dy = (a.lat - b.lat);
        return Math.sqrt(dx * dx + dy * dy);
      }

      function animateMarkerTo(existing, toLngLat, durationMs) {
        try {
          if (!existing || !existing.marker) return;
          if (existing.__cancelAnim) existing.__cancelAnim();
          var start = existing.marker.getLngLat();
          var end = { lng: Number(toLngLat[0]), lat: Number(toLngLat[1]) };
          if (!Number.isFinite(end.lng) || !Number.isFinite(end.lat)) return;
          if (!start || !Number.isFinite(start.lng) || !Number.isFinite(start.lat)) {
            existing.marker.setLngLat(toLngLat);
            return;
          }
          if (dist(start, end) < 0.000002) {
            existing.marker.setLngLat(toLngLat);
            return;
          }

          var cancelled = false;
          existing.__cancelAnim = function() { cancelled = true; };
          var t0 = Date.now();
          var dur = Math.max(80, Number(durationMs || 500));

          (function step() {
            if (cancelled) return;
            var t = (Date.now() - t0) / dur;
            if (t >= 1) {
              existing.marker.setLngLat([end.lng, end.lat]);
              return;
            }
            // easeOutCubic
            var k = 1 - Math.pow(1 - t, 3);
            var lng = start.lng + (end.lng - start.lng) * k;
            var lat = start.lat + (end.lat - start.lat) * k;
            existing.marker.setLngLat([lng, lat]);
            requestAnimationFrame(step);
          })();
        } catch (e) {
          try { existing.marker.setLngLat(toLngLat); } catch (e2) {}
        }
      }

      function syncDomMarkers(markers) {
        var next = {};
        for (var i = 0; i < (markers || []).length; i++) {
          var m = markers[i];
          if (!m) continue;
          var id = String(m.id);
          var kind = (m.kind ? String(m.kind) : 'default');
          var title = (m.title && String(m.title).trim()) ? String(m.title).trim() : defaultTitleForKind(kind);
          var color = m.color || '#2E8B57';
          next[id] = true;

          var lngLat = [Number(m.lng), Number(m.lat)];

          var existing = __domMarkers[id];
          if (!existing) {
            var el = makeMarkerElement(kind, title, color);
            existing = {
              kind: kind,
              title: title,
              color: color,
              marker: null,
              __cancelAnim: null
            };
            existing.marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(lngLat).addTo(map);

            // Provide current lngLat to the click handler.
            try {
              el.__getLngLat = function() {
                var p = existing.marker.getLngLat();
                return [p.lng, p.lat];
              };
            } catch (e) {}

            __domMarkers[id] = existing;
          } else {
            // Recreate if kind/title changed.
            if (existing.kind !== kind || existing.title !== title || existing.color !== color) {
              try { existing.marker.remove(); } catch (e) {}
              if (existing.__cancelAnim) { try { existing.__cancelAnim(); } catch (e0) {} }
              var el2 = makeMarkerElement(kind, title, color);
              existing = {
                kind: kind,
                title: title,
                color: color,
                marker: null,
                __cancelAnim: null
              };
              existing.marker = new maplibregl.Marker({ element: el2, anchor: 'center' }).setLngLat(lngLat).addTo(map);
              try {
                el2.__getLngLat = function() {
                  var p2 = existing.marker.getLngLat();
                  return [p2.lng, p2.lat];
                };
              } catch (e) {}
              __domMarkers[id] = existing;
            } else {
              // Animate movement for smoother realtime updates.
              animateMarkerTo(existing, lngLat, 550);
            }
          }
        }

        // Remove stale markers.
        Object.keys(__domMarkers).forEach(function(id) {
          if (next[id]) return;
          if (__domMarkers[id].__cancelAnim) { try { __domMarkers[id].__cancelAnim(); } catch (e0) {} }
          try { __domMarkers[id].marker.remove(); } catch (e) {}
          delete __domMarkers[id];
        });
      }

      function toLineFeature(points) {
        var coords = (points || []).map(function(p) { return [Number(p.lng), Number(p.lat)]; });
        return {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: coords },
          properties: {}
        };
      }

      function fitToAll(markers) {
        if (!markers || markers.length === 0) return;
        var minLng = markers[0].lng, maxLng = markers[0].lng;
        var minLat = markers[0].lat, maxLat = markers[0].lat;
        for (var i = 0; i < markers.length; i++) {
          var m = markers[i];
          if (m.lng < minLng) minLng = m.lng;
          if (m.lng > maxLng) maxLng = m.lng;
          if (m.lat < minLat) minLat = m.lat;
          if (m.lat > maxLat) maxLat = m.lat;
        }
        if (minLng === maxLng && minLat === maxLat) {
          map.easeTo({ center: [minLng, minLat], zoom: 15, duration: 400 });
          return;
        }
        map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 48, duration: 400 });
      }

      function setData(payload) {
        payload = payload || {};
        var markers = payload.markers || [];
        var line = payload.polyline || [];

        var fc = toFeatureCollection(markers);
        var hasLine = Array.isArray(line) && line.length >= 2;

        if (map.isStyleLoaded()) {
          if (map.getSource('markers')) {
            map.getSource('markers').setData(fc);
          }
          if (map.getSource('route')) {
            map.getSource('route').setData(toLineFeature(line));
          }

          // Render the marker icons via DOM elements.
          syncDomMarkers(markers);

          if (payload.focus && typeof payload.focus.lat === 'number' && typeof payload.focus.lng === 'number') {
            map.easeTo({ center: [payload.focus.lng, payload.focus.lat], zoom: payload.focus.zoom || 15, duration: 350 });
          } else {
            // Prefer fitting markers; if there are no markers but a line exists, fit the line.
            // Don't refit on every location tick; only refit when the relevant geometry changes.
            var markerKey = (markers || []).map(function(m){ return String(m.id); }).sort().join('|');
            var lineKey = '';
            if (hasLine) {
              try {
                var first = line[0];
                var last = line[line.length - 1];
                lineKey = String(line.length)
                  + ':' + String(first.lat) + ',' + String(first.lng)
                  + '->' + String(last.lat) + ',' + String(last.lng);
              } catch (e) {
                lineKey = String(line.length);
              }
            }
            var fitKey = markerKey + '|' + lineKey;
            if (fitKey && fitKey !== __lastFitKey) {
              __lastFitKey = fitKey;
              if (markers.length > 0) {
                fitToAll(markers);
              } else if (hasLine) {
                var all = line.map(function(p){ return { lat: p.lat, lng: p.lng }; });
                fitToAll(all);
              }
            }
          }
        }
      }

      map.on('load', function() {
        map.addSource('markers', { type: 'geojson', data: toFeatureCollection([]) });
        map.addLayer({
          id: 'marker-circles',
          type: 'circle',
          source: 'markers',
          paint: {
            // Hide dots; icons are rendered as DOM markers.
            'circle-radius': 0,
            'circle-opacity': 0,
            'circle-color': ['get', 'color'],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 0
          }
        });

        map.addSource('route', { type: 'geojson', data: toLineFeature([]) });
        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': '#2E8B57', 'line-width': 4 }
        });

        safePost('ready');
        if (window.__INITIAL_PAYLOAD__) {
          setData(window.__INITIAL_PAYLOAD__);
        }
      });

      function handleMessage(ev) {
        try {
          var data = ev && ev.data ? ev.data : ev;
          if (!data) return;
          if (typeof data === 'string') {
            var parsed = JSON.parse(data);
            setData(parsed);
          } else {
            setData(data);
          }
        } catch (e) {}
      }

      document.addEventListener('message', handleMessage);
      window.addEventListener('message', handleMessage);

      window.__setMapData = setData;
    })();
  </script>
</body>
</html>`;
}

export default function MapLibreView(props: Props) {
  const { styleUrl, markers, polyline, focus, onLoadError } = props;

  const webRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  const html = useMemo(() => makeHtml(styleUrl || MAPLIBRE_STYLE_STREETS_URL), [styleUrl]);

  const payload = useMemo(() => {
    return {
      markers,
      polyline: polyline ?? [],
      focus: focus ?? null,
    };
  }, [markers, polyline, focus]);

  const injectedBeforeLoad = useMemo(() => {
    // Provide initial payload before map loads.
    return `window.__INITIAL_PAYLOAD__ = ${JSON.stringify(payload)}; true;`;
  }, [payload]);

  const sendPayload = () => {
    try {
      webRef.current?.postMessage(JSON.stringify(payload));
    } catch {
      // ignore
    }
  };

  const onMessage = (e: WebViewMessageEvent) => {
    const msg = String(e?.nativeEvent?.data ?? '');
    if (msg === 'ready') {
      setReady(true);
      // Send latest payload once ready.
      sendPayload();
    }
    if (msg === 'map_error') {
      onLoadError?.();
    }
  };

  // Keep the web map in sync on prop changes.
  React.useEffect(() => {
    if (!ready) return;
    sendPayload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, payload]);

  if (Platform.OS === 'web') {
    return <View style={{ flex: 1 }} />;
  }

  return (
    <WebView
      ref={webRef}
      originWhitelist={['*']}
      source={{ html }}
      onMessage={onMessage}
      injectedJavaScriptBeforeContentLoaded={injectedBeforeLoad}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      onError={() => {
        onLoadError?.();
      }}
      onHttpError={() => {
        onLoadError?.();
      }}
      style={{ flex: 1 }}
    />
  );
}
