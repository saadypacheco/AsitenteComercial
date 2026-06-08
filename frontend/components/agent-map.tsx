"use client";

// Mapa de agentes (Leaflet). Se carga con dynamic import ssr:false desde la página
// porque Leaflet necesita window. Pines custom con divIcon (sin assets de imagen,
// evita el bug del marker roto en bundlers). Tiles de OpenStreetMap.
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

import type { Agente } from "@/lib/queries/gestion";

function pin(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 4px rgba(16,24,40,.45)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
    popupAnchor: [0, -16],
  });
}

export default function AgentMap({ agents }: { agents: Agente[] }) {
  const pts = agents.filter((a) => a.lat != null && a.lng != null);
  const center: [number, number] = pts.length
    ? [pts.reduce((s, a) => s + (a.lat ?? 0), 0) / pts.length, pts.reduce((s, a) => s + (a.lng ?? 0), 0) / pts.length]
    : [27.8, -81.7]; // Florida por defecto

  return (
    <MapContainer center={center} zoom={7} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {pts.map((a) => (
        <Marker key={a.id} position={[a.lat as number, a.lng as number]} icon={pin(a.estado === "activo" ? "#6366f1" : "#f79009")}>
          <Popup>
            <div style={{ minWidth: 160 }}>
              <strong style={{ color: "#101828" }}>
                {a.nombre} {a.apellido ?? ""}
              </strong>
              <div style={{ marginTop: 4, fontSize: 12, color: "#475467", lineHeight: 1.6 }}>
                {a.celular && <div>📱 {a.celular}</div>}
                {a.email && <div>✉️ {a.email}</div>}
                {a.ciudad && <div>📍 {a.ciudad}{a.region ? `, ${a.region}` : ""}</div>}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
