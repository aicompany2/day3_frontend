// 제주 지도 — 측정소 마커를 누르면(또는 지도를 누르면 가장 가까운 측정소) 미세먼지를 보여 준다
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { STATION_COORDS } from "./stations";

const COLOR = { 좋음: "#2f80ed", 보통: "#27ae60", 나쁨: "#f2994a", 매우나쁨: "#eb5757" };
const GRAY = "#9aa0a6";

function icon(r, selected) {
  const c = COLOR[r.pm10_grade] ?? GRAY;
  const size = selected ? 44 : 36;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${c};color:#fff;
      display:flex;align-items:center;justify-content:center;font:bold 13px sans-serif;
      border:${selected ? "3px solid #222" : "2px solid #fff"};box-shadow:0 1px 4px rgba(0,0,0,.45)">
      ${r.pm10 ?? "-"}</div>`,
  });
}

function dist(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

export default function MapView({ rows, onSelect }) {
  const box = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const [selected, setSelected] = useState(null);

  const placed = rows.filter((r) => STATION_COORDS[r.station]);
  const unplaced = rows.filter((r) => !STATION_COORDS[r.station]);
  const current = rows.find((r) => r.station === selected);

  function pick(station) {
    setSelected(station);
    onSelect?.(station);
  }

  // 지도는 한 번만 만든다
  useEffect(() => {
    map.current = L.map(box.current).setView([33.38, 126.55], 10);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 18,
    }).addTo(map.current);
    layer.current = L.layerGroup().addTo(map.current);
    return () => map.current.remove();
  }, []);

  // 지도 빈 곳을 누르면 가장 가까운 측정소 선택
  useEffect(() => {
    const m = map.current;
    const onClick = (e) => {
      const p = [e.latlng.lat, e.latlng.lng];
      let best = null;
      for (const r of placed) {
        const d = dist(p, STATION_COORDS[r.station]);
        if (!best || d < best.d) best = { d, r };
      }
      if (best) pick(best.r.station);
    };
    m.on("click", onClick);
    return () => m.off("click", onClick);
  });

  // 데이터·선택이 바뀌면 마커 다시 그리기
  useEffect(() => {
    layer.current.clearLayers();
    for (const r of placed) {
      L.marker(STATION_COORDS[r.station], { icon: icon(r, r.station === selected) })
        .on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          pick(r.station);
        })
        .bindTooltip(r.station)
        .addTo(layer.current);
    }
  });

  return (
    <div>
      <div ref={box} style={{ height: 380, borderRadius: 8, marginBottom: 10 }} />
      {current ? (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginBottom: 10 }}>
          <b style={{ fontSize: 16 }}>{current.station}</b>{" "}
          <small>{current.time} 기준</small>
          <div style={{ marginTop: 6 }}>
            PM10 <b>{current.pm10 ?? "-"}</b> ㎍/㎥{" "}
            <span style={{ color: COLOR[current.pm10_grade] }}>{current.pm10_grade ?? ""}</span>
            {" · "}
            PM2.5 <b>{current.pm25 ?? "-"}</b> ㎍/㎥{" "}
            <span style={{ color: COLOR[current.pm25_grade] }}>{current.pm25_grade ?? ""}</span>
          </div>
        </div>
      ) : (
        <p style={{ color: "#666" }}>지도에서 지역(마커)을 눌러 보세요.</p>
      )}
      {unplaced.length > 0 && (
        <p style={{ fontSize: 13, color: "#666" }}>
          지도에 표시되지 않은 측정소(좌표 없음):{" "}
          {unplaced.map((r) => (
            <button key={r.station} onClick={() => pick(r.station)} style={{ marginRight: 4 }}>
              {r.station}
            </button>
          ))}
        </p>
      )}
    </div>
  );
}
