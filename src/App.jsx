import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2 } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

// 請將下方的 firebaseConfig 替換成您自己的 Firebase 設定
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  const [gifts, setGifts] = useState([]);
  const [newGift, setNewGift] = useState({ name: '', quantity: 0 });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'gifts'), (snapshot) => {
      setGifts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const addGift = async () => {
    if (!newGift.name) return;
    await addDoc(collection(db, 'gifts'), { 
      name: newGift.name, 
      quantity: parseInt(newGift.quantity) 
    });
    setNewGift({ name: '', quantity: 0 });
  };

  const deleteGift = async (id) => {
    await deleteDoc(doc(db, 'gifts', id));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="max-w-2xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-red-800 flex items-center gap-2">
          <Package className="w-8 h-8" /> 秘書室禮品管理系統
        </h1>
      </header>

      <main className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-6 space-y-6">
        {/* 新增區塊 */}
        <div className="flex gap-2">
          <input className="border p-2 rounded flex-1" placeholder="禮品名稱" value={newGift.name} onChange={e => setNewGift({...newGift, name: e.target.value})} />
          <input className="border p-2 rounded w-20" type="number" value={newGift.quantity} onChange={e => setNewGift({...newGift, quantity: e.target.value})} />
          <button onClick={addGift} className="bg-red-700 text-white p-2 rounded flex items-center"><Plus /></button>
        </div>

        {/* 列表區塊 */}
        <div className="space-y-2">
          {gifts.map(gift => (
            <div key={gift.id} className="flex justify-between items-center border-b p-2">
              <span>{gift.name} (庫存: {gift.quantity})</span>
              <button onClick={() => deleteGift(gift.id)} className="text-red-500"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
