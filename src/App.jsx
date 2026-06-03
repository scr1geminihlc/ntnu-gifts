import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2 } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

// 將您剛剛複製的那段代碼直接貼在下面這行的後面
const firebaseConfig = {
  apiKey: "AIzaSyDMVW5Nq_ztnDcD1WYNLCL930_YeuMBfLw",
  authDomain: "ntnu-gifts.firebaseapp.com",
  databaseURL: "https://ntnu-gifts-default-rtdb.firebaseio.com",
  projectId: "ntnu-gifts",
  storageBucket: "ntnu-gifts.appspot.com",
  messagingSenderId: "739751059916",
  appId: "1:739751059916:web:be11a09d5888fe5a6cbd69",
  measurementId: "G-QQX2SJ9R1D"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  const [gifts, setGifts] = useState([]);
  const [newGift, setNewGift] = useState({ name: '', quantity: 0 });

  useEffect(() => {
    // 監聽 Firestore 中的 'gifts' 集合
    const unsubscribe = onSnapshot(collection(db, 'gifts'), (snapshot) => {
      setGifts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const addGift = async () => {
    if (!newGift.name) return;
    await addDoc(collection(db, 'gifts'), { 
      name: newGift.name, 
      quantity: parseInt(newGift.quantity) || 0
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
        <div className="flex gap-2">
          <input className="border p-2 rounded flex-1" placeholder="禮品名稱" value={newGift.name} onChange={e => setNewGift({...newGift, name: e.target.value})} />
          <input className="border p-2 rounded w-20" type="number" value={newGift.quantity} onChange={e => setNewGift({...newGift, quantity: e.target.value})} />
          <button onClick={addGift} className="bg-red-700 text-white p-2 rounded">新增</button>
        </div>
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
