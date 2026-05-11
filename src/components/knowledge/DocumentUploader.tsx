'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, File, Loader, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface DocumentUploaderProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function DocumentUploader({ onSuccess, onError }: DocumentUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/x-markdown',
  ];

  const validateFile = (file: File) => {
    if (!allowedTypes.includes(file.type)) {
      onError('Please upload a PDF, TXT, or Markdown file');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      onError('File must be smaller than 10 MB');
      return false;
    }
    return true;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      onError('Please select a file');
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      onError('Authentication required. Please sign in first.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/knowledge/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to upload document');
      }

      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2000);
      onSuccess(
        `Document "${selectedFile.name}" uploaded and processed successfully`
      );

      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-700 bg-slate-800/50 p-8 max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Drag-Drop Zone */}
        <motion.div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
            dragActive
              ? 'border-cyan-400 bg-cyan-500/10'
              : 'border-slate-600 bg-slate-900/50 hover:border-slate-500'
          }`}
          whileHover={{ scale: 1.01 }}
        >
          <Upload className="w-12 h-12 mx-auto mb-3 text-cyan-400" />
          <p className="text-white font-semibold mb-1">
            Drag and drop your file here
          </p>
          <p className="text-sm text-slate-400 mb-4">
            or click to select (PDF, TXT, Markdown up to 10 MB)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md"
            onChange={handleFileChange}
            className="hidden"
          />
          <motion.button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Browse Files
          </motion.button>
        </motion.div>

        {/* Selected File */}
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-start justify-between"
          >
            <div className="flex items-start gap-3">
              <File className="w-5 h-5 text-emerald-400 mt-0.5" />
              <div>
                <p className="text-white font-semibold">{selectedFile.name}</p>
                <p className="text-sm text-emerald-300">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <motion.button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="text-emerald-400 hover:text-emerald-300"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}

        {/* Info */}
        <Alert className="border-blue-500/50 bg-blue-500/10">
          <AlertDescription className="text-blue-300 text-sm">
            📄 The system will automatically split your document into chunks and
            embed them for intelligent retrieval. This process may take a moment
            for large files.
          </AlertDescription>
        </Alert>

        {/* Submit Button */}
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="submit"
            disabled={loading || !selectedFile}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold py-2 rounded-lg transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Processing Document...
              </>
            ) : submitted ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Document Uploaded!
              </>
            ) : (
              'Upload Document'
            )}
          </Button>
        </motion.div>
      </form>
    </Card>
  );
}
