
import React, { useState, useRef } from 'react';
import { generateLyricsForWizard, generateSpeech, generateArtConcepts } from '../services/geminiService';
import { Wand2, Music, FileText, CheckCircle, Palette, Volume2 } from 'lucide-react';
import { pcmToWavBlob, decode, decodeAudioData } from '../utils/audio';
import { formatAIResponse } from '../utils/text';
import Button from './ui/Button';
import Card from './ui/Card';
import Spinner from './ui/Spinner';
import DownloadButton from './ui/DownloadButton';

const VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr', 'Aria', 'Leo', 'Nova', 'Orion', 'Lyra'];

interface WizardPanelProps {
  projectTitle: string;
}

const WizardPanel: React.FC<WizardPanelProps> = ({ projectTitle }) => {
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState<string | null>(null);
  const [vocalTrack, setVocalTrack] = useState<{ blob: Blob, url: string } | null>(null);
  const [artConcepts, setArtConcepts] = useState<string | null>(null);
  
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [vocalStyle, setVocalStyle] = useState('');
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [isGeneratingVocals, setIsGeneratingVocals] = useState(false);

  const handleGenerateLyricsAndConcepts = async () => {
    if (!prompt.trim() || isGeneratingLyrics) return;
    setIsGeneratingLyrics(true);
    setLyrics(null);
    setVocalTrack(null);
    setArtConcepts(null);
    try {
      const generatedLyrics = await generateLyricsForWizard(prompt);
      const formattedLyrics = formatAIResponse(generatedLyrics);
      setLyrics(formattedLyrics);

      const generatedConcepts = await generateArtConcepts(formattedLyrics);
      setArtConcepts(formatAIResponse(generatedConcepts));
    } catch (error) {
      console.error("Wizard failed at lyrics/concepts step:", error);
      setLyrics("Sorry, an error occurred while generating lyrics.");
    } finally {
      setIsGeneratingLyrics(false);
    }
  };
  
  const handleGenerateVocalTrack = async () => {
    if (!lyrics || isGeneratingVocals) return;
    setIsGeneratingVocals(true);
    setVocalTrack(null);
    try {
        const base64Audio = await generateSpeech(lyrics, selectedVoice, vocalStyle);
        if (base64Audio) {
            const pcmData = decode(base64Audio);
            const blob = pcmToWavBlob(pcmData);
            setVocalTrack({ blob, url: URL.createObjectURL(blob) });
        }
    } catch (error) {
        console.error("Vocal generation failed:", error);
    } finally {
        setIsGeneratingVocals(false);
    }
  };

  const handlePreviewVoice = async () => {
    if (isPreviewingVoice) return;
    setIsPreviewingVoice(true);
    try {
      const base64Audio = await generateSpeech(`Hello, you are listening to my voice.`, selectedVoice);
      if (base64Audio) {
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const audioCtx = audioContextRef.current;
        const pcmData = decode(base64Audio);
        const audioBuffer = await decodeAudioData(pcmData, audioCtx);
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.start();
      }
    } catch (error) {
      console.error("Failed to preview voice", error);
    } finally {
      setIsPreviewingVoice(false);
    }
  };


  return (
    <Card className="h-full flex flex-col">
      <div className="text-center mb-6">
        <Wand2 className="h-12 w-12 mx-auto rainbow-text mb-2" />
        <h2 className="text-3xl font-bold">Song Creation Wizard</h2>
        <p className="text-gray-400">Your all-in-one hub to create a complete song concept.</p>
      </div>
      
      <div className="grid lg:grid-cols-2 gap-8 flex-1">
        {/* Left Side: Inputs & Controls */}
        <div className="space-y-6 flex flex-col">
          <div>
            <label className="block text-lg font-bold text-purple-300 mb-2">1. Describe Your Song Idea</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A ballad about a robot learning to love, in the style of a sea shanty..."
              className="w-full h-40 bg-gray-900/50 border border-gray-700 rounded-lg p-3 resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none"
              disabled={isGeneratingLyrics}
            />
          </div>
          <Button onClick={handleGenerateLyricsAndConcepts} isLoading={isGeneratingLyrics} disabled={!prompt.trim() || !!lyrics}>
            <FileText className="w-5 h-5 mr-2" />
            Generate Lyrics & Concepts
          </Button>

          {lyrics && (
            <div className="space-y-4 pt-4 border-t-2 border-transparent holographic-border animate-fade-in">
                <h3 className="text-lg font-bold text-purple-300">2. Direct The Vocal Performance</h3>
                <div className="flex items-end gap-2">
                    <div className="flex-grow">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Voice</label>
                        <select value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none">
                            {VOICES.map(voice => <option key={voice} value={voice}>{voice}</option>)}
                        </select>
                    </div>
                    <Button onClick={handlePreviewVoice} isLoading={isPreviewingVoice} variant="secondary" className="px-3 py-2">
                        <Volume2 className="w-5 h-5" />
                    </Button>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Vocal Style</label>
                    <input value={vocalStyle} onChange={e => setVocalStyle(e.target.value)} placeholder="e.g., powerful rock ballad, soft pop whisper..." className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"/>
                </div>
                 <Button onClick={handleGenerateVocalTrack} isLoading={isGeneratingVocals} className="w-full">
                    <Music className="w-5 h-5 mr-2" />
                    Generate Vocal Track
                </Button>
            </div>
          )}
        </div>

        {/* Right Side: Outputs */}
        <div className="space-y-6 bg-black/20 rounded-lg p-4 holographic-border min-h-[300px]">
            {isGeneratingLyrics && <Spinner className="h-full" />}

            {!isGeneratingLyrics && !lyrics && (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                    <Music className="w-16 h-16 mb-4" />
                    <p>Your generated song assets will appear here.</p>
                </div>
            )}
            
            {lyrics && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold text-purple-300 flex items-center gap-2"><FileText /> Generated Lyrics</h3>
                    <DownloadButton data={lyrics} filename={`${projectTitle}-lyrics.txt`} />
                  </div>
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 h-48 overflow-y-auto">
                    <p className="whitespace-pre-wrap text-sm">{lyrics}</p>
                  </div>
                </div>

                {artConcepts && (
                    <div>
                        <h3 className="text-lg font-bold text-purple-300 flex items-center gap-2"><Palette /> Cover Art Concepts</h3>
                        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 mt-2 text-sm space-y-2">
                           <p className="whitespace-pre-wrap">{artConcepts}</p>
                        </div>
                    </div>
                )}
                
                {isGeneratingVocals && <Spinner className="my-4" />}

                {vocalTrack && (
                  <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-bold text-purple-300 flex items-center gap-2"><Music /> Final Vocal Track</h3>
                      <DownloadButton data={vocalTrack.blob} filename={`${projectTitle}-vocals.wav`} />
                    </div>
                    <audio controls src={vocalTrack.url} className="w-full"></audio>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>
    </Card>
  );
};

export default WizardPanel;
