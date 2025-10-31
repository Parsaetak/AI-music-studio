
import React from 'react';
import { ShieldAlert } from 'lucide-react';
import Button from './ui/Button';

// Fix: Removed global declaration, as it has been moved to types.ts to prevent type conflicts.

interface ApiKeySelectorProps {
    onKeySelected: () => void;
}

const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onKeySelected }) => {
    
    const handleSelectKey = async () => {
        if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            await window.aistudio.openSelectKey();
            // Assume success after dialog opens to avoid race conditions
            onKeySelected(); 
        } else {
            alert('AI Studio context not available.');
        }
    };

    return (
        <div className="bg-yellow-900/20 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg relative flex flex-col items-center text-center gap-4">
            <ShieldAlert className="w-8 h-8 text-yellow-400" />
            <div >
                <h3 className="font-bold">API Key Required</h3>
                <p className="text-sm">To use AI Music Studio Pro, you need to select an API key. Please note that usage will be billed to your account.</p>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-sm text-purple-400 hover:underline">Learn more about billing.</a>
            </div>
            <Button onClick={handleSelectKey} variant="secondary">
                Select API Key
            </Button>
        </div>
    );
};

export default ApiKeySelector;
