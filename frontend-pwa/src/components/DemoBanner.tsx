import React from 'react';
import { AlertCircle, Github, Linkedin } from 'lucide-react';

interface DemoBannerProps {
  className?: string;
}

export const DemoBanner: React.FC<DemoBannerProps> = ({ className = '' }) => {
  return (
    <div className={`bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 text-center relative ${className}`}>
      <div className="flex items-center justify-center gap-2 text-sm font-medium">
        <AlertCircle size={16} />
        <span>🚀 DEMO MODE - Portfolio Showcase</span>
        <span className="hidden sm:inline">• All data is simulated for demonstration</span>
      </div>
      
      <div className="flex items-center justify-center gap-4 mt-1 text-xs opacity-90">
        <a 
          href="https://github.com/Rishi5377/NagaraTrack-Lite" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-blue-200 transition-colors"
        >
          <Github size={12} />
          <span>Source Code</span>
        </a>
        
        <span className="text-blue-200">•</span>
        
        <a 
          href="https://linkedin.com/in/your-profile" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-blue-200 transition-colors"
        >
          <Linkedin size={12} />
          <span>LinkedIn</span>
        </a>
      </div>
      
      {/* Animated pulse indicator */}
      <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
    </div>
  );
};

export default DemoBanner;