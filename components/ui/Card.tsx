
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-black/20 backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/40 p-6 holographic-border ${className}`}>
      {children}
    </div>
  );
};

export default Card;
