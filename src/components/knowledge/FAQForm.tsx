'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface FAQFormProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function FAQForm({ onSuccess, onError }: FAQFormProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (!token) {
      onError('Authentication required. Please sign in first.');
      return;
    }
    
    setLoading(true);

    try {
      const response = await fetch('/api/knowledge/faq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to add FAQ');
      }

      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2000);
      onSuccess('FAQ added to knowledge base');

      setFormData({
        question: '',
        answer: '',
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-700 bg-slate-800/50 p-8 max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Question */}
        <div>
          <Label htmlFor="question" className="text-slate-200">
            Question *
          </Label>
          <Input
            id="question"
            name="question"
            type="text"
            placeholder="e.g., What are your delivery times?"
            value={formData.question}
            onChange={handleChange}
            required
            className="mt-2 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Answer */}
        <div>
          <Label htmlFor="answer" className="text-slate-200">
            Answer *
          </Label>
          <Textarea
            id="answer"
            name="answer"
            placeholder="Provide a clear, helpful answer..."
            value={formData.answer}
            onChange={handleChange}
            required
            rows={6}
            className="mt-2 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 resize-none"
          />
        </div>

        {/* Tips */}
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
          <p className="text-sm text-cyan-300 font-semibold mb-2">💡 Tips:</p>
          <ul className="text-sm text-cyan-200 space-y-1">
            <li>• Ask questions your customers actually ask</li>
            <li>• Be specific and provide examples</li>
            <li>• Include alternatives if relevant</li>
          </ul>
        </div>

        {/* Submit Button */}
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-semibold py-2 rounded-lg transition-all"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Adding FAQ...
              </>
            ) : submitted ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                FAQ Added!
              </>
            ) : (
              'Add FAQ to Knowledge Base'
            )}
          </Button>
        </motion.div>
      </form>
    </Card>
  );
}
