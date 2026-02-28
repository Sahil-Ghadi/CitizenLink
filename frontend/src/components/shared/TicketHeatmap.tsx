"use client";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export interface HeatPoint {
    lat: number;
    lng: number;
    severity: string;
    title: string;
}

const SEV_COLOR: Record<string, string> = {
    emergency: "#f87171",
    high: "#fb923c",
    medium: "#fbbf24",
    low: "#34d399",
};

interface Props {
    points: HeatPoint[];
    height?: number;
    focusPoint?: { lat: number; lng: number; zoom?: number } | null;
}

export default function TicketHeatmap({ points, height = 340, focusPoint }: Props) {
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletData = useRef<{ map: any; markers: any[] }>({ map: null, markers: [] });

    // Fly to focusPoint whenever it changes (triggered by clicking an insight)
    useEffect(() => {
        const map = leafletData.current.map;
        if (!map || !focusPoint) return;
        map.flyTo([focusPoint.lat, focusPoint.lng], focusPoint.zoom ?? 15, {
            animate: true,
            duration: 1.2,
        });
    }, [focusPoint]);

    useEffect(() => {
        if (typeof window === "undefined" || !mapRef.current) return;

        let isMounted = true;
        let mapInstance: any = null;
        const isUnmounted = { current: false };

        import("leaflet").then((L) => {
            // Delay initialization until the next tick so the DOM is fully painted
            setTimeout(() => {
                // Hard abort if the user navigated away from the page during the async module load.
                // This stops the `_leaflet_pos is undefined` crash occurring on page switching.
                if (isUnmounted.current || !mapRef.current) return;
                if (!document.body.contains(mapRef.current)) return;

                // Handle React 18 Strict Mode double-initialization
                if ((mapRef.current as any)._leaflet_id) {
                    return;
                }

                const validPoints = points.filter((p) => p.lat && p.lng);
                const centerLat = validPoints.length > 0 ? validPoints[0].lat : 19.076;
                const centerLng = validPoints.length > 0 ? validPoints[0].lng : 72.8777;

                try {
                    // Initialize map safely within try-catch to prevent unmount crashes
                    mapInstance = L.map(mapRef.current, {
                        center: [centerLat, centerLng],
                        zoom: 11,
                        scrollWheelZoom: false,
                        attributionControl: false,
                    });

                    // Final parity check
                    if (isUnmounted.current) {
                        mapInstance.remove();
                        return;
                    }
                } catch (error) {
                    console.error("Leaflet map initialization error:", error);
                    // If an error occurs during initialization, ensure mapInstance is null
                    mapInstance = null;
                    return; // Stop further execution if initialization failed
                }

                leafletData.current.map = mapInstance;

                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    maxZoom: 19,
                    attribution: '© OpenStreetMap'
                }).addTo(mapInstance);

                // Add heatmap circles
                validPoints.forEach((p) => {
                    const color = SEV_COLOR[p.severity] ?? SEV_COLOR["medium"];
                    const radius = p.severity === "emergency" ? 18
                        : p.severity === "high" ? 14
                            : p.severity === "medium" ? 10 : 8;

                    // Outer Glow
                    const outer = L.circleMarker([p.lat, p.lng], {
                        fillColor: color,
                        color: color,
                        weight: 0,
                        fillOpacity: 0.18,
                        interactive: false,
                        radius: radius + 6,
                    }).addTo(mapInstance);

                    // Inner Core
                    const inner = L.circleMarker([p.lat, p.lng], {
                        fillColor: color,
                        color: color,
                        weight: 1.5,
                        fillOpacity: 0.6,
                        radius: radius,
                    }).addTo(mapInstance);

                    const tooltipHtml = `
            <div style="font-size: 13px; font-weight: 700; color: #0f172a; font-family: inherit;">${p.title}</div>
            <div style="font-size: 11px; font-weight: 600; opacity: 0.8; margin-top: 3px; text-transform: capitalize; color: #334155; font-family: inherit;">
              ${p.severity}
            </div>
          `;

                    inner.bindTooltip(tooltipHtml, {
                        direction: "top",
                        offset: [0, -8],
                        className: "leaflet-tooltip-light",
                        opacity: 1,
                    });

                    leafletData.current.markers.push(outer, inner);
                });

                // Fit bounds if we have points
                if (validPoints.length > 0 && mapInstance) {
                    const bounds = L.latLngBounds(validPoints.map(p => [p.lat, p.lng]));
                    mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
                }
            }, 0);
        });

        return () => {
            isMounted = false;
            isUnmounted.current = true;
            if (leafletData.current.map) {
                leafletData.current.map.remove();
                leafletData.current.map = null;
                leafletData.current.markers = [];
            }
            if (mapRef.current) {
                (mapRef.current as any)._leaflet_id = null;
            }
        };
    }, [points]);

    return (
        <div
            style={{ height, width: "100%", borderRadius: "1rem", overflow: "hidden", zIndex: 1, position: "relative" }}
        >
            <div
                ref={mapRef}
                style={{ height: "100%", width: "100%", background: "hsl(var(--secondary))" }}
            />
        </div>
    );
}
