'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

interface CatalogFormProps {
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  isDark?: boolean;
}

export function CatalogForm({ onSuccess, onError, isDark = true }: CatalogFormProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    unit: '',
    sku: '',
    available: true,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, available: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Get auth token
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    
    if (!token) {
      onError('Authentication required. Please sign in first.');
      return;
    }
    
    setLoading(true);

    try {
      const response = await fetch('/api/knowledge/catalog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to add product');
      }

      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 2000);
      onSuccess(`Product "${formData.name}" added to knowledge base`);

      setFormData({
        name: '',
        description: '',
        price: '',
        unit: '',
        sku: '',
        available: true,
      });
    } catch (err) {
      onError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={`p-8 max-w-2xl ${
      isDark 
        ? 'border-slate-700 bg-slate-800/50' 
        : 'border-slate-200 bg-white'
    }`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Name */}
        <div>
          <Label htmlFor="name" className={isDark ? 'text-slate-200' : 'text-slate-700'}>
            Product Name *
          </Label>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="e.g., iPhone 15 Pro"
            value={formData.name}
            onChange={handleChange}
            required
            className={`mt-2 ${isDark ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
          />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description" className={isDark ? 'text-slate-200' : 'text-slate-700'}>
            Description *
          </Label>
          <Textarea
            id="description"
            name="description"
            placeholder="Describe this product. What features does it have?"
            value={formData.description}
            onChange={handleChange}
            required
            rows={4}
            className={`mt-2 resize-none ${isDark ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
          />
        </div>

        {/* Price & Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price" className={isDark ? 'text-slate-200' : 'text-slate-700'}>
              Price (₦) *
            </Label>
            <Input
              id="price"
              name="price"
              type="number"
              placeholder="e.g., 450000"
              value={formData.price}
              onChange={handleChange}
              required
              step="0.01"
              className={`mt-2 ${isDark ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
            />
          </div>
          <div>
            <Label htmlFor="unit" className={isDark ? 'text-slate-200' : 'text-slate-700'}>
              Unit *
            </Label>
            <Input
              id="unit"
              name="unit"
              type="text"
              placeholder="e.g., piece, box, kg"
              value={formData.unit}
              onChange={handleChange}
              required
              className={`mt-2 ${isDark ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
            />
          </div>
        </div>

        {/* SKU */}
        <div>
          <Label htmlFor="sku" className={isDark ? 'text-slate-200' : 'text-slate-700'}>
            SKU (Optional)
          </Label>
          <Input
            id="sku"
            name="sku"
            type="text"
            placeholder="e.g., iPhone-15-PRO-256GB"
            value={formData.sku}
            onChange={handleChange}
            className={`mt-2 ${isDark ? 'bg-slate-900 border-slate-600 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'}`}
          />
        </div>

        {/* Availability */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="available"
            checked={formData.available}
            onCheckedChange={handleCheckboxChange}
            className={isDark ? 'border-slate-500 bg-slate-900' : 'border-slate-300 bg-white'}
          />
          <Label htmlFor="available" className={`font-normal ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
            Currently available for sale
          </Label>
        </div>

        {/* Submit Button */}
        <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
          <Button
            type="submit"
            disabled={loading}
            className={`w-full font-semibold py-2 rounded-lg transition-all text-white ${
              isDark
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700'
                : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600'
            }`}
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Adding Product...
              </>
            ) : submitted ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Product Added!
              </>
            ) : (
              'Add Product to Knowledge Base'
            )}
          </Button>
        </motion.div>
      </form>
    </Card>
  );
}
