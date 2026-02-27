"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

interface LeafletMapProps {
    lat: number;
    lng: number;
    onLocationChange: (lat: number, lng: number, address: string) => void;
}

export default function LeafletMap({ lat, lng, onLocationChange }: LeafletMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window === "undefined" || !containerRef.current) return;

        // Prevent double-init (React Strict Mode runs effects twice in dev)
        const container = containerRef.current as any;
        if (container._leaflet_id) return;

        let map: any;

        import("leaflet").then((L) => {
            // Fix Webpack/Next.js broken default icon paths
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl:
                    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                iconUrl:
                    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                shadowUrl:
                    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            });

            // Guard against container re-use between renders
            if (containerRef.current && !(containerRef.current as any)._leaflet_id) {
                map = L.map(containerRef.current, {
                    center: [lat, lng],
                    zoom: 15,
                    zoomControl: true,
                });
                mapRef.current = map;

                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    attribution: "© OpenStreetMap contributors",
                    maxZoom: 19,
                }).addTo(map);

                const marker = L.marker([lat, lng], { draggable: true }).addTo(map);
                marker.bindPopup("📍 Drag or click the map to set location").openPopup();
                markerRef.current = marker;

                marker.on("dragend", async () => {
                    const pos = marker.getLatLng();
                    const address = await reverseGeocode(pos.lat, pos.lng);
                    onLocationChange(pos.lat, pos.lng, address);
                });

                map.on("click", async (e: any) => {
                    marker.setLatLng(e.latlng);
                    const address = await reverseGeocode(e.latlng.lat, e.latlng.lng);
                    onLocationChange(e.latlng.lat, e.latlng.lng, address);
                });
            }
        });

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                markerRef.current = null;
            }
        };
    }, []); // Run once on mount only

    // Sync marker position when lat/lng props update externally (e.g. GPS)
    useEffect(() => {
        if (!mapRef.current || !markerRef.current) return;
        markerRef.current.setLatLng([lat, lng]);
        mapRef.current.setView([lat, lng], 15);
    }, [lat, lng]);

    return (
        <div
            ref={containerRef}
            className="w-full h-64 rounded-xl overflow-hidden border border-border"
            style={{ zIndex: 1 }}
        />
    );
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
        return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
}
