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
    <Card className="border-slate-700 bg-slate-800/50 p-8 max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Product Name */}
        <div>
          <Label htmlFor="name" className="text-slate-200">
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
            className="mt-2 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="description" className="text-slate-200">
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
            className="mt-2 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 resize-none"
          />
        </div>

        {/* Price & Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price" className="text-slate-200">
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
              className="mt-2 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
          <div>
            <Label htmlFor="unit" className="text-slate-200">
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
              className="mt-2 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* SKU */}
        <div>
          <Label htmlFor="sku" className="text-slate-200">
            SKU (Optional)
          </Label>
          <Input
            id="sku"
            name="sku"
            type="text"
            placeholder="e.g., iPhone-15-PRO-256GB"
            value={formData.sku}
            onChange={handleChange}
            className="mt-2 bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Availability */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="available"
            checked={formData.available}
            onCheckedChange={handleCheckboxChange}
            className="border-slate-500 bg-slate-900"
          />
          <Label htmlFor="available" className="text-slate-200 font-normal">
            Currently available for sale
          </Label>
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
