import React, { useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';

export type MapLibreMarker = {
  id: string | number;
  lat: number;
  lng: number;
  color?: string;
  title?: string;
};

export type MapLibrePolylinePoint = { lat: number; lng: number };

type Props = {
  styleUrl?: string;
  markers: MapLibreMarker[];
  polyline?: MapLibrePolylinePoint[] | null;
  focus?: { lat: number; lng: number; zoom?: number } | null;
  onLoadError?: () => void;
};

const DEFAULT_STYLE_URL = 'https://demotiles.maplibre.org/style.json';

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
      var map = new maplibregl.Map({
        container: 'map',
        style: STYLE_URL,
        center: [0, 0],
        zoom: 2,
        attributionControl: true
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
            return {
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [Number(m.lng), Number(m.lat)] },
              properties: {
                id: String(m.id),
                color: m.color || '#2E8B57',
                title: m.title || ''
              }
            };
          })
        };
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

          if (payload.focus && typeof payload.focus.lat === 'number' && typeof payload.focus.lng === 'number') {
            map.easeTo({ center: [payload.focus.lng, payload.focus.lat], zoom: payload.focus.zoom || 15, duration: 350 });
          } else {
            // Prefer fitting markers; if there are no markers but a line exists, fit the line.
            if (markers.length > 0) {
              fitToAll(markers);
            } else if (hasLine) {
              var all = line.map(function(p){ return { lat: p.lat, lng: p.lng }; });
              fitToAll(all);
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
            'circle-radius': 7,
            'circle-color': ['get', 'color'],
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2
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

  const html = useMemo(() => makeHtml(styleUrl || DEFAULT_STYLE_URL), [styleUrl]);

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
