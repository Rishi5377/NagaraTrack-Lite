import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Settings, Eye, EyeOff } from 'lucide-react';

interface DemoControlPanelProps {
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onResetData?: () => void;
  className?: string;
}

export const DemoControlPanel: React.FC<DemoControlPanelProps> = ({
  isSimulating,
  onToggleSimulation,
  onResetData,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {/* Toggle visibility button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="absolute -top-2 -left-2 w-8 h-8 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors shadow-lg"
      >
        {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>

      {isVisible && (
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[280px]">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-gray-600" />
              <h3 className="font-semibold text-gray-800">Demo Controls</h3>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <Settings size={14} />
            </button>
          </div>

          {/* Main controls */}
          <div className="space-y-3">
            {/* Simulation toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Real-time simulation</span>
              <button
                onClick={onToggleSimulation}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isSimulating
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isSimulating ? <Pause size={14} /> : <Play size={14} />}
                {isSimulating ? 'Running' : 'Paused'}
              </button>
            </div>

            {/* Status indicator */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                <span className="text-xs text-gray-500">
                  {isSimulating ? 'Live updates' : 'Static data'}
                </span>
              </div>
            </div>

            {/* Extended controls */}
            {isExpanded && (
              <>
                <hr className="border-gray-200" />
                
                {/* Reset button */}
                {onResetData && (
                  <button
                    onClick={onResetData}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    <RotateCcw size={14} />
                    Reset to initial data
                  </button>
                )}

                {/* Demo info */}
                <div className="text-xs text-gray-500 space-y-1">
                  <p>• Vehicle positions update every 3 seconds</p>
                  <p>• Routes and stops are interactive</p>
                  <p>• All data is simulated for demo purposes</p>
                </div>

                {/* Portfolio note */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-2 text-xs text-blue-700">
                  <p className="font-medium">💼 Portfolio Showcase</p>
                  <p>This demonstrates full-stack development capabilities including real-time features, data visualization, and responsive design.</p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DemoControlPanel;