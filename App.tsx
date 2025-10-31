
import React, { useState, useEffect } from 'react';
import { BrainCircuit, Clapperboard, DollarSign, MicVocal, Music, Palette, Wand2, FileAudio } from 'lucide-react';

import ChatPanel from './components/ChatPanel';
import VocalStudio from './components/VocalStudio';
import ArtGenerator from './components/ArtGenerator';
import VideoStudio from './components/VideoStudio';
import WizardPanel from './components/WizardPanel';
import MonetizationPanel from './components/MonetizationPanel';
import TranscriptionPanel from './components/TranscriptionPanel';
import ApiKeySelector from './components/ApiKeySelector';
import Card from './components/ui/Card';
import Spinner from './components/ui/Spinner';

type Tab = 'wizard' | 'chat' | 'vocals' | 'art' | 'video' | 'monetization' | 'transcription';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('wizard');
  
  // State for all generated assets
  const [projectTitle, setProjectTitle] = useState('My AI Project');
  const [lyricsContent, setLyricsContent] = useState<string | null>(null);

  const [isApiKeyReady, setIsApiKeyReady] = useState(false);
  const [isCheckingApiKey, setIsCheckingApiKey] = useState(true);

  useEffect(() => {
    const checkKey = async () => {
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            setIsApiKeyReady(hasKey);
        }
        setIsCheckingApiKey(false);
    };
    checkKey();
  }, []);
  
  const renderContent = () => {
    switch (activeTab) {
      case 'wizard':
        return <WizardPanel projectTitle={projectTitle} />;
      case 'chat':
        return <ChatPanel onLyricsGenerated={setLyricsContent} projectTitle={projectTitle} />;
      case 'vocals':
        return <VocalStudio onAudioGenerated={() => {}} projectTitle={projectTitle} />;
      case 'art':
        return <ArtGenerator onImageGenerated={() => {}} projectTitle={projectTitle} />;
      case 'video':
        return <VideoStudio onVideoGenerated={() => {}} projectTitle={projectTitle} lyricsContent={lyricsContent} />;
      case 'monetization':
        return <MonetizationPanel projectTitle={projectTitle} />;
      case 'transcription':
          return <TranscriptionPanel projectTitle={projectTitle} />;
      default:
        return null;
    }
  };

  const TabButton = ({ tab, label, icon: Icon }: { tab: Tab; label:string; icon: React.ElementType }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex-1 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 px-3 py-3 font-bold transition-all duration-300 rounded-lg text-sm relative overflow-hidden group ${
        activeTab === tab 
          ? 'rainbow-bg text-white shadow-lg shadow-purple-500/20' 
          : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/70 hover:text-white'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  if (isCheckingApiKey) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0D0D1A]">
        <Spinner />
      </div>
    );
  }

  if (!isApiKeyReady) {
    return (
      <div className="min-h-screen bg-[#0D0D1A] text-gray-200 font-sans flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 mb-6">
            <Music className="w-10 h-10 rainbow-text" style={{animation: 'glow 3s infinite alternate'}}/>
            <h1 className="text-3xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-gray-200 to-gray-500">AI Music Studio Pro</h1>
        </div>
        <Card className="max-w-lg w-full">
            <ApiKeySelector onKeySelected={() => setIsApiKeyReady(true)} />
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0D1A] text-gray-200 font-sans flex flex-col">
      <header className="bg-black/20 backdrop-blur-xl sticky top-0 z-20 p-4 border-b-2 border-transparent holographic-border">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Music className="w-8 h-8 rainbow-text" style={{animation: 'glow 3s infinite alternate'}}/>
            <h1 className="text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-gray-200 to-gray-500">AI Music Studio Pro</h1>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <input 
              type="text"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="Project Title"
              className="bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-sm w-full sm:w-48 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
            />
          </div>
        </div>
      </header>
      
      <main className="flex-grow container mx-auto p-4 flex flex-col">
        <div className="w-full mb-6">
          <nav className="grid grid-cols-2 sm:grid-cols-7 gap-2 sm:gap-4 p-2 bg-black/20 rounded-xl holographic-border">
            <TabButton tab="wizard" label="Wizard" icon={Wand2} />
            <TabButton tab="chat" label="Songwriting" icon={BrainCircuit} />
            <TabButton tab="vocals" label="Vocals" icon={MicVocal} />
            <TabButton tab="transcription" label="Transcribe" icon={FileAudio} />
            <TabButton tab="art" label="Art" icon={Palette} />
            <TabButton tab="video" label="Video" icon={Clapperboard} />
            <TabButton tab="monetization" label="Monetize" icon={DollarSign} />
          </nav>
        </div>
        
        <div className="flex-grow">
          {renderContent()}
        </div>
      </main>

      <footer className="w-full bg-black/20 p-4 border-t-2 border-transparent holographic-border mt-auto">
        <div className="container mx-auto text-center text-gray-500 text-sm space-y-2">
            <div>
                Developed by <a href="https://linktr.ee/Parsaetak" target="_blank" rel="noopener noreferrer" className="font-bold text-purple-400 hover:underline">Parsa Tak</a>
                <span className="mx-2">|</span>
                <a href="mailto:parsaetak@gmail.com" className="text-purple-400 hover:underline">parsaetak@gmail.com</a>
            </div>
            <p className="text-xs">
                © {new Date().getFullYear()} Parsa Tak. This application is free to use and distribute with attribution.
            </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
