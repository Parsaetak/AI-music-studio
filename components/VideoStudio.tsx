
import React, { useState, useEffect, useRef } from 'react';
import { Clapperboard, Film, BrainCircuit, PlusSquare, ChevronDown, Wand } from 'lucide-react';
import { generateVideo, checkVideoStatus, analyzeVideo, extendVideo, generateStoryboard } from '../services/geminiService';
import { VideosOperation, GenerateVideosResponse, Video } from '@google/genai';
import { formatAIResponse } from '../utils/text';
import Button from './ui/Button';
import Card from './ui/Card';
import Spinner from './ui/Spinner';
import DownloadButton from './ui/DownloadButton';
import FileUpload from './ui/FileUpload';

type VideoStudioTab = 'generate' | 'analyze';

interface VideoStudioProps {
  onVideoGenerated: (blob: Blob | null) => void;
  projectTitle: string;
  lyricsContent: string | null;
}

const videoStyles = ["Cinematic", "8mm Vintage", "Documentary", "Handheld Camera", "Drone Footage", "Psychedelic", "Time-lapse"];

const fileToGenerativePart = async (file: File) => {
    const base64encodedData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
    });
    return {
        base64Data: base64encodedData,
        mimeType: file.type,
    };
};

const extractVideoFrames = (videoFile: File, framesToExtract: number): Promise<{ mimeType: string, data: string }[]> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;
        const videoUrl = URL.createObjectURL(videoFile);
        video.src = videoUrl;

        video.onloadedmetadata = () => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) {
                URL.revokeObjectURL(videoUrl);
                return reject(new Error("Canvas context not available"));
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const frames: { mimeType: string, data: string }[] = [];
            const duration = video.duration;
            if (duration === 0) {
                URL.revokeObjectURL(videoUrl);
                return resolve([]);
            }
            const interval = duration / (framesToExtract + 1);
            let currentTime = interval;
            let framesExtracted = 0;

            const captureFrame = () => {
                video.currentTime = currentTime;
            };

            video.onseeked = () => {
                context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                const dataUrl = canvas.toDataURL('image/jpeg');
                frames.push({
                    mimeType: 'image/jpeg',
                    data: dataUrl.split(',')[1]
                });
                
                framesExtracted++;
                currentTime += interval;

                if (framesExtracted >= framesToExtract || currentTime > duration) {
                    URL.revokeObjectURL(videoUrl);
                    resolve(frames);
                } else {
                    captureFrame();
                }
            };

            captureFrame();
        };

        video.onerror = (e) => {
            URL.revokeObjectURL(videoUrl);
            reject(new Error("Error loading video file for frame extraction."));
        }
    });
};

const VideoStudio: React.FC<VideoStudioProps> = ({ onVideoGenerated, projectTitle, lyricsContent }) => {
    const [activeTab, setActiveTab] = useState<VideoStudioTab>('generate');
    
    // Generation State
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
    const [startImage, setStartImage] = useState<{ file: File; url: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
    const [generatedVideoObject, setGeneratedVideoObject] = useState<Video | null>(null);
    const [loadingMessage, setLoadingMessage] = useState('');
    const pollIntervalRef = useRef<number | null>(null);
    
    // Pro State
    const [showProSettings, setShowProSettings] = useState(false);
    const [videoStyle, setVideoStyle] = useState('');
    const [extensionPrompt, setExtensionPrompt] = useState('');
    const [isExtending, setIsExtending] = useState(false);
    const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);

    // Analysis State
    const [analysisPrompt, setAnalysisPrompt] = useState("Describe this video's visual style and key elements.");
    const [videoForAnalysis, setVideoForAnalysis] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState('');

    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    const pollForVideo = (operation: VideosOperation<GenerateVideosResponse>, isExtension: boolean = false) => {
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = window.setInterval(async () => {
            try {
                setLoadingMessage('Checking video status...');
                const updatedOp = await checkVideoStatus(operation);
                if (updatedOp.done) {
                    clearInterval(pollIntervalRef.current as number);
                    const videoData = updatedOp.response?.generatedVideos?.[0]?.video;
                    if (videoData?.uri) {
                        const videoRes = await fetch(`${videoData.uri}&key=${process.env.API_KEY}`);
                        const blob = await videoRes.blob();
                        const url = URL.createObjectURL(blob)
                        setVideoUrl(url);
                        setVideoBlob(blob);
                        onVideoGenerated(blob);
                        setGeneratedVideoObject(videoData);
                        setLoadingMessage('Video generation complete!');
                    } else {
                         setLoadingMessage('Video generation finished but no URL found.');
                    }
                    if(isExtension) setIsExtending(false); else setIsLoading(false);
                }
            } catch (error: any) {
                console.error("Polling failed", error);
                if(isExtension) setIsExtending(false); else setIsLoading(false);
                setLoadingMessage('Error checking video status. Please try again.');
                clearInterval(pollIntervalRef.current as number);
            }
        }, 10000);
    };

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsLoading(true);
        setVideoUrl(null);
        setVideoBlob(null);
        onVideoGenerated(null);
        setGeneratedVideoObject(null);
        setLoadingMessage('Starting video generation...');
        try {
            const imagePart = startImage ? await fileToGenerativePart(startImage.file) : undefined;
            const operation = await generateVideo(prompt, aspectRatio, videoStyle, imagePart);
            setLoadingMessage('Video is processing. This may take a few minutes...');
            pollForVideo(operation);
        } catch (error: any) {
            console.error('Video generation failed to start', error);
            setIsLoading(false);
            setLoadingMessage('Failed to start video generation.');
        }
    };
    
    const handleGenerateStoryboard = async () => {
        if(!lyricsContent) return;
        setIsGeneratingStoryboard(true);
        try {
            const storyboardPrompt = await generateStoryboard(lyricsContent);
            setPrompt(storyboardPrompt);
        } catch (error) {
            console.error("Failed to generate storyboard", error);
            setPrompt("Error: Could not generate a storyboard. Please write a prompt manually.");
        } finally {
            setIsGeneratingStoryboard(false);
        }
    }
    
    const handleExtend = async () => {
        if (!extensionPrompt.trim() || !generatedVideoObject) return;
        setIsExtending(true);
        setLoadingMessage('Starting video extension...');
        try {
            const operation = await extendVideo(extensionPrompt, generatedVideoObject);
            setLoadingMessage('Extension is processing...');
            pollForVideo(operation, true);
        } catch (error: any) {
            console.error('Video extension failed to start', error);
            setIsExtending(false);
            setLoadingMessage('Failed to start video extension.');
        }
    };

    const handleAnalyze = async () => {
        if (!analysisPrompt.trim() || !videoForAnalysis) return;
        setIsAnalyzing(true);
        setAnalysisResult('');
        try {
            const frames = await extractVideoFrames(videoForAnalysis, 8);
            if (frames.length === 0) {
                setAnalysisResult("Could not extract frames from video.");
                setIsAnalyzing(false);
                return;
            }
            const result = await analyzeVideo(analysisPrompt, frames);
            setAnalysisResult(formatAIResponse(result));
        } catch (error) {
            console.error('Video analysis failed', error);
            setAnalysisResult('An error occurred during analysis.');
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const handleImageUpload = (file: File) => {
        if (file) {
            setStartImage({ file, url: URL.createObjectURL(file) });
        }
    };
    const handleAnalysisUpload = (file: File) => {
        if (file) {
            setVideoForAnalysis(file);
        }
    };

    const renderGenerator = () => (
        <div className="grid md:grid-cols-2 gap-6 h-full">
            <Card className="flex flex-col">
                <h2 className="text-xl font-bold mb-4 text-purple-300">Generate Music Video</h2>
                
                {lyricsContent && (
                    <div className="mb-4 p-4 bg-black/20 rounded-lg holographic-border">
                        <h3 className="text-lg font-bold text-purple-300 mb-2">Sync with Lyrics</h3>
                        <p className="text-sm text-gray-400 mb-3">Use your generated lyrics to create a synchronized storyboard prompt for the video.</p>
                        <Button onClick={handleGenerateStoryboard} isLoading={isGeneratingStoryboard}>
                            <Wand className="w-4 h-4 mr-2" />
                            Generate AI Storyboard
                        </Button>
                    </div>
                )}
                <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe your video, or generate a storyboard from your lyrics..." className="h-32 bg-gray-900/50 border border-gray-700 rounded-lg p-2 resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none mb-4" />
                
                 <div className="mb-4">
                    <button onClick={() => setShowProSettings(!showProSettings)} className="flex items-center gap-2 text-sm text-gray-300 mb-2 font-semibold">
                       Pro Controls <ChevronDown className={`w-4 h-4 transition-transform ${showProSettings ? 'rotate-180' : ''}`} />
                   </button>
                   {showProSettings && (
                        <div className="p-4 bg-black/20 rounded-lg animate-fade-in holographic-border">
                           <label className="block text-sm font-medium text-gray-300 mb-2">Video Style</label>
                           <div className="flex flex-wrap gap-2">
                               {videoStyles.map(style => (
                                   <button key={style} onClick={() => setVideoStyle(style)} className={`px-3 py-1 text-xs rounded-full ${videoStyle === style ? 'rainbow-bg text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                       {style}
                                   </button>
                               ))}
                           </div>
                       </div>
                   )}
               </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Aspect Ratio</label>
                    <div className="flex gap-2">
                        {['16:9', '9:16'].map(ar => (
                            <button key={ar} onClick={() => setAspectRatio(ar as '16:9' | '9:16')} className={`px-3 py-1 text-sm rounded-full ${aspectRatio === ar ? 'rainbow-bg text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                {ar}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="mb-4">
                    <FileUpload 
                        label="Optional: Start Image"
                        onFileSelect={handleImageUpload}
                        accept="image/*"
                    />
                    {startImage && <img src={startImage.url} alt="Start" className="mt-2 rounded-lg max-h-32"/>}
                </div>
                <div className="flex gap-2 mt-auto">
                    <Button onClick={handleGenerate} isLoading={isLoading} className="flex-1">
                        <Film className="w-5 h-5 mr-2" /> Generate Video
                    </Button>
                    <DownloadButton data={videoBlob} filename={`${projectTitle}-video.mp4`} />
                </div>
                
                {generatedVideoObject && !isLoading && !isExtending && (
                    <div className="mt-6 pt-6 border-t-2 border-transparent holographic-border">
                         <h2 className="text-xl font-bold mb-4 text-purple-300">Pro Edit: Extend Video</h2>
                         <p className="text-sm text-gray-400 mb-2">Add another 7 seconds to your video. Describe what should happen next.</p>
                         <textarea value={extensionPrompt} onChange={(e) => setExtensionPrompt(e.target.value)} placeholder="e.g., The cat flies off into space..." className="h-20 w-full bg-gray-900/50 border border-gray-700 rounded-lg p-2 resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none mb-4" />
                         <Button onClick={handleExtend} isLoading={isExtending} disabled={!extensionPrompt.trim()}>
                             <PlusSquare className="w-5 h-5 mr-2" /> Extend
                         </Button>
                    </div>
                )}

            </Card>
            <Card className="flex items-center justify-center">
                {isLoading || isExtending ? (
                    <div className="text-center text-gray-400">
                        <Spinner />
                        <p className="mt-4 font-semibold">{loadingMessage}</p>
                    </div>
                ) : videoUrl ? (
                    <video src={videoUrl} controls autoPlay muted loop className="rounded-lg object-contain max-h-full max-w-full" />
                ) : (
                    <div className="text-center text-gray-500">
                        <Clapperboard className="w-24 h-24 mx-auto" />
                        <p className="mt-2">Your music video will appear here.</p>
                    </div>
                )}
            </Card>
        </div>
    );
    
    const renderAnalyzer = () => (
         <div className="grid md:grid-cols-2 gap-6 h-full">
            <Card className="flex flex-col">
                 <h2 className="text-xl font-bold mb-4 text-purple-300">Analyze a Video</h2>
                <div className="mb-4">
                    <FileUpload
                        label="Upload Video"
                        onFileSelect={handleAnalysisUpload}
                        accept="video/*"
                    />
                </div>
                <textarea value={analysisPrompt} onChange={(e) => setAnalysisPrompt(e.target.value)} className="h-24 bg-gray-900/50 border border-gray-700 rounded-lg p-2 resize-none focus:ring-2 focus:ring-purple-500 focus:outline-none mb-4" />
                <Button onClick={handleAnalyze} isLoading={isAnalyzing} disabled={!videoForAnalysis}>
                    <BrainCircuit className="w-5 h-5 mr-2" /> Analyze Video
                </Button>
            </Card>
            <Card>
                <h3 className="text-lg font-semibold mb-2">Analysis Result</h3>
                <div className="bg-gray-900/50 p-3 rounded-lg h-full overflow-y-auto border border-gray-700">
                    {isAnalyzing ? <Spinner /> : 
                    analysisResult ? <p className="whitespace-pre-wrap text-sm">{analysisResult}</p> : <p className="text-gray-500">Analysis will appear here.</p>}
                </div>
            </Card>
        </div>
    );

    return (
        <div>
            <div className="mb-4 flex gap-2 border-b border-gray-700/50">
                <button onClick={() => setActiveTab('generate')} className={`py-2 px-4 text-sm font-medium transition-colors ${activeTab === 'generate' ? 'border-b-2 border-purple-400 text-white' : 'text-gray-400 hover:text-white'}`}>
                    Generate Video
                </button>
                 <button onClick={() => setActiveTab('analyze')} className={`py-2 px-4 text-sm font-medium transition-colors ${activeTab === 'analyze' ? 'border-b-2 border-purple-400 text-white' : 'text-gray-400 hover:text-white'}`}>
                    Analyze Video
                </button>
            </div>
            {activeTab === 'generate' ? renderGenerator() : renderAnalyzer()}
        </div>
    );
};

export default VideoStudio;
