
import React, { useState, useCallback } from 'react';
import { UploadCloud, CheckCircle, File as FileIcon } from 'lucide-react';
import Button from './Button';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  label: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, accept, label }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      setSelectedFile(file);
      onFileSelect(file);
    }
  };
  
  const handleGoogleDriveSelect = async () => {
      if (window.aistudio && typeof (window.aistudio as any).selectFile === 'function') {
          try {
              const file = await (window.aistudio as any).selectFile({ accept });
              if (file) {
                  setSelectedFile(file);
                  onFileSelect(file);
              }
          } catch (error) {
              console.error("Error selecting file from Google Drive:", error);
              alert("Could not select file from Google Drive.");
          }
      } else {
          alert("Google Drive integration is not available.");
      }
  };

  const onDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  }, [onFileSelect]);

  return (
    <div>
        <label className="block text-sm font-bold text-purple-300 mb-2">{label}</label>
        <div 
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragEnter={onDragEnter}
            onDragLeave={onDragLeave}
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-300 ${isDragging ? 'border-purple-500 bg-purple-900/20' : 'border-gray-600 hover:border-purple-500'}`}
        >
            <div className="flex flex-col items-center">
                <UploadCloud className="mx-auto h-10 w-10 text-gray-500 mb-2" />
                <p className="text-sm text-gray-400">Drag & drop, or click to browse</p>
                <input 
                    type="file" 
                    accept={accept} 
                    onChange={(e) => handleFileChange(e.target.files)} 
                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" 
                />
            </div>
        </div>
        <div className="mt-2 text-center">
             <Button onClick={handleGoogleDriveSelect} variant="secondary" className="text-xs py-1.5 px-3">
                Select from Google Drive
            </Button>
        </div>
        {selectedFile && (
            <div className="mt-3 p-2 bg-green-900/30 border border-green-700 rounded-lg text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="truncate">{selectedFile.name}</span>
                </div>
                <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-white">&times;</button>
            </div>
        )}
    </div>
  );
};

export default FileUpload;
