import React from 'react';
import { X } from 'lucide-react';

export default function Lightbox({ image, onClose }) {
  if (!image) return null;
  
  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 cursor-zoom-out" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white/75 hover:text-white p-2 transition-colors" onClick={onClose}>
        <X className="w-6 h-6" />
      </button>
      <img
        src={image}
        alt="Foto ampliada"
        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}
