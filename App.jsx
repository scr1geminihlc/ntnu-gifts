import React from 'react';
import { Package } from 'lucide-react';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="max-w-4xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-red-800 flex items-center gap-2">
          <Package className="w-8 h-8" /> 秘書室禮品管理系統
        </h1>
      </header>
      <main className="max-w-4xl mx-auto bg-white rounded-xl shadow-md p-6">
        <p className="text-gray-500">系統運作中...</p>
      </main>
    </div>
  );
}
