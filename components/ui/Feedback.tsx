
import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import Button from './Button';

interface FeedbackProps {
  onRevisionRequest: (feedbackText: string) => void;
  isProcessingRevision: boolean;
}

const Feedback: React.FC<FeedbackProps> = ({ onRevisionRequest, isProcessingRevision }) => {
  const [rating, setRating] = useState<'good' | 'bad' | null>(null);
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const handleRate = (newRating: 'good' | 'bad') => {
    setRating(newRating);
    if (newRating === 'bad') {
      setShowRevisionInput(true);
    } else {
      setShowRevisionInput(false);
    }
  };
  
  const handleRevision = () => {
      if (!feedbackText.trim()) return;
      onRevisionRequest(feedbackText);
      setFeedbackText('');
      setShowRevisionInput(false);
      setRating(null);
  }

  return (
    <div className="mt-2 pt-2 border-t border-gray-600/50 flex flex-col items-start gap-2">
        <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Rate this response:</span>
            <button onClick={() => handleRate('good')} className={`p-1 rounded-full transition-colors ${rating === 'good' ? 'bg-green-500/50 text-green-300' : 'hover:bg-gray-600'}`}>
                <ThumbsUp className="w-4 h-4" />
            </button>
            <button onClick={() => handleRate('bad')} className={`p-1 rounded-full transition-colors ${rating === 'bad' ? 'bg-red-500/50 text-red-300' : 'hover:bg-gray-600'}`}>
                <ThumbsDown className="w-4 h-4" />
            </button>
        </div>
        {showRevisionInput && (
            <div className="w-full flex flex-col gap-2 animate-fade-in">
                <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="How can I improve it? (e.g., make it rhyme, change the chord progression...)"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    rows={2}
                />
                <Button onClick={handleRevision} isLoading={isProcessingRevision} disabled={!feedbackText.trim()}>
                    Request Revision
                </Button>
            </div>
        )}
    </div>
  );
};

export default Feedback;
