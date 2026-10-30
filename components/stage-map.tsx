"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { clientMapProvider, OSM_TILES } from "@/lib/maps";

type Pin = { lat: number; lng: number };

/**
 * The map picker. OpenStreetMap is the keyless provider.
 * When a Google Maps key is set, this is the component to replace with that SDK.
 */
export function StageMap({
  lat,
  lng,
  onPin,
  googlePending,
  latitudeLabel,
  longitudeLabel,
}: {
  lat: number | null;
  lng: number | null;
  onPin: (pin: Pin) => void;
  googlePending: string;
  latitudeLabel: string;
  longitudeLabel: string;
}) {
  const provider = clientMapProvider();
  if (provider.id === "google") {
    return (
      <GooglePinEntry
        lat={lat}
        lng={lng}
        onPin={onPin}
        note={googlePending}
        latitudeLabel={latitudeLabel}
        longitudeLabel={longitudeLabel}
      />
    );
  }
  return <OsmMap lat={lat} lng={lng} onPin={onPin} />;
}

function GooglePinEntry({
  lat,
  lng,
  onPin,
  note,
  latitudeLabel,
  longitudeLabel,
}: {
  lat: number | null;
  lng: number | null;
  onPin: (pin: Pin) => void;
  note: string;
  latitudeLabel: string;
  longitudeLabel: string;
}) {
  return (
    <div className="space-y-2" data-testid="google-map-hook">
      <p className="text-sm text-muted-foreground">{note}</p>
      <label className="block text-sm" htmlFor="google-lat">{latitudeLabel}</label>
      <input
        id="google-lat"
        type="number"
        step="any"
        value={lat ?? ""}
        className="h-11 w-full rounded-2xl border border-border bg-background px-3"
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next) && lng !== null) onPin({ lat: next, lng });
        }}
      />
      <label className="block text-sm" htmlFor="google-lng">{longitudeLabel}</label>
      <input
        id="google-lng"
        type="number"
        step="any"
        value={lng ?? ""}
        className="h-11 w-full rounded-2xl border border-border bg-background px-3"
        onChange={(event) => {
          const next = Number(event.target.value);
          if (Number.isFinite(next) && lat !== null) onPin({ lat, lng: next });
        }}
      />
    </div>
  );
}

function OsmMap({ lat, lng, onPin }: { lat: number | null; lng: number | null; onPin: (pin: Pin) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const onPinRef = useRef(onPin);
  useEffect(() => {
    onPinRef.current = onPin;
  }, [onPin]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let cancelled = false;
    let map: import("leaflet").Map | null = null;

    void (async () => {
      const leaflet = await import("leaflet");
      if (cancelled) return;
      const L = leaflet.default ?? leaflet;
      const start: [number, number] = lat !== null && lng !== null ? [lat, lng] : [55.6761, 12.5683];
      map = L.map(element, { scrollWheelZoom: false }).setView(start, lat !== null ? 16 : 13);
      L.tileLayer(OSM_TILES.url, { attribution: OSM_TILES.attribution, maxZoom: 19 }).addTo(map);
      const icon = L.divIcon({
        className: "",
        html: '<div data-testid="map-pin" style="width:18px;height:18px;border-radius:999px;background:#0f766e;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.45)"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      let marker: import("leaflet").Marker | null = null;
      const drop = (pin: Pin) => {
        if (!map) return;
        if (!marker) marker = L.marker([pin.lat, pin.lng], { icon }).addTo(map);
        else marker.setLatLng([pin.lat, pin.lng]);
      };
      if (lat !== null && lng !== null) drop({ lat, lng });
      map.on("click", (event) => {
        const pin = { lat: event.latlng.lat, lng: event.latlng.lng };
        drop(pin);
        onPinRef.current(pin);
      });
      window.setTimeout(() => map?.invalidateSize(), 200);
    })();

    return () => {
      cancelled = true;
      map?.remove();
      map = null;
    };
    // The map is created once. Later pins are applied by the click handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={host} data-testid="stage-map" className="z-0 h-52 w-full overflow-hidden rounded-xl" />;
}
