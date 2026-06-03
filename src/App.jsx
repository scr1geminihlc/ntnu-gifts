import React, { useState, useEffect } from 'react';
import { Package, Plus, Trash2 } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

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
      quantity: parseInt(newGift.quantity) || 0 
    });
    setNewGift({ name: '', quantity: 0 });
  };

  const deleteGift = async (id) => {
    await deleteDoc(doc(db, 'gifts', id));
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Package className="text-red-600" /> 秘書室禮品管理
        </h1>
        
        <div className="flex gap-2 mb-6">
          <input className="flex-1 border rounded-lg p-2 focus:ring-2 focus:ring-red-400 outline-none" placeholder="禮品名稱" value={newGift.name} onChange={e => setNewGift({...newGift, name: e.target.value})} />
          <input className="w-16 border rounded-lg p-2 text-center" type="number" value={newGift.quantity} onChange={e => setNewGift({...newGift, quantity: e.target.value})} />
          <button onClick={addGift} className="bg-red-600 text-white px-4 rounded-lg hover:bg-red-700 transition"><Plus /></button>
        </div>

        <div className="space-y-3">
          {gifts.map(gift => (
            <div key={gift.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border">
              <span className="font-medium text-gray-700">{gift.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">庫存: {gift.quantity}</span>
                <button onClick={() => deleteGift(gift.id)} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
