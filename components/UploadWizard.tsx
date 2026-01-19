import React, { useState, useRef } from 'react';
import { UploadCloud, FileSpreadsheet, Image as ImageIcon, Loader2 } from 'lucide-react';
import { FileUploadState } from '../types';

interface UploadWizardProps {
  onProcess: (files: FileUploadState) => void;
  isProcessing: boolean;
}

export const UploadWizard: React.FC<UploadWizardProps> = ({ onProcess, isProcessing }) => {
  const [files, setFiles] = useState<FileUploadState>({ imageFile: null, inventoryFile: null });
  const [dragActive, setDragActive] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      // Simple heuristic: if it's an image, set image; if csv/xlsx, set inventory
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setFiles(prev => ({ ...prev, imageFile: file }));
      } else if (file.name.endsWith('.csv') || file.name.endsWith('.xlsx')) {
        setFiles(prev => ({ ...prev, inventoryFile: file }));
      }
    }
  };

  const isReady = files.imageFile && files.inventoryFile;

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Create New Inventory Dashboard</h1>
        <p className="text-slate-500">Upload your plot layout image and inventory data to generate an interactive map.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Image Upload */}
        <div 
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer
            ${files.imageFile ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}`}
          onClick={() => imageInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={imageInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={(e) => e.target.files && setFiles(prev => ({ ...prev, imageFile: e.target.files![0] }))}
          />
          {files.imageFile ? (
            <>
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <ImageIcon size={32} />
              </div>
              <p className="font-semibold text-slate-700 break-all">{files.imageFile.name}</p>
              <p className="text-xs text-blue-600 mt-2">Click to replace</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                <ImageIcon size={32} />
              </div>
              <p className="font-semibold text-slate-700">Upload Layout</p>
              <p className="text-xs text-slate-500 mt-1">PNG, JPG, SVG</p>
            </>
          )}
        </div>

        {/* CSV Upload */}
        <div 
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer
            ${files.inventoryFile ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}`}
          onClick={() => csvInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={csvInputRef} 
            className="hidden" 
            accept=".csv"
            onChange={(e) => e.target.files && setFiles(prev => ({ ...prev, inventoryFile: e.target.files![0] }))}
          />
           {files.inventoryFile ? (
            <>
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <FileSpreadsheet size={32} />
              </div>
              <p className="font-semibold text-slate-700 break-all">{files.inventoryFile.name}</p>
              <p className="text-xs text-green-600 mt-2">Click to replace</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-4">
                <FileSpreadsheet size={32} />
              </div>
              <p className="font-semibold text-slate-700">Upload Inventory</p>
              <p className="text-xs text-slate-500 mt-1">CSV Format</p>
            </>
          )}
        </div>
      </div>

      {/* Action Area */}
      <div className="mt-10 flex flex-col items-center">
        <button 
          onClick={() => isReady && onProcess(files)}
          disabled={!isReady || isProcessing}
          className={`
            flex items-center gap-3 px-8 py-4 rounded-lg font-bold text-lg shadow-lg transition-all
            ${isReady && !isProcessing
              ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
          `}
        >
          {isProcessing ? (
            <>
              <Loader2 className="animate-spin" /> Processing AI Analysis...
            </>
          ) : (
            <>
              <UploadCloud /> Generate Dashboard
            </>
          )}
        </button>
        <p className="text-xs text-slate-400 mt-4 text-center max-w-md">
          The system will analyze the image using Gemini AI to detect plot boundaries and map them to your inventory file automatically.
        </p>
      </div>
    </div>
  );
};
