import React, { useState, useEffect } from 'react';
import { Shield, Eye, Package, History, Plus, X, Search, FileText, UserSearch, Image as ImageIcon, Download, ArrowRightLeft, ClipboardCheck, Info, Hash, Edit2, Upload, Cloud, ZoomIn, Move } from 'lucide-react';

// ==========================================
// Firebase 雲端資料庫設定區
// ==========================================
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';

let app, auth, db, appId;

try {
  if (typeof __firebase_config !== 'undefined') {
    const firebaseConfig = JSON.parse(__firebase_config);
    app = initializeApp(firebaseConfig);
    appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  } else {
    // 💡 您的專屬 Firebase 設定碼
    const firebaseConfig = {
      apiKey: "AIzaSyDMVW5Nq_ztnDcD1WYNLCL93O_YeuMBfLw",
      authDomain:  "ntnu-gifts.firebaseapp.com",
      projectId: "ntnu-gifts",
      storageBucket: "ntnu-gifts.appspot.com",
      messagingSenderId:  "739751059916",
      appId: "1:739751059916:web:e1ba24410e3ee0d66cbd69",
      measurementId: "G-YGYGVS2TCY"
    };
    app = initializeApp(firebaseConfig);
    appId = 'ntnu-secretariat-gifts'; 
  }
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.error("Firebase 初始化失敗:", error);
}

const getGiftsCollectionPath = () => `artifacts/${appId}/public/data/gifts`;

// ==========================================
// 工具函數與初始資料
// ==========================================
const parseNumbers = (str) => {
  const result = new Set();
  const parts = str.split(',').map(s => s.trim());
  parts.forEach(part => {
    if (!part) return;
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end) && start <= end) {
        for (let i = start; i <= end; i++) result.add(i);
      }
    } else {
      const num = Number(part);
      if (!isNaN(num) && num > 0) result.add(num);
    }
  });
  return Array.from(result).sort((a, b) => a - b);
};

const handleImageUpload = (e, callback) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result);
    reader.readAsDataURL(file);
  }
};

const initialGifts = [
  {
    id: 'g1',
    name: '小水晶',
    stock: 125,
    reserves: { '校長': 7 }, 
    isTracked: true,
    isNumbered: false,
    image: 'https://images.unsplash.com/photo-1550420786-095b341c2c3f?auto=format&fit=crop&q=80&w=400',
    history: [
      { id: 1, date: '2024-11-21', target: '入庫', change: 502, sender: '採購', note: '8箱(7箱*70、1箱*12)' },
      { id: 2, date: '2024-12-31', target: '1/2基金會董事', change: -17, sender: '校長', note: '' }
    ]
  },
  {
    id: 'g5',
    name: '舊圖書館版畫',
    stock: 4,
    reserves: {},
    isTracked: true,
    isNumbered: true,
    availableNumbers: [76, 84, 100, 101], 
    numberedReserves: {},
    image: 'https://images.unsplash.com/photo-1578301978693-85fa9c03fa75?auto=format&fit=crop&q=80&w=400',
    history: [
      { id: 1, date: '2023-06-06', target: '102校慶-江明賢老師畫作', change: 102, sender: '系統', note: '初始發行' }
    ]
  },
  {
    id: 'g11',
    name: '師大校園風景明信片組',
    stock: null, 
    reserves: {},
    isTracked: false,
    isNumbered: false,
    image: 'https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&q=80&w=400',
    note: '此為常態性供應之文宣品，無需登記進出庫存。請直接至秘書室外側 3 號鐵櫃第二層自由拿取。',
    history: []
  }
];

export default function App() {
  const [role, setRole] = useState('viewer'); 
  const [gifts, setGifts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGift, setSelectedGift] = useState(null);
  
  // 拖曳排序狀態
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const [user, setUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(true);

  const [isAddGiftModalOpen, setIsAddGiftModalOpen] = useState(false);
  const [newGiftData, setNewGiftData] = useState({ name: '', stock: '', image: '', isTracked: true, isNumbered: false, totalNumbers: '', note: '' });
  
  const [isEditGiftModalOpen, setIsEditGiftModalOpen] = useState(false);
  const [editGiftData, setEditGiftData] = useState({ name: '', note: '' });

  const [isRecipientSearchModalOpen, setIsRecipientSearchModalOpen] = useState(false);
  const [recipientSearchTerm, setRecipientSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
  const [formData, setFormData] = useState({
    recordType: 'normal', 
    date: new Date().toISOString().split('T')[0],
    senderOption: '校長', 
    customSender: '',
    target: '',
    change: '',
    note: ''
  });
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedNumbers, setSelectedNumbers] = useState([]); 
  const [normalDirection, setNormalDirection] = useState('out'); 
  const [incomingNumbersStr, setIncomingNumbersStr] = useState(''); 
  const [fullScreenImage, setFullScreenImage] = useState(null); 

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("驗證失敗:", err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const path = getGiftsCollectionPath();
    const q = collection(db, path);

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        for (let i = 0; i < initialGifts.length; i++) {
          const g = { ...initialGifts[i], order: i };
          await setDoc(doc(db, path, g.id), g);
        }
      } else {
        const loadedGifts = snapshot.docs.map(d => d.data());
        // 依照 order 欄位排序
        loadedGifts.sort((a, b) => {
          const oA = a.order !== undefined ? a.order : 999999;
          const oB = b.order !== undefined ? b.order : 999999;
          if (oA !== oB) return oA - oB;
          return a.id.localeCompare(b.id);
        });
        setGifts(loadedGifts);
      }
      setIsSyncing(false);
    }, (error) => {
      console.error("監聽資料失敗:", error);
      setIsSyncing(false);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (selectedGift) {
      const updated = gifts.find
