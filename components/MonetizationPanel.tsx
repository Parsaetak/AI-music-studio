import React, { useState } from 'react';
import { generateMonetizationPlan } from '../services/geminiService';
import { DollarSign, Lightbulb } from 'lucide-react';
import { formatAIResponse } from '../utils/text';
import Button from './ui/Button';
import Card from './ui/Card';
import Spinner from './ui/Spinner';
import DownloadButton from './ui/DownloadButton';
import FileUpload from './ui/FileUpload';

interface MonetizationPanelProps {
  projectTitle: string;
}

const MonetizationPanel: React.FC<MonetizationPanelProps> = ({ projectTitle }) => {
  const [songDescription, setSongDescription] = useState('');
  const [plan, setPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [songFile, setSongFile] = useState<{file: File, url: string} | null>(null);
  const [artFile, setArtFile] = useState<{file: File, url: string} | null>(null);
  const [videoFile, setVideoFile] = useState<{file: File, url: string} | null>(null);

  const handleFileSelect = (file: File, type: 'song' | 'art' | 'video') => {
      const url = URL.createObjectURL(file);
      if (type === 'song') setSongFile({ file, url });
      if (type === 'art') setArtFile({ file, url });
      if (type === 'video') setVideoFile({ file, url });
  }

  const handleGeneratePlan = async () => {
    let finalDescription = songDescription;
    
    if (songFile || artFile || videoFile) {
        finalDescription += "\n\n**Artist has provided the following final assets for the project:**\n";
        if (songFile) finalDescription += "- Final audio track\n";
        if (artFile) finalDescription += "- Official cover art\n";
        if (videoFile) finalDescription += "- Official music video\n";
    }

    if (!finalDescription.trim()) return;
    setIsLoading(true);
    setPlan(null);
    try {
      const generatedPlan = await generateMonetizationPlan(finalDescription);
      setPlan(formatAIResponse(generatedPlan));
    } catch (error) {
      console.error("Failed to generate monetization plan:", error);
      setPlan("Sorry, I couldn't generate a plan. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6 h-full">
      <Card className="flex flex-col">
        <div className="text-center mb-4">
            <DollarSign className="h-12 w-12 mx-auto rainbow-text mb-2" />
            <h2 className="text-2xl font-bold">Monetization & Promotion Hub</h2>
            <p className="text-gray-400">Upload your final assets to get a custom marketing strategy.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
                <FileUpload onFileSelect={(file) => handleFileSelect(file, 'song')} accept="audio/*" label="Final Song" />
                {songFile && <audio controls src={songFile.url} className="w-full mt-2"></audio>}
            </div>
            <div>
                <FileUpload onFileSelect={(file) => handleFileSelect(file, 'art')} accept="image/*" label="Cover Art" />
                {artFile && <img src={artFile.url} className="w-full rounded-md mt-2" />}
            </div>
             <div>
                <FileUpload onFileSelect={(file) => handleFileSelect(file, 'video')} accept="video/*" label="Music Video" />
                {videoFile && <video controls src={videoFile.url} className="w-full rounded-md mt-2"></video>}
            </div>
        </div>
        
        <label htmlFor="song-description" className="block text-sm font-medium text-gray-300 mb-2">
          Describe your project (genre, mood, themes, target audience, etc.)
        </label>
        <textarea
          id="song-description"
          value={songDescription}
          onChange={(e) => setSongDescription(e.target.value)}
          placeholder="e.g., An upbeat synth-pop track about summer nights, aimed at fans of 80s retro music..."
          className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg p-3 resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none mb-4"
          rows={5}
          disabled={isLoading}
        />
        <div className="flex gap-2 mt-auto">
            <Button onClick={handleGeneratePlan} isLoading={isLoading} disabled={!songDescription.trim()} className="flex-1 py-3">
              <Lightbulb className="w-5 h-5 mr-2" /> Generate Plan
            </Button>
            <DownloadButton data={plan} filename={`${projectTitle}-monetization-plan.txt`} />
        </div>
      </Card>
      
      <Card className="flex flex-col">
        <h3 className="text-xl font-bold mb-4 text-purple-300">Your Custom Strategy</h3>
        <div className="flex-1 bg-gray-900/50 rounded-lg p-4 overflow-y-auto border border-gray-700">
          {isLoading ? (
            <Spinner />
          ) : plan ? (
            <p className="whitespace-pre-wrap text-sm">{plan}</p>
          ) : (
            <div className="text-center text-gray-500 h-full flex flex-col justify-center items-center">
                <DollarSign className="w-16 h-16 mb-4" />
                <p>Your promotion plan will appear here.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default MonetizationPanel;
