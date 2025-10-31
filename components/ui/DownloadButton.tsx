
import React from 'react';
import { Download } from 'lucide-react';
import Button from './Button';

interface DownloadButtonProps {
  data: string | Blob | null;
  filename: string;
  className?: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({ data, filename, className, variant = 'secondary', disabled = false }) => {
  
  const handleDownload = () => {
    if (!data) return;
    
    const url = typeof data === 'string'
      ? data.startsWith('data:') ? data : URL.createObjectURL(new Blob([data], { type: 'text/plain' }))
      : URL.createObjectURL(data);
      
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    if (!url.startsWith('data:')) {
        URL.revokeObjectURL(url);
    }
  };

  return (
    <Button onClick={handleDownload} variant={variant} className={className} disabled={disabled || !data}>
      <Download className="w-4 h-4 mr-2" />
      Download
    </Button>
  );
};

export default DownloadButton;
