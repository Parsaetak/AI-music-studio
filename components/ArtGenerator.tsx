
import React, { useState, useRef } from 'react';
import { Image, Wand2, Edit, ChevronDown } from 'lucide-react';
import { generateImage, editImage } from '../services/geminiService';
import Button from './ui/Button';
import Card from './ui/Card';
import DownloadButton from './ui/DownloadButton';

const aspectRatios = ["1:1", "16:9", "9:16", "4:3", "3:4"];
const imageStyles = ["Photorealistic", "Anime", "Vaporwave", "Gothic", "Art Deco", "Cyberpunk", "Fantasy", "3D Render", "Pixel Art", "Double Exposure", "Minimalist Line Art"];

interface ArtGeneratorProps {
  onImageGenerated: (url: string | null) => void;
  projectTitle: string;
}

const ArtGenerator: React.FC<ArtGeneratorProps> = ({ onImageGenerated, projectTitle }) => {
  const [prompt, setPrompt] = useState('');
  const [songDescription, setSongDescription] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [originalMimeType, setOriginalMimeType] = useState<string | null>(null);
  const [showProSettings, setShowProSettings] = useState(false);
  const [imageStyle, setImageStyle] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsLoading(true);
    setImageUrl(null);
    onImageGenerated(null);
    try {
      const generatedImg = await generateImage(prompt, negativePrompt, aspectRatio, imageStyle, songDescription);
      setImageUrl(generatedImg);
      onImageGenerated(generatedImg);
      setOriginalImageUrl(generatedImg);
      if (generatedImg) {
          const res = await fetch(generatedImg);
          const blob = await res.blob();
          setOriginalMimeType(blob.type);
      }
    } catch (error) {
      console.error('Image generation failed', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editPrompt.trim() || !originalImageUrl) return;
    setIsEditing(true);
    try {
      const base64Data = originalImageUrl.split(',')[1];
      const editedImg = await editImage(editPrompt, base64Data, originalMimeType || 'image/jpeg');
      setImageUrl(editedImg);
      onImageGenerated(editedImg);
    } catch (error) {
      console.error('Image editing failed', error);
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 h-full">
      <Card className="flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-purple-300">1. Generate Cover Art</h2>
        
        <label htmlFor="song-desc" className="block text-sm font-medium text-gray-300 mb-2">Song Description (Optional)</label>
        <textarea
          id="song-desc"
          value={songDescription}
          onChange={(e) => setSongDescription(e.target.value)}
          placeholder="e.g., A sad song about lost love in a rainy city..."
          className="h-20 bg-gray-900/50 border border-gray-700 rounded-lg p-2 resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none mb-4"
        />

        <label htmlFor="art-prompt" className="block text-sm font-medium text-gray-300 mb-2">Art Prompt</label>
        <textarea
          id="art-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., A neon cat DJing in a retro-futuristic city..."
          className="h-24 bg-gray-900/50 border border-gray-700 rounded-lg p-2 resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none mb-4"
        />
        <div className="mb-4">
             <button onClick={() => setShowProSettings(!showProSettings)} className="flex items-center gap-2 text-sm text-gray-300 mb-2 font-semibold">
                Pro Controls <ChevronDown className={`w-4 h-4 transition-transform ${showProSettings ? 'rotate-180' : ''}`} />
            </button>
            {showProSettings && (
                 <div className="p-4 bg-black/20 rounded-lg animate-fade-in space-y-4 holographic-border">
                    <div>
                        <label htmlFor="image-style" className="block text-sm font-medium text-gray-300 mb-2">Image Style</label>
                         <div className="flex flex-wrap gap-2">
                            {imageStyles.map(style => (
                                <button key={style} onClick={() => setImageStyle(style)} className={`px-3 py-1 text-xs rounded-full ${imageStyle === style ? 'rainbow-bg text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                    {style}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="negative-prompt" className="block text-sm font-medium text-gray-300 mb-2 mt-4">Negative Prompt</label>
                        <input id="negative-prompt" value={negativePrompt} onChange={(e) => setNegativePrompt(e.target.value)} placeholder="e.g., text, watermarks, ugly" className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                    </div>
                </div>
            )}
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
          <div className="flex flex-wrap gap-2">
            {aspectRatios.map(ar => (
              <button key={ar} onClick={() => setAspectRatio(ar)} className={`px-3 py-1 text-sm rounded-full ${aspectRatio === ar ? 'rainbow-bg text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                {ar}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
            <Button onClick={handleGenerate} isLoading={isLoading} className="flex-1">
              <Wand2 className="w-5 h-5 mr-2" /> Generate
            </Button>
            <DownloadButton data={imageUrl} filename={`${projectTitle}-artwork.jpg`} />
        </div>
        
        {imageUrl && (
        <div className="mt-6">
             <h2 className="text-xl font-bold mb-4 text-purple-300">2. Request Revision</h2>
            <textarea
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder="e.g., Add a retro filter, make the sky purple..."
              className="h-20 w-full bg-gray-900/50 border border-gray-700 rounded-lg p-2 resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none mb-4"
            />
            <Button onClick={handleEdit} isLoading={isEditing} className="w-full">
              <Edit className="w-5 h-5 mr-2" /> Apply Revision
            </Button>
        </div>
        )}
      </Card>

      <Card className="flex items-center justify-center">
        {isLoading ? (
          <div className="text-center text-gray-400">
            <Wand2 className="w-12 h-12 mx-auto animate-pulse rainbow-text"/>
            <p className="mt-2">Generating your masterpiece...</p>
          </div>
        ) : imageUrl ? (
          <img src={imageUrl} alt="Generated cover art" className="rounded-lg object-contain max-h-full max-w-full"/>
        ) : (
          <div className="text-center text-gray-500">
            <Image className="w-24 h-24 mx-auto" />
            <p className="mt-2">Your generated art will appear here.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default ArtGenerator;
