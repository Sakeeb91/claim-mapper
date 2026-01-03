'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, Image, FileCode, FileJson, Share2 } from 'lucide-react';
import { EXPORT_FORMATS } from '@/constants';
import type { ExportFormat } from '@/types';
import { cn } from '@/utils';

interface ExportButtonProps {
  onExport: (format: ExportFormat) => void;
  disabled?: boolean;
  className?: string;
}

const FORMAT_ICONS: Record<ExportFormat, React.ReactNode> = {
  png: <Image className="w-4 h-4" />,
  svg: <FileCode className="w-4 h-4" />,
  json: <FileJson className="w-4 h-4" />,
  graphml: <Share2 className="w-4 h-4" />
};

export function ExportButton({ onExport, disabled = false, className }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (format: ExportFormat) => {
    onExport(format);
    setIsOpen(false);
  };

  return (
    <div className={cn("relative", className)} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "flex items-center space-x-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
          disabled
            ? "text-gray-400 cursor-not-allowed"
            : "text-gray-700 hover:bg-gray-50"
        )}
      >
        <Download className="h-4 w-4" />
        <span>Export</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Export Graph
            </p>
          </div>

          {(Object.keys(EXPORT_FORMATS) as ExportFormat[]).map((format) => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-gray-500">{FORMAT_ICONS[format]}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {EXPORT_FORMATS[format].label}
                </p>
                <p className="text-xs text-gray-500">
                  {EXPORT_FORMATS[format].description}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
