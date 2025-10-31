
import React, { useState, useRef, useCallback } from 'react';
import { generateSpeech, connectToVocalCoach } from '../services/geminiService';
import { Mic, Square, Play, ChevronDown, Volume2 } from 'lucide-react';
import { LiveServerMessage, LiveSession, LiveCallbacks } from '@google/genai';
import { encode, decode, decodeAudioData, pcmToWavBlob } from '../utils/audio';
import Button from './ui/Button';
import Card from './ui/Card';
import Feedback from './ui/Feedback';
import DownloadButton from './ui/DownloadButton';

interface GenAIBlob {
    mimeType: string;
    data: string;
}

const VOICES = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr', 'Aria', 'Leo', 'Nova', 'Orion', 'Lyra'];

interface VocalStudioProps {
  onAudioGenerated: (blob: Blob | null) => void;
  projectTitle: string;
}

const VocalStudio: React.FC<VocalStudioProps> = ({ onAudioGenerated, projectTitle }) => {
  const [lyrics, setLyrics] = useState('');
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showProSettings, setShowProSettings] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [vocalStyle, setVocalStyle] = useState('');
  const [isPreviewing, setIsPreviewing] = useState(false);

  const [isCoachActive, setIsCoachActive] = useState(false);
  const [transcription, setTranscription] = useState<{user: string, model: string}[]>([]);
  const sessionRef = useRef<LiveSession | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef(0);
  const previewAudioContextRef = useRef<AudioContext | null>(null);

  const handleGenerateSpeech = async (prompt?: string) => {
    const textToGenerate = prompt || lyrics;
    if (!textToGenerate.trim()) return;
    setIsGeneratingSpeech(true);
    setAudioUrl(null);
    setAudioBlob(null);
    onAudioGenerated(null);
    try {
      const base64Audio = await generateSpeech(textToGenerate, selectedVoice, vocalStyle);
      if (base64Audio) {
        const pcmData = decode(base64Audio);
        const blob = pcmToWavBlob(pcmData);
        setAudioUrl(URL.createObjectURL(blob));
        setAudioBlob(blob);
        onAudioGenerated(blob);
      }
    } catch (error) {
      console.error("Failed to generate speech", error);
    } finally {
      setIsGeneratingSpeech(false);
    }
  };

  const handleRevisionRequest = (feedbackText: string) => {
      const revisionPrompt = `Based on this feedback: "${feedbackText}", please regenerate the audio for the following lyrics: ${lyrics}`;
      handleGenerateSpeech(revisionPrompt);
  };

  const handlePreviewVoice = async () => {
    if (isPreviewing) return;
    setIsPreviewing(true);
    try {
      const base64Audio = await generateSpeech(`Hello, you are listening to my voice.`, selectedVoice);
      if (base64Audio) {
        if (!previewAudioContextRef.current || previewAudioContextRef.current.state === 'closed') {
          previewAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const audioCtx = previewAudioContextRef.current;
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
      setIsPreviewing(false);
    }
  };
  
  const startVocalCoach = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        setIsCoachActive(true);
        setTranscription([]);

        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        nextStartTimeRef.current = 0;

        let currentInputTranscription = '';
        let currentOutputTranscription = '';

        const sessionPromise = connectToVocalCoach({
            onopen: () => {
                const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
                scriptProcessorRef.current = scriptProcessor;

                scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                    const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                    const l = inputData.length;
                    const int16 = new Int16Array(l);
                    for (let i = 0; i < l; i++) { int16[i] = inputData[i] * 32768; }
                    const pcmBlob: GenAIBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
                    sessionPromise.then((session) => session.sendRealtimeInput({ media: pcmBlob }));
                };
                source.connect(scriptProcessor);
                scriptProcessor.connect(inputAudioContextRef.current!.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
                const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                if (base64Audio) {
                    const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current!);
                    
                    const now = outputAudioContextRef.current!.currentTime;
                    const startTime = Math.max(now, nextStartTimeRef.current);
                    
                    const source = outputAudioContextRef.current!.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputAudioContextRef.current!.destination);
                    source.start(startTime);
                    
                    nextStartTimeRef.current = startTime + audioBuffer.duration;
                }
                
                if (message.serverContent?.inputTranscription) currentInputTranscription += message.serverContent.inputTranscription.text;
                if (message.serverContent?.outputTranscription) currentOutputTranscription += message.serverContent.outputTranscription.text;

                if (message.serverContent?.turnComplete) {
                    if(currentInputTranscription || currentOutputTranscription) {
                        setTranscription(prev => [...prev, { user: currentInputTranscription, model: currentOutputTranscription }]);
                    }
                    currentInputTranscription = '';
                    currentOutputTranscription = '';
                }
            },
            onerror: (e: ErrorEvent) => {
                console.error('Vocal coach error:', e);
                stopVocalCoach();
            },
            onclose: (e: CloseEvent) => {
                stopVocalCoach();
            },
        });
        sessionPromise.then(session => sessionRef.current = session);

    } catch (err) {
        console.error('Failed to start vocal coach:', err);
        alert("Could not access microphone. Please check your browser permissions.");
        setIsCoachActive(false);
    }
  };

  const stopVocalCoach = useCallback(() => {
    if (sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
    }
    if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
        inputAudioContextRef.current.close();
        inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        outputAudioContextRef.current.close();
        outputAudioContextRef.current = null;
    }
    if (previewAudioContextRef.current && previewAudioContextRef.current.state !== 'closed') {
        previewAudioContextRef.current.close();
    }
    setIsCoachActive(false);
  }, []);

  return (
    <div className="grid md:grid-cols-2 gap-6 h-full">
      <Card className="flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-purple-300">Text-to-Speech Vocal Track</h2>
        <textarea
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          placeholder="Paste your lyrics here..."
          className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg p-2 resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none mb-4"
        />
        <div className="mb-4">
             <button onClick={() => setShowProSettings(!showProSettings)} className="flex items-center gap-2 text-sm text-gray-300 mb-2 font-semibold">
                Pro Controls <ChevronDown className={`w-4 h-4 transition-transform ${showProSettings ? 'rotate-180' : ''}`} />
            </button>
            {showProSettings && (
                 <div className="p-4 bg-black/20 rounded-lg animate-fade-in space-y-4 holographic-border">
                    <div className="flex items-end gap-2">
                        <div className="flex-grow">
                            <label htmlFor="voice-select" className="block text-sm font-medium text-gray-300 mb-2">Voice</label>
                            <select id="voice-select" value={selectedVoice} onChange={e => setSelectedVoice(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none">
                                {VOICES.map(voice => <option key={voice} value={voice}>{voice}</option>)}
                            </select>
                        </div>
                        <Button onClick={handlePreviewVoice} isLoading={isPreviewing} variant="secondary" className="px-3 py-2">
                           <Volume2 className="w-5 h-5" />
                        </Button>
                    </div>
                    <div>
                        <label htmlFor="vocal-style" className="block text-sm font-medium text-gray-300 mb-2">Vocal Style</label>
                        <input id="vocal-style" value={vocalStyle} onChange={e => setVocalStyle(e.target.value)} placeholder="e.g., cheerful, whispering, energetic" className="w-full bg-gray-700 border border-gray-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"/>
                    </div>
                </div>
            )}
        </div>
        <div className="flex gap-2">
            <Button onClick={() => handleGenerateSpeech()} isLoading={isGeneratingSpeech} className="flex-1">
              <Play className="w-5 h-5 mr-2" /> Generate
            </Button>
            <DownloadButton data={audioBlob} filename={`${projectTitle}-vocals.wav`} />
        </div>
        {audioUrl && (
          <div className="mt-4">
            <audio controls src={audioUrl} className="w-full"></audio>
            <Feedback onRevisionRequest={handleRevisionRequest} isProcessingRevision={isGeneratingSpeech} />
          </div>
        )}
      </Card>
      
      <Card className="flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-teal-300">Live Vocal Coach</h2>
        <p className="text-sm text-gray-400 mb-4">Start a live conversation with an AI vocal coach for real-time feedback and exercises.</p>
        <div className="flex-1 bg-gray-900/50 rounded-lg p-3 overflow-y-auto mb-4 border border-gray-700 h-64">
           {transcription.map((t, i) => (
               <div key={i} className="mb-2">
                   {t.user && <p className="text-purple-300">You: {t.user}</p>}
                   {t.model && <p className="text-teal-300">Coach: {t.model}</p>}
               </div>
           ))}
           {!isCoachActive && transcription.length === 0 && <p className="text-gray-500 text-center pt-8">Start a session to begin.</p>}
        </div>
        {!isCoachActive ? (
          <Button onClick={startVocalCoach} className="bg-teal-600 hover:bg-teal-700">
            <Mic className="w-5 h-5 mr-2" /> Start Session
          </Button>
        ) : (
          <Button onClick={stopVocalCoach} className="bg-red-600 hover:bg-red-700">
            <Square className="w-5 h-5 mr-2" /> Stop Session
          </Button>
        )}
      </Card>
    </div>
  );
};

export default VocalStudio;