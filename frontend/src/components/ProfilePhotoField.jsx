import React, { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Upload, User, X } from "lucide-react";
import { toast } from "sonner";
import { fileToBase64 } from "@/lib/utils-app";

export default function ProfilePhotoField({ value, onChange }) {
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => setHasCamera(devices.some((d) => d.kind === "videoinput")))
      .catch(() => setHasCamera(false));
  }, []);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks?.().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  useEffect(() => () => stopStream(), [stopStream]);

  const openCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Este navegador no permite usar la cámara");
      return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = media;
      setStream(media);
      setCameraOpen(true);
    } catch {
      toast.error("No se pudo acceder a la cámara. Revisa permisos del navegador.");
    }
  };

  useEffect(() => {
    if (cameraOpen && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [cameraOpen, stream]);

  const closeCamera = () => {
    stopStream();
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      toast.error("Espera a que la cámara esté lista");
      return;
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
    onChange(dataUrl);
    toast.success("Foto capturada");
    closeCamera();
  };

  const onFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Selecciona una imagen");
      return;
    }
    onChange(await fileToBase64(file));
  };

  return (
    <>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="h-20 w-20 rounded-full overflow-hidden bg-white/5 grid place-items-center shrink-0">
          {value ? (
            <img src={value} alt="Foto de perfil" className="h-full w-full object-cover" />
          ) : (
            <User className="text-white/30" size={32} />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="btn-outline text-xs py-2 cursor-pointer">
            <Upload size={12} /> Subir foto
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          {hasCamera && (
            <button type="button" onClick={openCamera} className="btn-outline text-xs py-2">
              <Camera size={12} /> Tomar foto
            </button>
          )}
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="btn-outline text-xs py-2 text-red-400 border-red-400/30"
            >
              Quitar
            </button>
          )}
        </div>
      </div>

      {cameraOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={closeCamera}
        >
          <div
            className="glass-strong max-w-lg w-full rounded-sm p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-display text-xl text-white">Tomar foto de perfil</span>
              <button type="button" onClick={closeCamera} className="text-white/50 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="relative aspect-[4/3] bg-black rounded-sm overflow-hidden">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={closeCamera} className="btn-outline text-sm py-2">
                Cancelar
              </button>
              <button type="button" onClick={capturePhoto} className="btn-primary text-sm py-2">
                <Camera size={14} /> Capturar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
