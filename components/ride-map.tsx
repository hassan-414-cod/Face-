"use client";

import { useEffect, useState } from "react";
import { APIProvider, Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_PLATFORM_KEY || "";

interface RideMapProps {
  defaultCenter?: { lat: number; lng: number };
  driverLocation?: { lat: number; lng: number } | null;
  customerLocation?: { lat: number; lng: number } | null;
}

export function RideMap({ defaultCenter, driverLocation, customerLocation }: RideMapProps) {
  const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';
  const center = driverLocation || customerLocation || defaultCenter || { lat: 37.42, lng: -122.08 };

  if (!hasValidKey) {
    // Google Maps iframe preview that works without an API key
    const iframeUrl = `https://maps.google.com/maps?q=${center.lat},${center.lng}&z=14&output=embed`;
    
    return (
      <div className="w-full h-full relative bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
        <iframe 
          title="Google Map Preview"
          width="100%" 
          height="100%" 
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={iframeUrl}
        />
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded text-xs font-semibold shadow text-slate-700 pointer-events-none">
          Map Preview Mode
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        defaultCenter={center}
        center={center}
        defaultZoom={14}
        mapId="RIDESCAN_MAP_ID"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%', borderRadius: '0.5rem', overflow: 'hidden' }}
        gestureHandling="cooperative"
      >
        {driverLocation && (
          <AdvancedMarker position={driverLocation} title="Driver Location">
            <Pin background="#4f46e5" glyphColor="#fff" borderColor="#312e81" />
          </AdvancedMarker>
        )}
        {customerLocation && (
          <AdvancedMarker position={customerLocation} title="Customer Location">
            <Pin background="#e11d48" glyphColor="#fff" borderColor="#881337" />
          </AdvancedMarker>
        )}
      </Map>
    </APIProvider>
  );
}
