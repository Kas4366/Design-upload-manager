import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { parseCSV } from '../lib/csvParser';
import { CSVRow, CSVColumnMapping } from '../lib/types';
import { loadColumnMappings } from '../lib/columnMappings';

interface CSVUploadProps {
  onCSVParsed: (rows: CSVRow[], filename: string) => void;
}

export function CSVUpload({ onCSVParsed }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [columnMapping, setColumnMapping] = useState<CSVColumnMapping | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadColumnMappings().then(mapping => {
      setColumnMapping(mapping);
    });
  }, []);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const rows = await parseCSV(file, columnMapping);

      if (rows.length === 0) {
        setError('CSV file is empty');
        setIsProcessing(false);
        return;
      }

      const hasRequiredColumns = rows[0].id && rows[0].order_number && rows[0].sku;
      if (!hasRequiredColumns) {
        setError('CSV file is missing required columns. Please check your column mapping in Settings.');
        setIsProcessing(false);
        return;
      }

      onCSVParsed(rows, file.name);
    } catch (err) {
      setError(`Failed to parse CSV: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {columnMapping && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className="text-sm text-green-800">
            <span className="font-medium">Custom column mapping active</span>
            <span className="text-green-600 ml-1">(configured in Settings)</span>
          </div>
        </div>
      )}

      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-all duration-200
          ${isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 bg-white'
          }
          ${isProcessing ? 'opacity-50 cursor-wait' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isProcessing}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
            <p className="text-gray-600">Processing CSV file...</p>
          </div>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              {isDragging ? (
                <Upload className="w-16 h-16 text-blue-500" />
              ) : (
                <FileText className="w-16 h-16 text-gray-400" />
              )}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Upload Order CSV File
            </h3>
            <p className="text-gray-600 mb-4">
              Drag and drop your CSV file here, or click to browse
            </p>
            <p className="text-sm text-gray-500">
              CSV must contain: id, order_number, sku, title, quantity, number_of_lines
            </p>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-900">Error</h4>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
