'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import '../../styles/admin/BannerCropModal.css';

interface BannerCropModalProps {
  imageSrc: string;
  fileName?: string;
  onApply: (file: File) => Promise<void> | void;
  onClose: () => void;
}

const VIEWPORT_WIDTH = 640;
const VIEWPORT_HEIGHT = 360; // 16:9 aspect ratio
const OUTPUT_WIDTH = 1920;
const OUTPUT_HEIGHT = 1080;

export default function BannerCropModal({
  imageSrc,
  fileName = 'banner.jpg',
  onApply,
  onClose,
}: BannerCropModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialOffset, setInitialOffset] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [processing, setProcessing] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Kích thước hiệu dụng khi xoay 90 hoặc 270 độ
  const isRotated = rotation === 90 || rotation === 270;
  const effectiveWidth = isRotated ? naturalSize.height : naturalSize.width;
  const effectiveHeight = isRotated ? naturalSize.width : naturalSize.height;

  // Tính scale bao phủ (cover): ảnh tự động phóng to/thu nhỏ vừa khít 16:9
  const baseCoverScale = effectiveWidth && effectiveHeight
    ? Math.max(VIEWPORT_WIDTH / effectiveWidth, VIEWPORT_HEIGHT / effectiveHeight)
    : 1;

  // Tính scale vừa vặn (fit): ảnh lọt hoàn toàn trong khung 16:9
  const baseFitScale = effectiveWidth && effectiveHeight
    ? Math.min(VIEWPORT_WIDTH / effectiveWidth, VIEWPORT_HEIGHT / effectiveHeight)
    : 1;

  const currentScale = baseCoverScale * zoom;

  // Khởi tạo kích thước ảnh & tự động căn giữa hoàn hảo
  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setImgLoaded(true);
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  // Giới hạn offset kéo (clamp pan) để hình không bị văng ra khỏi tầm nhìn
  const maxOffsetX = Math.max(VIEWPORT_WIDTH * 0.5, (effectiveWidth * currentScale) / 2);
  const maxOffsetY = Math.max(VIEWPORT_HEIGHT * 0.5, (effectiveHeight * currentScale) / 2);

  const clampOffset = useCallback(
    (x: number, y: number) => {
      return {
        x: Math.max(-maxOffsetX, Math.min(maxOffsetX, x)),
        y: Math.max(-maxOffsetY, Math.min(maxOffsetY, y)),
      };
    },
    [maxOffsetX, maxOffsetY],
  );

  // Cập nhật lại offset nếu zoom thay đổi
  useEffect(() => {
    setOffset((prev) => clampOffset(prev.x, prev.y));
  }, [clampOffset]);

  // Xử lý kéo bằng chuột
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialOffset(offset);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setOffset(clampOffset(initialOffset.x + dx, initialOffset.y + dy));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Xử lý kéo bằng cảm ứng (touch)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setInitialOffset(offset);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.x;
    const dy = e.touches[0].clientY - dragStart.y;
    setOffset(clampOffset(initialOffset.x + dx, initialOffset.y + dy));
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Zoom bằng lăn chuột
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(3, Math.max(0.5, +(prev + delta).toFixed(2))));
  };

  // Xoay ảnh 90 độ
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    setOffset({ x: 0, y: 0 });
  };

  // Đặt lại căn giữa
  const handleCenter = () => {
    setOffset({ x: 0, y: 0 });
  };

  // Chế độ lấp đầy (Cover)
  const handleCoverMode = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // Chế độ vừa vặn (Fit)
  const handleFitMode = () => {
    if (!effectiveWidth || !effectiveHeight) return;
    const ratio = +(baseFitScale / baseCoverScale).toFixed(2);
    setZoom(Math.max(0.5, ratio));
    setOffset({ x: 0, y: 0 });
  };

  // Xuất ảnh ra canvas chất lượng cao 1920x1080
  const handleExport = async () => {
    if (!imgRef.current) return;
    try {
      setProcessing(true);
      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_WIDTH;
      canvas.height = OUTPUT_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Không thể khởi tạo Canvas Context');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 1. Vẽ nền mờ nghệ thuật (Blurred Backdrop) để che khoảng trống nếu ảnh thu nhỏ
      ctx.save();
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
      ctx.filter = 'blur(40px) brightness(0.4)';
      ctx.drawImage(imgRef.current, -80, -80, OUTPUT_WIDTH + 160, OUTPUT_HEIGHT + 160);
      ctx.restore();

      const multiplier = OUTPUT_WIDTH / VIEWPORT_WIDTH;

      // 2. Vẽ ảnh chính sắc nét ở trung tâm
      ctx.save();
      ctx.translate(
        OUTPUT_WIDTH / 2 + offset.x * multiplier,
        OUTPUT_HEIGHT / 2 + offset.y * multiplier,
      );

      // Xoay
      ctx.rotate((rotation * Math.PI) / 180);

      // Kích thước vẽ ảnh
      const drawWidth = naturalSize.width * currentScale * multiplier;
      const drawHeight = naturalSize.height * currentScale * multiplier;

      ctx.drawImage(
        imgRef.current,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight,
      );
      ctx.restore();

      // Chuyển sang Blob JPEG chất lượng cao
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            alert('Lỗi tạo file ảnh');
            setProcessing(false);
            return;
          }
          const cleanName = fileName.replace(/\.[^/.]+$/, '') + '-banner.jpg';
          const croppedFile = new File([blob], cleanName, { type: 'image/jpeg' });
          await onApply(croppedFile);
          setProcessing(false);
          onClose();
        },
        'image/jpeg',
        0.92,
      );
    } catch (err) {
      console.error('Crop error:', err);
      alert('Lỗi khi căn chỉnh ảnh: ' + (err as Error).message);
      setProcessing(false);
    }
  };

  const isLowRes =
    naturalSize.width > 0 &&
    (naturalSize.width < 1280 || naturalSize.height < 720);

  return (
    <div className="bcm-overlay" onClick={onClose}>
      <div className="bcm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bcm-header">
          <div className="bcm-header-title">
            <h3>📐 Căn Chỉnh & Cắt Ảnh Banner</h3>
            <span className="bcm-aspect-badge">Chuẩn Esports 16:9</span>
          </div>
          <button className="bcm-btn-close" onClick={onClose} title="Đóng">
            ✕
          </button>
        </div>

        {/* Spec Information Bar */}
        <div className="bcm-spec-bar">
          <div className="bcm-spec-item">
            <span className="bcm-spec-icon">🎯</span>
            <div>
              <strong>Kích thước chuẩn:</strong> 1920 × 1080 px (16:9)
            </div>
          </div>
          <div className="bcm-spec-item">
            <span className="bcm-spec-icon">🖼️</span>
            <div>
              <strong>Ảnh gốc:</strong>{' '}
              {naturalSize.width > 0
                ? `${naturalSize.width} × ${naturalSize.height} px`
                : 'Đang tải...'}
            </div>
          </div>
          <div className="bcm-spec-item">
            <span className="bcm-spec-icon">💡</span>
            <div>Ảnh tự động căn giữa • Kéo để đổi góc • Lăn chuột để phóng to/thu nhỏ</div>
          </div>
        </div>

        {/* Low resolution warning if applicable */}
        {isLowRes && (
          <div className="bcm-warning">
            ⚠️ <strong>Độ phân giải thấp:</strong> Ảnh gốc nhỏ hơn 1280×720px. Hệ thống đã tự động phóng to căn giữa, nhưng bạn nên dùng ảnh từ 1920×1080px để đạt độ nét cao nhất.
          </div>
        )}

        {/* Crop Viewport */}
        <div className="bcm-viewport-container">
          <div
            ref={viewportRef}
            className={`bcm-viewport ${isDragging ? 'dragging' : ''}`}
            style={{ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            {/* Ambient Blurred Backdrop */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt=""
              className="bcm-backdrop"
              draggable={false}
            />

            {/* Target preview image centered exactly at (50%, 50%) */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Banner crop source"
              onLoad={onImageLoad}
              className="bcm-image"
              style={{
                width: naturalSize.width ? `${naturalSize.width}px` : 'auto',
                height: naturalSize.height ? `${naturalSize.height}px` : 'auto',
                maxWidth: 'none',
                maxHeight: 'none',
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${currentScale})`,
                transformOrigin: 'center center',
              }}
              draggable={false}
            />

            {/* Rule of thirds grid */}
            <div className="bcm-grid-overlay">
              <div className="bcm-grid-line bcm-grid-h1" />
              <div className="bcm-grid-line bcm-grid-h2" />
              <div className="bcm-grid-line bcm-grid-v1" />
              <div className="bcm-grid-line bcm-grid-v2" />
            </div>
          </div>
        </div>

        {/* Control Toolbar */}
        <div className="bcm-controls">
          {/* Zoom Control */}
          <div className="bcm-control-group bcm-zoom-group">
            <label className="bcm-control-label">
              🔍 Tỉ lệ hiển thị: <strong>{Math.round(zoom * 100)}%</strong>
            </label>
            <div className="bcm-slider-row">
              <button
                type="button"
                className="bcm-btn-step"
                onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
                disabled={zoom <= 0.5}
                title="Thu nhỏ"
              >
                −
              </button>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="bcm-slider"
              />
              <button
                type="button"
                className="bcm-btn-step"
                onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                disabled={zoom >= 3}
                title="Phóng to"
              >
                +
              </button>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="bcm-btn-group">
            <button
              type="button"
              className="bcm-btn-action"
              onClick={handleCoverMode}
              title="Phóng to lấp đầy khung 16:9"
            >
              ⬛ Lấp đầy
            </button>
            <button
              type="button"
              className="bcm-btn-action"
              onClick={handleFitMode}
              title="Thu vừa vặn toàn bộ ảnh"
            >
              🔲 Vừa vặn
            </button>
            <button
              type="button"
              className="bcm-btn-action"
              onClick={handleCenter}
              title="Đưa về chính giữa khung"
            >
              🎯 Căn giữa
            </button>
            <button
              type="button"
              className="bcm-btn-action"
              onClick={handleRotate}
              title="Xoay 90 độ"
            >
              ↻ Xoay ({rotation}°)
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bcm-footer">
          <button
            type="button"
            className="bcm-btn-cancel"
            onClick={onClose}
            disabled={processing}
          >
            Hủy
          </button>
          <button
            type="button"
            className="bcm-btn-apply"
            onClick={handleExport}
            disabled={!imgLoaded || processing}
          >
            {processing ? '⏳ Đang xử lý & lưu...' : '✂️ Áp Dụng & Tải Lên'}
          </button>
        </div>
      </div>
    </div>
  );
}
