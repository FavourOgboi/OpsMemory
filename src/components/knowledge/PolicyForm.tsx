'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface PolicyFormProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

const POLICY_TEMPLATES = {
  delivery:
    'Our delivery policy: Free delivery on orders above ₦50,000 within Lagos. Nationwide delivery 2-5 business days via courier. Track your order using the tracking code in your receipt.',
  payment:
    'Payment methods: Bank transfer, online card payment, pay-on-delivery available. All payments processed securely. No charges for failed transactions.',
  returns:
    'Returns policy: 7-day money-back guarantee for unopened items. 30-day replacement for defects. No questions asked returns within 48 hours of purchase.',
  hours: 'Business hours: Monday - Friday 9 AM - 6 PM, Saturday 10 AM - 4 PM. Customer support available during business hours via WhatsApp and email.',
  contact:
    'Contact us: WhatsApp: +234 (XXX) XXXX-XXXX, Email: support@business.com, Call: +234 (XXX) XXXX-XXXX',
  discount:
    'Special promotions: 10% loyalty discount for repeat customers over ₦200,000 annual spend. Referral bonus: ₦5,000 for each successful referral.',
};

export function PolicyForm({ onSuccess, onError }: PolicyFormProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    policy_type: 'delivery',
    content: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectTemplate = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      policy_type: type,
      content: POLICY_TEMPLATES[type as keyof typeof POLICY_TEMPLATES] || '',
    }));
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
      const response = await fetch('/api/knowledge/policy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          policy_type: formData.policy_type,
          content: formData.content,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to add policy');
      }

      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2000);
      onSuccess('Policy added to knowledge base');

      setFormData({
        policy_type: 'delivery',
        content: '',
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
        {/* Policy Type */}
        <div>
          <Label htmlFor="policy_type" className="text-slate-200">
            Policy Type *
          </Label>
          <select
            id="policy_type"
            name="policy_type"
            value={formData.policy_type}
            onChange={handleChange}
            className="mt-2 w-full bg-slate-900 border border-slate-600 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="delivery">Delivery Policy</option>
            <option value="payment">Payment Policy</option>
            <option value="returns">Returns Policy</option>
            <option value="hours">Business Hours</option>
            <option value="contact">Contact Information</option>
            <option value="discount">Discount & Loyalty Program</option>
          </select>
        </div>

        {/* Quick Template Button */}
        <div>
          <p className="text-sm text-slate-400 mb-2">
            💡 Or use a template and customize:
          </p>
          <motion.button
            type="button"
            onClick={() =>
              handleSelectTemplate(formData.policy_type)
            }
            className="text-cyan-400 hover:text-cyan-300 text-sm font-semibold"
            whileHover={{ x: 2 }}
          >
            Load Template
          </motion.button>
        </div>

        {/* Content */}
        <div>
          <Label htmlFor="content" className="text-slate-200">
            Policy Content *
          </Label>
          <Textarea
            id="content"
            name="content"
            placeholder="Enter your policy details here..."
            value={formData.content}
            onChange={handleChange}
            required
            rows={8}
            className="mt-2 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 resize-none"
          />
        </div>

        {/* Tips */}
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
          <p className="text-sm text-cyan-300 font-semibold mb-2">
            📋 Best Practices:
          </p>
          <ul className="text-sm text-cyan-200 space-y-1">
            <li>
              • Be clear and concise — customers should understand immediately
            </li>
            <li>
              • Update delivery times and contact info as business needs change
            </li>
            <li>• Include specific details (e.g., exact timeframes, fees)</li>
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
                Adding Policy...
              </>
            ) : submitted ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Policy Added!
              </>
            ) : (
              'Add Policy to Knowledge Base'
            )}
          </Button>
        </motion.div>
      </form>
    </Card>
  );
}
