import React, { useState } from 'react';
import { Camera, X, Image as ImageIcon } from 'lucide-react';
import imageCompression from 'browser-image-compression';

export default function ImagePicker({ selectedPhotos, setSelectedPhotos }) {
  const [isCompressing, setIsCompressing] = useState(false);

  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length + selectedPhotos.length > 3) {
      alert("Você pode adicionar no máximo 3 fotos por atendimento.");
      return;
    }

    setIsCompressing(true);
    const options = {
      maxSizeMB: 0.12,
      maxWidthOrHeight: 700,
      useWebWorker: true,
    };

    try {
      const compressedList = [];
      for (const file of files) {
        const compressedFile = await imageCompression(file, options);
        const base64 = await convertToBase64(compressedFile);
        compressedList.push(base64);
      }
      setSelectedPhotos(prev => [...prev, ...compressedList]);
    } catch (error) {
      console.error("Erro ao comprimir fotos:", error);
      alert("Erro ao processar as imagens.");
    } finally {
      setIsCompressing(false);
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const removePhoto = (index) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-semibold text-zinc-400 block font-sans">Fotos do Corte (Máx 3)</label>
      
      <div className="flex flex-wrap gap-3">
        {/* Thumbnails */}
        {selectedPhotos.map((photo, index) => (
          <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden border border-barber-border shrink-0 shadow-md">
            <img src={photo} alt={`Upload ${index}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(index)}
              className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        {/* Picker Trigger */}
        {selectedPhotos.length < 3 && (
          <label className="w-20 h-20 bg-barber-dark border border-dashed border-barber-border hover:border-barber-accent hover:bg-zinc-900/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all gap-1 text-zinc-500 hover:text-zinc-300 shrink-0">
            {isCompressing ? (
              <div className="w-4 h-4 border-2 border-barber-accent border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Camera className="w-5 h-5 text-zinc-500" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Anexar</span>
              </>
            )}
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoSelect}
              disabled={isCompressing}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );
}
