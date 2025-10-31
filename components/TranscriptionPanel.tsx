import React, { useState, useRef, useCallback } from 'react';
import { Mic, Square, FileAudio } from 'lucide-react';
import { LiveServerMessage, LiveSession } from '@google/genai';
import { startTranscriptionSession } from '../services/geminiService';
import { encode } from '../utils/audio';
import Button from './ui/Button';
import Card from './ui/Card';
import DownloadButton from './ui/DownloadButton';

interface GenAIBlob {
    mimeType: string;
    data: string;
}

interface TranscriptionPanelProps {
  projectTitle: string;
}

const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({ projectTitle }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcribedText, setTranscribedText] = useState('');
    
    const sessionRef = useRef<LiveSession | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            setIsRecording(true);
            setTranscribedText('');

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

            const sessionPromise = startTranscriptionSession({
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
                onmessage: (message: LiveServerMessage) => {
                    if (message.serverContent?.inputTranscription) {
                        setTranscribedText(prev => prev + message.serverContent.inputTranscription.text);
                    }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Transcription error:', e);
                    stopRecording();
                },
                onclose: (e: CloseEvent) => {
                    stopRecording();
                },
            });

            sessionPromise.then(session => sessionRef.current = session);

        } catch (err) {
            console.error('Failed to start recording:', err);
            alert("Could not access microphone. Please check your browser permissions.");
            setIsRecording(false);
        }
    };

    const stopRecording = useCallback(() => {
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
        setIsRecording(false);
    }, []);

    return (
        <Card className="h-full flex flex-col max-w-4xl mx-auto w-full">
            <div className="text-center mb-6">
                <FileAudio className="h-12 w-12 mx-auto rainbow-text mb-2" />
                <h2 className="text-3xl font-bold">Live Audio Transcription</h2>
                <p className="text-gray-400">Record your voice or any audio and get a real-time transcript.</p>
            </div>
            
            <div className="flex-1 flex flex-col mb-4">
                <label htmlFor="transcript-output" className="block text-sm font-medium text-gray-300 mb-2">Transcript Output</label>
                <textarea
                    id="transcript-output"
                    readOnly
                    value={transcribedText}
                    placeholder={isRecording ? "Listening..." : "Your transcribed text will appear here..."}
                    className="flex-1 w-full bg-gray-900/50 border border-gray-700 rounded-lg p-3 resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
                {!isRecording ? (
                    <Button onClick={startRecording} className="flex-1 py-3 text-lg">
                        <Mic className="w-6 h-6 mr-2" /> Start Recording
                    </Button>
                ) : (
                    <Button onClick={stopRecording} className="flex-1 py-3 text-lg bg-red-600 hover:bg-red-700">
                        <Square className="w-6 h-6 mr-2" /> Stop Recording
                    </Button>
                )}
                <DownloadButton data={transcribedText} filename={`${projectTitle}-transcript.txt`} disabled={!transcribedText} />
            </div>
        </Card>
    );
};

export default TranscriptionPanel;
