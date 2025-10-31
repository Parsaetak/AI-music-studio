import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Search, BrainCircuit, ChevronDown, Lightbulb } from 'lucide-react';
import { generateChatResponse, getInspiration } from '../services/geminiService';
import { ChatMessage } from '../types';
import { formatAIResponse } from '../utils/text';
import Button from './ui/Button';
import Card from './ui/Card';
import Feedback from './ui/Feedback';
import DownloadButton from './ui/DownloadButton';

interface ChatPanelProps {
  onLyricsGenerated: (lyrics: string | null) => void;
  projectTitle: string;
}

const STYLE_PRESETS = ["Poetic", "Narrative", "Cyberpunk Anthem", "Folk Tale", "Dream Pop", "Simple & Catchy"];

const ChatPanel: React.FC<ChatPanelProps> = ({ onLyricsGenerated, projectTitle }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingInspiration, setIsGettingInspiration] = useState(false);
  const [inspiration, setInspiration] = useState<string | null>(null);
  const [useThinking, setUseThinking] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [showProSettings, setShowProSettings] = useState(false);
  const [temperature, setTemperature] = useState(0.9);
  const [topP, setTopP] = useState(1);
  const [stylePreset, setStylePreset] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);
  
  useEffect(() => {
    if (messages.length > 0) {
        const chatHistory = messages
            .map(msg => `${msg.role === 'user' ? 'You' : 'AI Assistant'}:\n${msg.parts[0].text}`)
            .join('\n\n---\n\n');
        onLyricsGenerated(chatHistory);
    } else {
        onLyricsGenerated(null);
    }
  }, [messages, onLyricsGenerated]);
  
  const handleGetInspiration = async () => {
    setIsGettingInspiration(true);
    setInspiration(null);
    try {
        const ideas = await getInspiration();
        setInspiration(ideas);
    } catch (error) {
        console.error("Failed to get inspiration:", error);
        setInspiration("Could not fetch ideas. Please try again.");
    } finally {
        setIsGettingInspiration(false);
    }
  }

  const handleSend = async (messageText: string, isRevision = false) => {
    if (messageText.trim() === '' || isLoading) return;

    let finalPrompt = messageText;
    if (stylePreset && !isRevision) {
        finalPrompt = `Please write in a ${stylePreset} style. My prompt is: "${messageText}"`;
        setStylePreset(null); // Reset after use
    }

    const userMessage: ChatMessage = { role: 'user', parts: [{ text: finalPrompt }] };
    
    if (!isRevision) {
        setMessages(prev => [...prev, userMessage]);
        setInput('');
    }
    
    setIsLoading(true);

    try {
      const history = isRevision ? messages.slice(0, -1).map(msg => ({ role: msg.role, parts: msg.parts })) : messages.map(msg => ({ role: msg.role, parts: msg.parts }));
      const response = await generateChatResponse(history, finalPrompt, useThinking, useSearch, { temperature, topP });
      
      const modelMessage: ChatMessage = { role: 'model', parts: [{ text: formatAIResponse(response.text) }], groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks };
      
      if (isRevision) {
        setMessages(prev => [...prev.slice(0, -1), modelMessage]);
      } else {
        setMessages(prev => [...prev, modelMessage]);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = { role: 'model', parts: [{ text: 'Sorry, I encountered an error. Please try again.' }] };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRevisionRequest = (feedbackText: string) => {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'model') {
          const revisionPrompt = `Please revise the previous response based on this feedback: "${feedbackText}".`;
          handleSend(revisionPrompt, true);
      }
  };

  const renderMessage = (msg: ChatMessage, index: number) => (
    <div key={index} className={`flex flex-col my-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
      <div className={`p-4 rounded-xl max-w-2xl shadow-md ${msg.role === 'user' ? 'bg-purple-800/50' : 'bg-gray-700/50'}`}>
        <p className="whitespace-pre-wrap">{msg.parts[0].text}</p>
        {msg.groundingChunks && msg.groundingChunks.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-600">
                <h4 className="text-xs font-semibold text-gray-300 mb-1">Sources:</h4>
                <ul className="text-xs space-y-1">
                    {msg.groundingChunks.map((chunk, i) => chunk.web && (
                        <li key={i}>
                            <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-purple-300 hover:underline">
                                {chunk.web.title || chunk.web.uri}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        )}
      </div>
      {msg.role === 'model' && index === messages.length - 1 && !isLoading && (
          <Feedback onRevisionRequest={handleRevisionRequest} isProcessingRevision={isLoading} />
      )}
    </div>
  );
  
  const lyricsHistory = messages.length > 0 ? messages
    .map(msg => `${msg.role === 'user' ? 'You' : 'AI Assistant'}:\n${msg.parts[0].text}`)
    .join('\n\n---\n\n') : null;

  return (
    <Card className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
                <div className="text-center text-gray-400 flex flex-col items-center justify-center h-full">
                    <BrainCircuit className="h-16 w-16 mb-4 rainbow-text" />
                    <h2 className="text-2xl font-semibold">Songwriting Assistant</h2>
                    <p className="mb-4">Brainstorm lyrics, themes, or ask about music theory.</p>
                    <Button onClick={handleGetInspiration} isLoading={isGettingInspiration} variant="secondary">
                        <Lightbulb className="w-4 h-4 mr-2"/> Inspire Me
                    </Button>
                     {inspiration && (
                        <div className="mt-4 p-4 text-left bg-gray-900/50 rounded-lg border border-gray-700 w-full max-w-md">
                            <h3 className="font-bold mb-2">Here are some ideas:</h3>
                            <p className="text-sm whitespace-pre-wrap">{inspiration}</p>
                        </div>
                    )}
                </div>
            )}
            {messages.map(renderMessage)}
            {isLoading && <div className="flex justify-start"><div className="p-3 rounded-lg bg-gray-700/50"><Sparkles className="animate-pulse w-5 h-5 text-purple-400" /></div></div>}
            <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t-2 border-transparent holographic-border">
             <div className="flex items-center gap-2 mb-3">
                <button onClick={() => setUseThinking(!useThinking)} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors font-semibold ${useThinking ? 'bg-purple-500 text-white' : 'bg-gray-700/80 text-gray-300'}`}>
                    <BrainCircuit className="w-4 h-4" /> Thinking Mode
                </button>
                <button onClick={() => setUseSearch(!useSearch)} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors font-semibold ${useSearch ? 'bg-blue-500 text-white' : 'bg-gray-700/80 text-gray-300'}`}>
                    <Search className="w-4 h-4" /> Web Search
                </button>
                <button onClick={() => setShowProSettings(!showProSettings)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-gray-700/80 text-gray-300 font-semibold">
                    Pro Controls <ChevronDown className={`w-4 h-4 transition-transform ${showProSettings ? 'rotate-180' : ''}`} />
                </button>
                 <div className="flex-grow"></div>
                 <DownloadButton data={lyricsHistory} filename={`${projectTitle}-lyrics.txt`} />
            </div>
            {showProSettings && (
                <div className="p-4 mb-3 bg-black/20 rounded-lg space-y-4 animate-fade-in holographic-border">
                    <div>
                        <h4 className="block mb-2 text-sm font-bold text-gray-300">Style Presets</h4>
                        <div className="flex flex-wrap gap-2">
                            {STYLE_PRESETS.map(preset => (
                                <button key={preset} onClick={() => setStylePreset(preset)} className={`px-3 py-1 text-xs rounded-full ${stylePreset === preset ? 'rainbow-bg text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>{preset}</button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <label htmlFor="temp" className="block mb-1 text-gray-400">Temperature: {temperature.toFixed(2)}</label>
                            <input id="temp" type="range" min="0" max="1" step="0.01" value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} />
                        </div>
                        <div>
                            <label htmlFor="topP" className="block mb-1 text-gray-400">Top-P: {topP.toFixed(2)}</label>
                            <input id="topP" type="range" min="0" max="1" step="0.01" value={topP} onChange={e => setTopP(parseFloat(e.target.value))} />
                        </div>
                    </div>
                </div>
            )}
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend(input)}
                    placeholder={stylePreset ? `Ask in a ${stylePreset} style...` : "Ask your assistant..."}
                    className="flex-1 bg-gray-900/50 border border-gray-700 rounded-lg p-2.5 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    disabled={isLoading}
                />
                <Button onClick={() => handleSend(input)} isLoading={isLoading} disabled={!input.trim()}>
                    <Send className="w-5 h-5" />
                </Button>
            </div>
        </div>
    </Card>
  );
};

export default ChatPanel;
