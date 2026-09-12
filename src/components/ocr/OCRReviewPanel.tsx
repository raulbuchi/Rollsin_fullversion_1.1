'use client';

import React, { useState } from 'react';
import { Check, X, Edit2, AlertCircle } from 'lucide-react';

interface OCRItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  status: 'pending' | 'approved' | 'anomaly';
}

export default function OCRReviewPanel({ items }: { items: OCRItem[] }) {
  const [reviewItems, setReviewItems] = useState<OCRItem[]>(items);

  const handleAction = (id: string, action: 'approve' | 'edit' | 'reject') => {
    setReviewItems(prev => prev.map(item => {
      if (item.id === id) {
        if (action === 'approve') return { ...item, status: 'approved' };
        // Para 'edit' ou 'reject', a lógica seria abrir modal ou remover
      }
      return item;
    }));
  };

  return (
    <div className="flex flex-col gap-4 p-4 pb-20">
      <h2 className="text-xl font-bold mb-2">Conferência de Estoque</h2>
      {reviewItems.map((item) => (
        <div 
          key={item.id} 
          className={`p-4 rounded-xl border-2 flex items-center justify-between ${
            item.status === 'approved' ? 'border-green-500 bg-green-50' : 
            item.status === 'anomaly' ? 'border-red-500 bg-red-50' : 'border-gray-200'
          }`}
        >
          <div className="flex-1">
            <p className="font-semibold text-lg">{item.description}</p>
            <p className="text-sm text-gray-600">{item.quantity} {item.unit} - R$ {item.price.toFixed(2)}</p>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => handleAction(item.id, 'approve')}
              className="h-14 w-14 flex items-center justify-center rounded-full bg-green-100 text-green-700 active:bg-green-200"
              aria-label="Aprovar"
            >
              <Check size={28} />
            </button>
            <button 
              onClick={() => handleAction(item.id, 'edit')}
              className="h-14 w-14 flex items-center justify-center rounded-full bg-yellow-100 text-yellow-700 active:bg-yellow-200"
              aria-label="Editar"
            >
              <Edit2 size={28} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
