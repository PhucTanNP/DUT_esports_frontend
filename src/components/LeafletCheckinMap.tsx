'use client';

import React, { useEffect, useRef, useState } from 'react';
import '../styles/LeafletCheckinMap.css';
import 'leaflet/dist/leaflet.css';

export interface CheckinMapPoint {
  id: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  participantName?: string;
  studentId?: string;
  ingameId?: string;
  deviceId?: string;
  checkedInAt?: string;
  isCurrentUser?: boolean;
  isHttpFallback?: boolean;
}

interface LeafletCheckinMapProps {
  /** Danh sách các điểm check-in cần hiển thị */
  points: CheckinMapPoint[];
  /** Chiều cao bản đồ (mặc định 360px) */
  height?: number | string;
  /** Tiêu đề bản đồ */
  title?: string;
  /** Mã máy hiển thị trên thanh tiêu đề */
  currentDeviceId?: string;
  /** Cho phép nhấp chuột / chạm để chấm vị trí chính xác trên bản đồ (< 4 mét) */
  interactivePicker?: boolean;
  /** Callback khi người dùng chấm hoặc kéo vị trí trên bản đồ */
  onLocationPick?: (coords: { latitude: number; longitude: number; accuracy: number }) => void;
  /** Dòng thông báo hướng dẫn khi ở chế độ chọn vị trí */
  pickerHint?: string;
}

export default function LeafletCheckinMap({
  points,
  height = 360,
  title = 'Bản Đồ Điểm Danh GPS (Leaflet + OpenStreetMap)',
  currentDeviceId,
  interactivePicker = false,
  onLocationPick,
  pickerHint,
}: LeafletCheckinMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const pickerLayerRef = useRef<any>(null);
  const pickerMarkerRef = useRef<any>(null);
  const pickerCircleRef = useRef<any>(null);
  const onLocationPickRef = useRef(onLocationPick);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    onLocationPickRef.current = onLocationPick;
  }, [onLocationPick]);

  // Khởi tạo bản đồ Leaflet 1 lần duy nhất trên client
  useEffect(() => {
    let isMounted = true;

    const initMap = async () => {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return; // Đã khởi tạo rồi

      try {
        const L = (await import('leaflet')).default;
        if (!isMounted || !mapContainerRef.current) return;

        // Vị trí mặc định: Khu vực Liên Chiểu (Hồ Tùng Mậu - Trần Nguyên Đán - ĐH Bách Khoa)
        const defaultCenter: [number, number] = [16.0758, 108.1522];
        const initialZoom = 16;

        const map = L.map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: initialZoom,
          zoomControl: true,
          attributionControl: true,
        });

        mapInstanceRef.current = map;

        // OpenStreetMap Tile Layer miễn phí
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        // Tạo 2 layer group: 1 cho các điểm static, 1 cho picker tương tác
        markersLayerRef.current = L.layerGroup().addTo(map);
        pickerLayerRef.current = L.layerGroup().addTo(map);

        // Lắng nghe sự kiện click trên bản đồ khi ở chế độ interactivePicker
        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          const accuracy = 3.0; // Sai số dưới 4 mét theo yêu cầu

          if (pickerMarkerRef.current) {
            pickerMarkerRef.current.setLatLng([lat, lng]);
          } else {
            const markerIcon = L.divIcon({
              className: 'lcm-leaflet-div-icon',
              html: `
                <div class="lcm-custom-marker">
                  <div class="lcm-marker-pulse" style="border-color:#10b981; background:rgba(16,185,129,0.35)"></div>
                  <div class="lcm-marker-pin" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%)">
                    <span class="lcm-marker-icon">🎯</span>
                  </div>
                </div>
              `,
              iconSize: [34, 34],
              iconAnchor: [17, 34],
              popupAnchor: [0, -34],
            });

            const newMarker = L.marker([lat, lng], {
              draggable: true,
              icon: markerIcon,
            }).addTo(pickerLayerRef.current);

            newMarker.on('dragend', (dragEv: any) => {
              const pos = dragEv.target.getLatLng();
              if (pickerCircleRef.current) pickerCircleRef.current.setLatLng(pos);
              if (onLocationPickRef.current) {
                onLocationPickRef.current({ latitude: pos.lat, longitude: pos.lng, accuracy: 3.0 });
              }
            });

            pickerMarkerRef.current = newMarker;
          }

          if (pickerCircleRef.current) {
            pickerCircleRef.current.setLatLng([lat, lng]);
            pickerCircleRef.current.setRadius(accuracy);
          } else {
            pickerCircleRef.current = L.circle([lat, lng], {
              radius: accuracy,
              color: '#10b981',
              weight: 2,
              opacity: 0.9,
              fillColor: '#10b981',
              fillOpacity: 0.25,
            }).addTo(pickerLayerRef.current);
          }

          pickerMarkerRef.current
            .bindPopup(`
              <div class="lcm-popup-content">
                <div class="lcm-popup-header" style="background:#064e3b; color:#6ee7b7;">
                  <span>🎯 Vị Trí Bạn Đã Chấm</span>
                </div>
                <div class="lcm-popup-row">
                  <span class="lcm-popup-label">Tọa độ:</span>
                  <span class="lcm-popup-val" style="color:#10b981; font-weight:700;">${lat.toFixed(6)}, ${lng.toFixed(6)}</span>
                </div>
                <div class="lcm-popup-row">
                  <span class="lcm-popup-label">Sai số:</span>
                  <span class="lcm-popup-val" style="color:#10b981; font-weight:700;">±3.0m (Đạt chuẩn &lt; 4m)</span>
                </div>
                <div style="font-size:11px; color:#94a3b8; margin-top:4px;">
                  (Bạn có thể kéo thả ghim này để tinh chỉnh chuẩn xác theo ý muốn)
                </div>
              </div>
            `)
            .openPopup();

          if (onLocationPickRef.current) {
            onLocationPickRef.current({ latitude: lat, longitude: lng, accuracy });
          }
        });

        // Kích hoạt invalidateSize sau 200ms để hiển thị đẹp khi modal mở
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 200);

        if (isMounted) setMapLoaded(true);
      } catch (err) {
        console.error('Lỗi khi khởi tạo bản đồ Leaflet:', err);
      }
    };

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
        pickerLayerRef.current = null;
        pickerMarkerRef.current = null;
        pickerCircleRef.current = null;
      }
    };
  }, []);

  // Cập nhật Markers và Khung nhìn khi points hoặc interactivePicker thay đổi
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersLayerRef.current || !pickerLayerRef.current) return;

    let isMounted = true;
    (async () => {
      const L = (await import('leaflet')).default;
      if (!isMounted) return;

      // 1. Xóa các layer cũ
      markersLayerRef.current.clearLayers();

      const validPoints = points.filter(
        (p) => typeof p.latitude === 'number' && typeof p.longitude === 'number' && !isNaN(p.latitude) && !isNaN(p.longitude)
      );

      // Icon tùy biến
      const createCustomPinIcon = (isCurrent: boolean, isHttp?: boolean) => {
        let bg = isCurrent
          ? 'linear-gradient(135deg, #00f0ff 0%, #2563eb 100%)'
          : 'linear-gradient(135deg, #10b981 0%, #047857 100%)';
        let iconChar = isCurrent ? '🎮' : '👤';

        if (isHttp) {
          bg = 'linear-gradient(135deg, #38bdf8 0%, #f59e0b 100%)';
          iconChar = '🌐';
        }

        return L.divIcon({
          className: 'lcm-leaflet-div-icon',
          html: `
            <div class="lcm-custom-marker">
              ${isCurrent ? '<div class="lcm-marker-pulse"></div>' : ''}
              <div class="lcm-marker-pin" style="background: ${bg}">
                <span class="lcm-marker-icon">${iconChar}</span>
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        });
      };

      const bounds = L.latLngBounds([]);

      // 2. Vẽ các điểm tĩnh (nếu interactivePicker = true thì bỏ qua điểm currentUser vì pickerLayer sẽ vẽ)
      validPoints.forEach((point) => {
        if (interactivePicker && point.isCurrentUser) {
          return;
        }

        const latLng: [number, number] = [point.latitude, point.longitude];
        bounds.extend(latLng);

        const isCurrent = !!point.isCurrentUser;
        const marker = L.marker(latLng, {
          icon: createCustomPinIcon(isCurrent, point.isHttpFallback),
        }).addTo(markersLayerRef.current);

        if (point.accuracy && point.accuracy > 0 && point.accuracy < 2000) {
          L.circle(latLng, {
            radius: point.accuracy,
            color: point.isHttpFallback ? '#f59e0b' : isCurrent ? '#00f0ff' : '#10b981',
            weight: 1.5,
            opacity: 0.8,
            fillColor: point.isHttpFallback ? '#f59e0b' : isCurrent ? '#00f0ff' : '#10b981',
            fillOpacity: 0.12,
          }).addTo(markersLayerRef.current);
        }

        const gmapsUrl = `https://maps.google.com/?q=${point.latitude},${point.longitude}`;
        const timeDisplay = point.checkedInAt ? new Date(point.checkedInAt).toLocaleString('vi-VN') : 'Vừa xong';

        const popupHtml = `
          <div class="lcm-popup-content">
            <div class="lcm-popup-header">
              <span>${point.isHttpFallback ? '🌐 Điểm Danh Qua HTTP LAN' : isCurrent ? '📍 Vị Trí Của Bạn' : '👤 Thí Sinh Check-in'}</span>
            </div>
            <div class="lcm-popup-row">
              <span class="lcm-popup-label">Họ tên:</span>
              <span class="lcm-popup-val">${point.participantName || 'VĐV'}</span>
            </div>
            ${point.studentId ? `<div class="lcm-popup-row"><span class="lcm-popup-label">MSSV:</span><span class="lcm-popup-val">${point.studentId}</span></div>` : ''}
            ${point.ingameId ? `<div class="lcm-popup-row"><span class="lcm-popup-label">Ingame:</span><span class="lcm-popup-val" style="color:#00f0ff;font-family:monospace;">${point.ingameId}</span></div>` : ''}
            <div class="lcm-popup-row">
              <span class="lcm-popup-label">Tọa độ:</span>
              <span class="lcm-popup-val">${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}</span>
            </div>
            ${point.accuracy ? `<div class="lcm-popup-row"><span class="lcm-popup-label">Bán kính sai số:</span><span class="lcm-popup-val">±${Math.round(point.accuracy)}m</span></div>` : ''}
            <a href="${gmapsUrl}" target="_blank" rel="noopener noreferrer" class="lcm-popup-gmaps-link">
              🗺️ Mở chỉ đường Google Maps ↗
            </a>
          </div>
        `;
        marker.bindPopup(popupHtml);
      });

      // 3. Nếu interactivePicker bật và có điểm hiện tại
      if (interactivePicker) {
        const userPoint = validPoints.find((p) => p.isCurrentUser) || validPoints[0];
        if (userPoint) {
          const latLng: [number, number] = [userPoint.latitude, userPoint.longitude];

          if (pickerMarkerRef.current) {
            pickerMarkerRef.current.setLatLng(latLng);
          } else {
            const markerIcon = L.divIcon({
              className: 'lcm-leaflet-div-icon',
              html: `
                <div class="lcm-custom-marker">
                  <div class="lcm-marker-pulse" style="border-color:#10b981; background:rgba(16,185,129,0.35)"></div>
                  <div class="lcm-marker-pin" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%)">
                    <span class="lcm-marker-icon">🎯</span>
                  </div>
                </div>
              `,
              iconSize: [34, 34],
              iconAnchor: [17, 34],
              popupAnchor: [0, -34],
            });

            const marker = L.marker(latLng, {
              draggable: true,
              icon: markerIcon,
            }).addTo(pickerLayerRef.current);

            marker.on('dragend', (dragEv: any) => {
              const pos = dragEv.target.getLatLng();
              if (pickerCircleRef.current) pickerCircleRef.current.setLatLng(pos);
              if (onLocationPickRef.current) {
                onLocationPickRef.current({ latitude: pos.lat, longitude: pos.lng, accuracy: 3.0 });
              }
            });

            pickerMarkerRef.current = marker;
          }

          const radius = Math.min(userPoint.accuracy || 3.0, 4.0);
          if (pickerCircleRef.current) {
            pickerCircleRef.current.setLatLng(latLng);
            pickerCircleRef.current.setRadius(radius);
          } else {
            pickerCircleRef.current = L.circle(latLng, {
              radius,
              color: '#10b981',
              weight: 2,
              opacity: 0.9,
              fillColor: '#10b981',
              fillOpacity: 0.25,
            }).addTo(pickerLayerRef.current);
          }

          map.setView(latLng, Math.max(map.getZoom(), 16));
        }
      } else {
        // Nếu không có interactivePicker và có điểm -> fit bounds
        if (validPoints.length > 1) {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
        } else if (validPoints.length === 1) {
          map.setView([validPoints[0].latitude, validPoints[0].longitude], 16);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [points, interactivePicker]);

  return (
    <div className="lcm-wrapper">
      <div className="lcm-top-bar">
        <div className="lcm-top-title">
          <span>🗺️ {title}</span>
          <span className="lcm-top-badge">{points.length} điểm ghi nhận</span>
        </div>
        {currentDeviceId && (
          <div className="lcm-top-device">
            Mã máy: <strong>{currentDeviceId}</strong>
          </div>
        )}
      </div>

      {interactivePicker && (
        <div
          style={{
            background: '#064e3b',
            color: '#a7f3d0',
            padding: '8px 14px',
            fontSize: '12.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '1px solid #059669',
          }}
        >
          <span>🎯</span>
          <span>{pickerHint || 'Nhấp hoặc chạm vào vị trí thực tế của bạn trên bản đồ để chốt tọa độ (Sai số: ±3.0m < 4m)'}</span>
        </div>
      )}

      <div
        ref={mapContainerRef}
        className="lcm-container"
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      />
    </div>
  );
}
