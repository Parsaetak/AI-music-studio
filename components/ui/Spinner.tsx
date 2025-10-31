
import React from 'react';

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <div className={`flex justify-center items-center ${className}`}>
        <div className="relative h-16 w-16">
            <div className="absolute top-0 left-0 h-full w-full rounded-full border-t-2 border-r-2 border-b-2 border-purple-500 animate-spin"></div>
            <div className="absolute top-0 left-0 h-full w-full rounded-full border-l-2 border-t-2 border-r-2 border-cyan-400 animate-spin" style={{animationDelay: '-0.15s'}}></div>
            <div className="absolute top-0 left-0 h-full w-full rounded-full border-b-2 border-l-2 border-t-2 border-pink-500 animate-spin" style={{animationDelay: '-0.3s'}}></div>
        </div>
    </div>
);

export default Spinner;
