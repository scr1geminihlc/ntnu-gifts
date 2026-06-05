import React, { useState, useEffect } from 'react';
import { Shield, Eye, Package, History, Plus, X, Search, FileText, UserSearch, Image as ImageIcon, Download, ArrowRightLeft, ClipboardCheck, Info, Hash, Edit2, Upload, Cloud, ZoomIn, Move, FileSpreadsheet, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

// ==========================================
// Firebase 雲端資料庫設定區
// ==========================================
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
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

const getSenderColorClasses = (sender) => {
  if (!sender) return 'text-slate-600 bg-slate-100 border-slate-200';
  if (sender.includes('陳副')) return 'text-blue-700 bg-blue-50 border-blue-200';
  if (sender.includes('張副')) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (sender.includes('楊副')) return 'text-amber-700 bg-amber-50 border-amber-200';
  if (sender.includes('主秘')) return 'text-purple-700 bg-purple-50 border-purple-200';
  if (sender.includes('校長')) return 'text-pink-700 bg-pink-50 border-pink-200';
  return 'text-slate-600 bg-slate-100 border-slate-200';
};

export default function App() {
  const [role, setRole] = useState('viewer'); 
  const [gifts, setGifts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sortBy, setSortBy] = useState('newest');
  const [selectedGift, setSelectedGift] = useState(null);
  
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const [user, setUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(true);

  const [isAddGiftModalOpen, setIsAddGiftModalOpen] = useState(false);
  const [newGiftData, setNewGiftData] = useState({ name: '', stock: '', image: '', isTracked: true, isNumbered: false, totalNumbers: '', note: '' });
  
  const [isEditGiftModalOpen, setIsEditGiftModalOpen] = useState(false);
  const [editGiftData, setEditGiftData] = useState({ name: '', note: '', stock: 0, availableNumbersStr: '' });

  const [isRecipientSearchModalOpen, setIsRecipientSearchModalOpen] = useState(false);
  const [recipientSearchTerm, setRecipientSearchTerm] = useState('');
  const [expandedSearchItems, setExpandedSearchItems] = useState({});

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
        await signInAnonymously(auth);
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
      if (!snapshot.empty) {
        const loadedGifts = snapshot.docs.map(d => d.data());
        loadedGifts.sort((a, b) => {
          const oA = a.order !== undefined ? a.order : 999999;
          const oB = b.order !== undefined ? b.order : 999999;
          if (oA !== oB) return oA - oB;
          return a.id.localeCompare(b.id);
        });
        setGifts(loadedGifts);
      } else {
        setGifts([]);
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
      const updated = gifts.find(g => g.id === selectedGift.id);
      if (updated) setSelectedGift(updated);
    }
  }, [gifts]);

  const sortedAndFilteredGifts = gifts
    .filter(gift => gift.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'zh-TW');
      if (sortBy === 'stockDesc') {
        const stockA = a.isTracked === false ? -1 : (a.stock || 0);
        const stockB = b.isTracked === false ? -1 : (b.stock || 0);
        return stockB - stockA;
      }
      if (sortBy === 'stockAsc') {
        const stockA = a.isTracked === false ? 999999 : (a.stock || 0);
        const stockB = b.isTracked === false ? 999999 : (b.stock || 0);
        return stockA - stockB;
      }
      if (a.order !== undefined && b.order !== undefined) return a.order - b.order;
      if (a.id.length !== b.id.length) return b.id.length - a.id.length;
      return b.id.localeCompare(a.id);
    });

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    
    if (!window.confirm('準備匯入 Excel 禮品清冊。\n\n系統將會自動讀取每一個分頁的歷史紀錄並建檔。這大約需要 1~2 秒鐘，確定要匯入嗎？')) {
      e.target.value = '';
      return;
    }

    setIsSyncing(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        const workbook = window.XLSX.read(data, { type: 'binary' });
        
        let giftCounter = gifts.length + 1;
        const promises = [];

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const rawData = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
          
          let headerRowIdx = -1;
          for (let i = 0; i < Math.min(10, rawData.length); i++) {
            const rowStr = JSON.stringify(rawData[i]);
            if (rowStr.includes('日期') && (rowStr.includes('入') || rowStr.includes('出') || rowStr.includes('姓名'))) {
              headerRowIdx = i;
              break;
            }
          }
          
          if (headerRowIdx === -1) continue;

          const headers = rawData[headerRowIdx];
          const rows = rawData.slice(headerRowIdx + 1);

          const dateCol = headers.findIndex(h => h && String(h).includes('日期'));
          const targetCol = headers.findIndex(h => h && (String(h).includes('對象') || String(h).includes('姓名')));
          const inCol = headers.findIndex(h => h && String(h).includes('入數量'));
          const outCol = headers.findIndex(h => h && String(h).includes('出數量') && !String(h).includes('茶') && !String(h).includes('校'));
          const noteCol = headers.findIndex(h => h && String(h).includes('備註'));
          
          const outCol1 = headers.findIndex(h => h === '茶水間出數量');
          const outCol2 = headers.findIndex(h => h === '校長室出數量');

          let currentStock = 0;
          const history = [];

          rows.forEach((row, idx) => {
            if (!row || row.length === 0) return;
            
            let outVal = 0;
            if (sheetName === '溪畔寫生絲巾') {
              outVal = (parseInt(row[outCol1]) || 0) + (parseInt(row[outCol2]) || 0);
            } else {
              outVal = parseInt(row[outCol]) || 0;
            }
            const inVal = parseInt(row[inCol]) || 0;
            const change = inVal - outVal;

            let dateStr = row[dateCol] ? String(row[dateCol]).trim() : '';
            if (dateStr) {
               dateStr = dateStr.replace(/\//g, '-').split(' ')[0];
            }

            const targetStr = row[targetCol] ? String(row[targetCol]).trim() : '';
            const noteStr = row[noteCol] ? String(row[noteCol]).trim() : '';

            if (dateStr && (change !== 0 || targetStr || noteStr)) {
              history.push({
                id: Date.now() + idx,
                date: dateStr,
                target: targetStr || (change > 0 ? '入庫' : '未知'),
                change: change,
                sender: '系統匯入',
                note: noteStr
              });
              currentStock += change;
            }
          });

          if (history.length > 0) {
            const newId = `g${Date.now()}_${giftCounter}`;
            const isNumberedGift = sheetName.includes('版畫');
            const newGift = {
              id: newId,
              name: sheetName,
              stock: currentStock,
              reserves: {},
              isTracked: true,
              isNumbered: isNumberedGift,
              availableNumbers: isNumberedGift ? [76, 84, 100, 101] : [],
              numberedReserves: {},
              image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&q=80&w=400',
              note: '由 Excel 匯入的資料，請更新實體照片。',
              history: history.reverse(),
              order: giftCounter
            };
            giftCounter++;
            promises.push(setDoc(doc(db, getGiftsCollectionPath(), newId), newGift));
          }
        }

        await Promise.all(promises);
        setIsSyncing(false);
        alert('🎉 太神啦！所有歷史資料及 600 多筆送禮紀錄已成功匯入！\n\n您現在可以使用「防重複查詢」功能了！');
        
      } catch (err) {
        console.error(err);
        setIsSyncing(false);
        alert('匯入失敗，請確認檔案是否為原本的 Excel 格式。');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleDrop = async (e, targetGift) => {
    e.preventDefault();
    setDragOverId(null);
    if (!draggedId || draggedId === targetGift.id) return;

    const currentGifts = [...gifts];
    const draggedIndex = currentGifts.findIndex(g => g.id === draggedId);
    const targetIndex = currentGifts.findIndex(g => g.id === targetGift.id);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [draggedItem] = currentGifts.splice(draggedIndex, 1);
    currentGifts.splice(targetIndex, 0, draggedItem);

    const optimisticallyUpdatedGifts = currentGifts.map((g, i) => ({ ...g, order: i }));
    setGifts(optimisticallyUpdatedGifts);

    try {
      const updatePromises = optimisticallyUpdatedGifts.map((g, index) => {
        if (g.order !== gifts.find(oldG => oldG.id === g.id)?.order) {
           return setDoc(doc(db, getGiftsCollectionPath(), g.id), { ...g, order: index });
        }
        return null;
      }).filter(Boolean);
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error("更新排序失敗", error);
    }
  };

  const openGiftDetails = (gift) => {
    setSelectedGift(gift);
    setIsModalOpen(true);
    setSelectedNumbers([]);
    setNormalDirection('out');
    setIncomingNumbersStr('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedGift(null);
    setFormData({
      recordType: 'normal',
      date: new Date().toISOString().split('T')[0],
      senderOption: '校長',
      customSender: '',
      target: '',
      change: '',
      note: ''
    });
  };

  const handleAdminClick = () => {
    if (role === 'admin') return; 
    setIsPasswordModalOpen(true);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === '5400') {
      setRole('admin');
      setIsPasswordModalOpen(false);
      setPasswordInput('');
      setPasswordError('');
    } else {
      setPasswordError('密碼錯誤，請重新輸入。');
    }
  };

  const handleDeleteGift = async () => {
    if (!selectedGift || !user || role !== 'admin') return;
    const isConfirm = window.confirm(`⚠️ 警告：確定要永久刪除「${selectedGift.name}」嗎？\n\n這將會連同裡面所有的進出歷史紀錄一併刪除，且無法復原！`);
    if (isConfirm) {
      try {
        await deleteDoc(doc(db, getGiftsCollectionPath(), selectedGift.id));
        setIsModalOpen(false);
        setSelectedGift(null);
      } catch (error) {
        console.error("刪除失敗", error);
        alert('刪除失敗，請稍後再試。');
      }
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!selectedGift || !user || role !== 'admin') return;
    
    const recordToDelete = selectedGift.history.find(r => r.id === recordId);
    if (!recordToDelete) return;

    const confirmMessage = selectedGift.isNumbered 
      ? '⚠️ 確定要刪除這筆紀錄嗎？\n\n系統將會自動把這筆紀錄的「數量」與「綁定編號」加回庫存與選單中。'
      : '⚠️ 確定要刪除這筆紀錄嗎？\n\n系統將會自動把這筆紀錄的「數量」加回庫存中。';

    if (window.confirm(confirmMessage)) {
      const updatedHistory = selectedGift.history.filter(r => r.id !== recordId);
      
      let newStock = selectedGift.stock;
      let newReserves = { ...(selectedGift.reserves || {}) };
      let newAvailableNumbers = selectedGift.isNumbered ? [...(selectedGift.availableNumbers || [])] : [];
      let newNumberedReserves = selectedGift.isNumbered ? { ...(selectedGift.numberedReserves || {}) } : {};

      const isWithdraw = recordToDelete.target.includes('【提領備用】');
      const isLog = recordToDelete.target.includes('【備用補登】');
      const isNormalOut = recordToDelete.change < 0 && !isWithdraw && !isLog;
      const isNormalIn = recordToDelete.change > 0 && !isLog; 
      const sender = recordToDelete.sender;
      const absChange = Math.abs(recordToDelete.change);
      const sn = recordToDelete.serialNumbers || [];

      if (isNormalOut) {
          newStock += absChange;
          if (selectedGift.isNumbered && sn.length > 0) {
              newAvailableNumbers = [...new Set([...newAvailableNumbers, ...sn])].sort((a,b)=>a-b);
          }
      } else if (isNormalIn) {
          newStock -= absChange;
          if (selectedGift.isNumbered && sn.length > 0) {
              newAvailableNumbers = newAvailableNumbers.filter(n => !sn.includes(n));
          }
      } else if (isWithdraw) {
          newStock += absChange;
          if (newReserves[sender]) {
              newReserves[sender] = Math.max(0, newReserves[sender] - absChange);
          }
          if (selectedGift.isNumbered && sn.length > 0) {
              newAvailableNumbers = [...new Set([...newAvailableNumbers, ...sn])].sort((a,b)=>a-b);
              if (newNumberedReserves[sender]) {
                  newNumberedReserves[sender] = newNumberedReserves[sender].filter(n => !sn.includes(n));
              }
          }
      } else if (isLog) {
          if (!newReserves[sender]) newReserves[sender] = 0;
          newReserves[sender] += absChange;
          if (selectedGift.isNumbered && sn.length > 0) {
              if (!newNumberedReserves[sender]) newNumberedReserves[sender] = [];
              newNumberedReserves[sender] = [...new Set([...newNumberedReserves[sender], ...sn])].sort((a,b)=>a-b);
          }
      }

      const updatedGift = { 
          ...selectedGift, 
          history: updatedHistory,
          stock: newStock,
          reserves: newReserves,
          availableNumbers: newAvailableNumbers,
          numberedReserves: newNumberedReserves
      };
      
      await setDoc(doc(db, getGiftsCollectionPath(), selectedGift.id), updatedGift);
    }
  };

  const updateExistingGiftImage = async (base64Image) => {
    if (!selectedGift || !user) return;
    const updatedGift = { ...selectedGift, image: base64Image };
    await setDoc(doc(db, getGiftsCollectionPath(), selectedGift.id), updatedGift);
  };

  const handleEditRecordSubmit = async (e) => {
    e.preventDefault();
    if (!editingRecord || !user) return;

    const oldRecord = selectedGift.history.find(r => r.id === editingRecord.id);
    let newStock = selectedGift.stock;
    let newReserves = { ...(selectedGift.reserves || {}) };

    if (!selectedGift.isNumbered) {
      const oldChange = parseInt(oldRecord.change, 10) || 0;
      const newChange = parseInt(editingRecord.change, 10) || 0;
      
      const oldIsWithdraw = oldRecord.target.includes('【提領備用】');
      const oldIsLog = oldRecord.target.includes('【備用補登】');
      const oldIsNormalOut = oldChange < 0 && !oldIsWithdraw && !oldIsLog;
      const oldIsNormalIn = oldChange > 0 && !oldIsLog;
      const oldSender = oldRecord.sender;
      const oldAbs = Math.abs(oldChange);

      if (oldIsNormalOut) { newStock += oldAbs; }
      else if (oldIsNormalIn) { newStock -= oldAbs; }
      else if (oldIsWithdraw) {
          newStock += oldAbs;
          if (newReserves[oldSender]) newReserves[oldSender] = Math.max(0, newReserves[oldSender] - oldAbs);
      }
      else if (oldIsLog) {
          if (!newReserves[oldSender]) newReserves[oldSender] = 0;
          newReserves[oldSender] += oldAbs;
      }

      const newIsWithdraw = editingRecord.target.includes('【提領備用】');
      const newIsLog = editingRecord.target.includes('【備用補登】');
      const newIsNormalOut = newChange < 0 && !newIsWithdraw && !newIsLog;
      const newIsNormalIn = newChange > 0 && !newIsLog;
      const newSender = editingRecord.sender;
      const newAbs = Math.abs(newChange);

      if (newIsNormalOut) { newStock -= newAbs; }
      else if (newIsNormalIn) { newStock += newAbs; }
      else if (newIsWithdraw) {
          newStock -= newAbs;
          newReserves[newSender] = (newReserves[newSender] || 0) + newAbs;
      }
      else if (newIsLog) {
          newReserves[newSender] = Math.max(0, (newReserves[newSender] || 0) - newAbs);
      }

      editingRecord.change = newChange;
    }

    const updatedHistory = selectedGift.history.map(record =>
      record.id === editingRecord.id ? editingRecord : record
    );
    const updatedGift = { ...selectedGift, history: updatedHistory, stock: newStock, reserves: newReserves };
    
    await setDoc(doc(db, getGiftsCollectionPath(), selectedGift.id), updatedGift);
    setEditingRecord(null);
  };

  const openEditGift = () => {
    setEditGiftData({ 
      name: selectedGift.name, 
      note: selectedGift.note || '',
      stock: selectedGift.stock || 0,
      availableNumbersStr: selectedGift.availableNumbers ? selectedGift.availableNumbers.join(', ') : ''
    });
    setIsEditGiftModalOpen(true);
  };

  const handleEditGiftSubmit = async (e) => {
    e.preventDefault();
    if (!editGiftData.name.trim() || !user) return;
    
    let newAvailableNumbers = selectedGift.availableNumbers;
    let finalStock = parseInt(editGiftData.stock, 10) || 0;

    if (selectedGift.isNumbered) {
      newAvailableNumbers = parseNumbers(editGiftData.availableNumbersStr);
      finalStock = newAvailableNumbers.length;
    }
    
    const updatedGift = { 
      ...selectedGift, 
      name: editGiftData.name.trim(), 
      note: editGiftData.note,
      stock: finalStock,
      availableNumbers: newAvailableNumbers
    };
    
    await setDoc(doc(db, getGiftsCollectionPath(), selectedGift.id), updatedGift);
    setSelectedGift(updatedGift);
    setIsEditGiftModalOpen(false);
  };

  const toggleNumberSelection = (num) => {
    setSelectedNumbers(prev => 
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num].sort((a,b) => a-b)
    );
  };

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    if (selectedGift.isTracked === false || !user) return;

    const actualSender = formData.senderOption === '自訂' ? formData.customSender : formData.senderOption;
    if (!actualSender) return;

    let historyChangeNum = 0;
    let historyTarget = formData.target;
    let finalSerialNumbers = [];
    
    let newStock = selectedGift.stock;
    let newReserves = { ...(selectedGift.reserves || {}) };
    let newAvailableNumbers = selectedGift.isNumbered ? [...(selectedGift.availableNumbers || [])] : [];
    let newNumberedReserves = selectedGift.isNumbered ? { ...(selectedGift.numberedReserves || {}) } : {};

    if (selectedGift.isNumbered) {
      if (formData.recordType === 'normal') {
        if (!formData.target) return;
        if (normalDirection === 'out') {
          if (selectedNumbers.length === 0) return; 
          historyChangeNum = -selectedNumbers.length;
          finalSerialNumbers = selectedNumbers;
          newAvailableNumbers = newAvailableNumbers.filter(n => !selectedNumbers.includes(n));
        } else {
          const parsedNums = parseNumbers(incomingNumbersStr);
          if (parsedNums.length === 0) return;
          historyChangeNum = parsedNums.length;
          finalSerialNumbers = parsedNums;
          newAvailableNumbers = [...new Set([...newAvailableNumbers, ...parsedNums])].sort((a,b)=>a-b);
        }
      } 
      else if (formData.recordType === 'withdraw') {
        if (selectedNumbers.length === 0) return;
        historyChangeNum = -selectedNumbers.length;
        historyTarget = `【提領備用】放至辦公室`;
        finalSerialNumbers = selectedNumbers;
        
        newAvailableNumbers = newAvailableNumbers.filter(n => !selectedNumbers.includes(n));
        newNumberedReserves[actualSender] = [...(newNumberedReserves[actualSender] || []), ...selectedNumbers].sort((a,b)=>a-b);
        newReserves[actualSender] = (newReserves[actualSender] || 0) + selectedNumbers.length;
      } 
      else if (formData.recordType === 'log') {
        if (!formData.target || selectedNumbers.length === 0) return;
        historyChangeNum = -selectedNumbers.length;
        historyTarget = `【備用補登】${formData.target}`;
        finalSerialNumbers = selectedNumbers;
        
        newNumberedReserves[actualSender] = (newNumberedReserves[actualSender] || []).filter(n => !selectedNumbers.includes(n));
        newReserves[actualSender] = Math.max(0, (newReserves[actualSender] || 0) - selectedNumbers.length);
      }
      newStock += (formData.recordType === 'log' ? 0 : historyChangeNum); 
    } else {
      const changeNum = parseInt(formData.change, 10);
      if (isNaN(changeNum)) return;
      if (formData.recordType === 'normal' && !formData.target) return;
      if (formData.recordType === 'log' && !formData.target) return;

      const absChange = Math.abs(changeNum);

      if (formData.recordType === 'normal') {
        newStock += changeNum;
        historyChangeNum = changeNum;
      } 
      else if (formData.recordType === 'withdraw') {
        newStock -= absChange;
        newReserves[actualSender] = (newReserves[actualSender] || 0) + absChange;
        historyChangeNum = -absChange;
        historyTarget = `【提領備用】放至辦公室`;
      } 
      else if (formData.recordType === 'log') {
        newReserves[actualSender] = Math.max(0, (newReserves[actualSender] || 0) - absChange);
        historyChangeNum = -absChange;
        historyTarget = `【備用補登】${formData.target}`;
      }
    }

    const newRecord = {
      id: Date.now(),
      date: formData.date,
      sender: actualSender,
      target: historyTarget,
      change: historyChangeNum,
      note: formData.note
    };

    if (finalSerialNumbers.length > 0) {
      newRecord.serialNumbers = finalSerialNumbers;
    }

    const updatedGift = {
      ...selectedGift,
      stock: newStock,
      reserves: newReserves,
      availableNumbers: newAvailableNumbers,
      numberedReserves: newNumberedReserves,
      history: [newRecord, ...selectedGift.history]
    };

    await setDoc(doc(db, getGiftsCollectionPath(), selectedGift.id), updatedGift);

    setFormData({ ...formData, target: '', change: '', note: '' });
    setSelectedNumbers([]);
    setIncomingNumbersStr('');
  };

  const handleAddGiftSubmit = async (e) => {
    e.preventDefault();
    if (!newGiftData.name || !user) return;

    let initialStock = null;
    let initialAvailableNums = [];
    
    if (newGiftData.isTracked) {
      if (newGiftData.isNumbered) {
        const total = parseInt(newGiftData.totalNumbers, 10) || 0;
        initialStock = total;
        initialAvailableNums = Array.from({length: total}, (_, i) => i + 1);
      } else {
        initialStock = parseInt(newGiftData.stock, 10) || 0;
      }
    }

    const initialHistoryRecord = { 
      id: Date.now(), 
      date: new Date().toISOString().split('T')[0], 
      target: '系統初始發行/入庫', 
      change: initialStock, 
      sender: '系統', 
      note: '新增禮品品項' 
    };

    if (newGiftData.isNumbered) {
      initialHistoryRecord.serialNumbers = initialAvailableNums;
    }

    const newGift = {
      id: `g${Date.now()}`,
      name: newGiftData.name,
      stock: initialStock,
      reserves: {},
      isTracked: newGiftData.isTracked,
      isNumbered: newGiftData.isNumbered,
      availableNumbers: initialAvailableNums,
      numberedReserves: {},
      image: newGiftData.image || 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&q=80&w=400',
      note: newGiftData.note || '',
      history: newGiftData.isTracked ? [initialHistoryRecord] : [],
      order: gifts.length 
    };
    
    await setDoc(doc(db, getGiftsCollectionPath(), newGift.id), newGift);

    setIsAddGiftModalOpen(false);
    setNewGiftData({ name: '', stock: '', image: '', isTracked: true, isNumbered: false, totalNumbers: '', note: '' });
  };

  const getRecipientHistory = () => {
    if (!recipientSearchTerm.trim()) return [];
    return gifts.flatMap(gift =>
      (gift.history || [])
        .filter(record => record.change < 0 && record.target.toLowerCase().includes(recipientSearchTerm.toLowerCase()))
        .map(record => ({
          giftName: gift.name,
          giftImage: gift.image,
          date: record.date,
          sender: record.sender,
          target: record.target.replace('【備用補登】', ''), 
          change: Math.abs(record.change),
          serialNumbers: record.serialNumbers,
          note: record.note
        }))
    ).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const downloadCSV = (records, filename) => {
    let csvContent = "日期,禮品名稱,贈送者/經手人,贈送對象/事項,數量異動,禮品編號(若有),備註\n";
    records.forEach(r => {
      const serialStr = r.serialNumbers ? r.serialNumbers.join('、') : '';
      const row = [
        `"${r.date}"`,
        `"${r.giftName}"`,
        `"${r.sender}"`,
        `"${r.target}"`,
        `"${r.change}"`,
        `"${serialStr}"`,
        `"${r.note}"`
      ].join(",");
      csvContent += row + "\n";
    });

    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAllCSV = () => {
    let allRecords = [];
    gifts.filter(g => g.isTracked !== false).forEach(gift => {
      gift.history.forEach(record => {
        allRecords.push({
          giftName: gift.name,
          date: record.date,
          sender: record.sender || '',
          target: record.target,
          change: record.change,
          serialNumbers: record.serialNumbers,
          note: record.note || ''
        });
      });
    });
    allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    downloadCSV(allRecords, `秘書室_所有禮品紀錄_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const exportSingleCSV = (gift) => {
    if (gift.isTracked === false) return;
    let records = [...gift.history]
      .sort((a, b) => {
        const dA = new Date(a.date).getTime() || 0;
        const dB = new Date(b.date).getTime() || 0;
        if (dB === dA) return (b.id || 0) - (a.id || 0);
        return dB - dA;
      })
      .map(record => ({
        giftName: gift.name,
        date: record.date,
        sender: record.sender || '',
        target: record.target,
        change: record.change,
        serialNumbers: record.serialNumbers,
        note: record.note || ''
      }));
    downloadCSV(records, `禮品紀錄_${gift.name}_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-600 rounded-lg flex items-center justify-center text-white shadow-sm">
              <Package size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 hidden sm:block">秘書室禮品管理系統</h1>
            
            {isSyncing ? (
              <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-md flex items-center gap-1 animate-pulse">
                <Cloud size={14} /> 連線中
              </span>
            ) : (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md flex items-center gap-1">
                <Cloud size={14} /> 雲端同步開啟
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button onClick={handleAdminClick} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${role === 'admin' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Shield size={16} /> <span className="hidden sm:inline">管理員</span><span className="sm:hidden">管理</span>
            </button>
            <button onClick={() => setRole('viewer')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${role === 'viewer' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Eye size={16} /> <span className="hidden sm:inline">秘書 (僅檢視)</span><span className="sm:hidden">檢視</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="relative flex-1 max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input type="text" placeholder="搜尋禮品名稱..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors" />
          </div>
          
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button onClick={exportAllCSV} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg font-medium transition-colors border border-emerald-200">
              <Download size={18} /> <span className="whitespace-nowrap">全部匯出</span>
            </button>
            <button onClick={() => setIsRecipientSearchModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-lg font-medium transition-colors border border-indigo-200">
              <UserSearch size={18} /> <span className="whitespace-nowrap">防重複查詢</span>
            </button>
            {role === 'admin' && (
              <>
                <label className="cursor-pointer flex-1 md:flex-none flex items-center justify-center gap-2 bg-amber-50 text-amber-700 hover:bg-amber-100 px-4 py-2 rounded-lg font-medium transition-colors border border-amber-200 shadow-sm">
                  <FileSpreadsheet size={18} /> <span className="whitespace-nowrap">Excel 匯入</span>
                  <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
                </label>
                <button onClick={() => setIsAddGiftModalOpen(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-rose-600 text-white hover:bg-rose-700 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
                  <Plus size={18} /> <span className="whitespace-nowrap">新增禮品</span>
                </button>
              </>
            )}
          </div>
        </div>

        {role === 'admin' && !searchTerm && gifts.length > 1 && (
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-6 bg-slate-200/60 px-3 py-2 rounded-lg w-fit font-medium">
            <Move size={16} className="text-slate-500" /> 
            您可以直接按住卡片「拖曳」來自由調整順序。
          </div>
        )}

        {gifts.length === 0 && !isSyncing && (
           <div className="text-center py-20 text-slate-500">
             目前沒有禮品資料。
             {role === 'admin' && <p className="mt-2 text-rose-600 font-bold">👉 請點擊上方的「Excel 匯入」上傳您的清冊！</p>}
           </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedAndFilteredGifts.map((gift) => (
            <div 
              key={gift.id} 
              draggable={role === 'admin' && !searchTerm} 
              onDragStart={(e) => {
                setDraggedId(gift.id);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', gift.id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverId !== gift.id && role === 'admin' && !searchTerm) {
                  setDragOverId(gift.id);
                }
              }}
              onDragLeave={() => setDragOverId(null)}
              onDrop={(e) => {
                if (role === 'admin' && !searchTerm) {
                  handleDrop(e, gift);
                }
              }}
              onDragEnd={() => {
                setDraggedId(null);
                setDragOverId(null);
              }}
              onClick={() => openGiftDetails(gift)}
              className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all flex flex-col relative select-none
                ${role === 'admin' && !searchTerm ? 'cursor-grab active:cursor-grabbing hover:shadow-md' : 'cursor-pointer hover:shadow-md'}
                ${dragOverId === gift.id ? 'border-rose-400 scale-[1.02] shadow-lg ring-2 ring-rose-100 z-10' : 'border-slate-200'} 
                ${draggedId === gift.id ? 'opacity-40 scale-95' : 'opacity-100'}
              `}
            >
              
              {gift.isNumbered && (
                 <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur text-white px-2.5 py-1 rounded-md text-xs font-bold z-10 flex items-center gap-1 shadow-sm">
                   <Hash size={12}/> 限量編號
                 </div>
              )}

              <div className="h-48 overflow-hidden relative bg-slate-50 flex items-center justify-center p-2">
                <img src={gift.image} alt={gift.name} className="max-w-full max-h-full object-contain pointer-events-none" />
                <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                  {gift.isTracked !== false ? (
                    <>
                      <div className="bg-white/95 backdrop-blur px-3 py-1 rounded-full shadow-sm text-sm font-bold text-slate-700 border border-slate-100">
                        在庫: <span className={gift.stock < 10 ? 'text-red-500' : 'text-emerald-600'}>{gift.stock}</span>
                      </div>
                      {Object.values(gift.reserves || {}).reduce((a, b) => a + b, 0) > 0 && (
                        <div className="bg-amber-100/95 backdrop-blur px-2.5 py-0.5 rounded-full shadow-sm text-xs font-semibold text-amber-700 border border-amber-200">
                          另有備用: {Object.values(gift.reserves).reduce((a, b) => a + b, 0)}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-blue-100/95 backdrop-blur px-3 py-1 rounded-full shadow-sm text-sm font-bold text-blue-700 border border-blue-200 flex items-center gap-1">
                      <Info size={14} /> 免登記
                    </div>
                  )}
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between pointer-events-none">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{gift.name}</h3>
                  {gift.isTracked !== false ? (
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <History size={14} /> 最新異動: {gift.history.length > 0 ? gift.history[0].date : '無紀錄'}
                    </p>
                  ) : (
                    <p className="text-sm text-blue-600 flex items-center gap-1">
                      常態供應禮品，無需控管
                    </p>
                  )}
                </div>
                <button className="mt-4 w-full py-2 bg-slate-50 text-slate-700 rounded-lg border border-slate-200 font-medium transition-colors flex items-center justify-center gap-2 pointer-events-auto hover:bg-slate-100">
                  <FileText size={16} /> {gift.isTracked !== false ? '查看與管理' : '查看資訊'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* 密碼輸入 Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Shield size={20} className="text-rose-600" /> 管理員身分驗證</h3>
              <button onClick={() => { setIsPasswordModalOpen(false); setPasswordInput(''); setPasswordError(''); }} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm"><X size={20} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">請輸入管理員密碼</label>
                  <input type="password" autoFocus required placeholder="請輸入密碼" value={passwordInput} onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(''); }} className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none ${passwordError ? 'border-red-300 focus:ring-red-500' : 'border-slate-300 focus:ring-rose-500'}`} />
                  {passwordError && <p className="text-sm text-red-500 mt-1.5">{passwordError}</p>}
                </div>
                <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-2">確認驗證</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 詳情與編輯 Modal */}
      {isModalOpen && selectedGift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className={`bg-white rounded-2xl shadow-xl w-full max-h-[95vh] overflow-y-auto md:overflow-hidden flex flex-col md:flex-row relative ${selectedGift.isTracked === false ? 'max-w-3xl' : 'max-w-6xl'}`}>
            
            {/* ======= 免登記禮品 (圖錄展示模式) ======= */}
            {selectedGift.isTracked === false ? (
              <div className="w-full p-6 md:p-10 flex flex-col items-center bg-slate-50 md:overflow-y-auto">
                <div className="w-full flex justify-between items-center mb-6">
                   <div className="flex items-center gap-3">
                     <h2 className="text-2xl font-bold text-slate-900">{selectedGift.name}</h2>
                     {role === 'admin' && (
                       <div className="flex items-center gap-1">
                         <button onClick={openEditGift} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="編輯名稱與備註">
                           <Edit2 size={18} />
                         </button>
                         <button onClick={handleDeleteGift} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="刪除此禮品">
                           <Trash2 size={18} />
                         </button>
                       </div>
                     )}
                   </div>
                   <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
                </div>
                <div className="bg-blue-100 text-blue-800 px-4 py-1.5 rounded-full text-sm font-bold mb-6 flex items-center gap-2"><Info size={16} /> 常態供應 / 免登記庫存</div>
                
                <div 
                  className="rounded-xl overflow-hidden w-full max-w-2xl shadow-md border border-slate-200 mb-6 bg-slate-50 relative group flex items-center justify-center p-4 cursor-pointer"
                  onClick={() => setFullScreenImage(selectedGift.image)}
                >
                  <img src={selectedGift.image} alt={selectedGift.name} className="max-w-full h-auto object-contain max-h-[60vh]" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                     <ZoomIn className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md transition-opacity" size={48} />
                  </div>
                  {role === 'admin' && (
                    <label 
                      onClick={e => e.stopPropagation()} 
                      className="absolute bottom-3 right-3 bg-white/90 backdrop-blur text-slate-700 px-3 py-1.5 rounded-lg shadow-sm border border-slate-200 text-sm font-bold cursor-pointer hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-1.5 transition-colors pointer-events-auto"
                    >
                       <Upload size={14} /> 更換圖片
                       <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, updateExistingGiftImage)} />
                    </label>
                  )}
                </div>

                {selectedGift.note && (
                  <div className="bg-white p-5 rounded-xl border border-slate-200 w-full max-w-2xl shadow-sm">
                    <h4 className="text-sm font-bold text-slate-500 mb-2">禮品說明 / 存放位置</h4>
                    <p className="text-slate-800 text-lg">{selectedGift.note}</p>
                  </div>
                )}
              </div>
            ) : (
              // ======= 一般列管禮品 (管理模式) =======
              <>
                {/* 左側：禮品資訊與表單 */}
                <div className="w-full md:w-[45%] p-6 md:p-8 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col bg-slate-50 md:overflow-y-auto">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-full pr-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex items-center gap-3">
                          <h2 className="text-2xl font-bold text-slate-900">{selectedGift.name}</h2>
                          {role === 'admin' && (
                            <div className="flex items-center gap-1">
                              <button onClick={openEditGift} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="編輯庫存與基本資料">
                                <Edit2 size={18} />
                              </button>
                              <button onClick={handleDeleteGift} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors" title="刪除此禮品">
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                        {selectedGift.isNumbered && <span className="bg-slate-800 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1"><Hash size={12}/> 具獨立編號</span>}
                      </div>
                      
                      <div className="mt-3 flex flex-wrap gap-3 items-start">
                        <div className="bg-white px-4 py-3 rounded-xl border border-emerald-100 shadow-sm flex-shrink-0">
                          <div className="text-sm text-slate-500 font-medium mb-1">實際在庫總數</div>
                          <div className="text-3xl font-black text-emerald-600 leading-none">{selectedGift.stock}</div>
                        </div>
                        
                        {Object.keys(selectedGift.reserves || {}).length > 0 && (
                          <div className="flex-1 min-w-[150px] bg-amber-50 px-4 py-3 rounded-xl border border-amber-100 shadow-sm">
                            <div className="text-sm text-amber-700 font-medium mb-2 border-b border-amber-200 pb-1">各處室備用中 (不含在庫)</div>
                            <div className="flex flex-col gap-1.5 mt-1">
                              {Object.entries(selectedGift.reserves).map(([name, qty]) => 
                                qty > 0 && (
                                  <div key={name} className="flex justify-between items-start bg-white/60 px-2 py-1 rounded">
                                    <span className="text-sm font-bold text-amber-900">{name}: <span className="text-amber-600">{qty}</span> </span>
                                    {selectedGift.isNumbered && selectedGift.numberedReserves && selectedGift.numberedReserves[name]?.length > 0 && (
                                      <span className="text-[11px] text-amber-700 mt-0.5 text-right font-mono ml-2 leading-tight max-w-[120px] break-words">
                                        #{selectedGift.numberedReserves[name].join(', #')}
                                      </span>
                                    )}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {selectedGift.isNumbered && selectedGift.availableNumbers?.length > 0 && (
                        <div className="mt-3 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                          <span className="font-bold block mb-1">目前倉庫現有編號：</span>
                          <span className="font-mono">{selectedGift.availableNumbers.join(', ')}</span>
                        </div>
                      )}
                      {selectedGift.note && (
                        <div className="mt-3 text-sm text-slate-600 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100/50">
                          <span className="font-bold block mb-1 text-indigo-800">存放位置 / 備註：</span>
                          {selectedGift.note}
                        </div>
                      )}
                    </div>
                    <button onClick={closeModal} className="md:hidden p-2 text-slate-400 hover:text-slate-600 bg-slate-200 rounded-full flex-shrink-0"><X size={20} /></button>
                  </div>

                  <div 
                    className="rounded-xl overflow-hidden h-56 mb-6 shadow-sm border border-slate-200 flex-shrink-0 relative group bg-slate-50 flex items-center justify-center p-2 cursor-pointer"
                    onClick={() => setFullScreenImage(selectedGift.image)}
                  >
                    <img src={selectedGift.image} alt={selectedGift.name} className="max-w-full max-h-full object-contain" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                       <ZoomIn className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md transition-opacity" size={40} />
                    </div>
                    {role === 'admin' && (
                      <label 
                        onClick={e => e.stopPropagation()} 
                        className="absolute bottom-2 right-2 bg-white/90 backdrop-blur text-slate-700 px-2.5 py-1 rounded-md shadow-sm border border-slate-200 text-xs font-bold cursor-pointer hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-1 transition-colors pointer-events-auto"
                      >
                         <Upload size={12} /> 更換圖片
                         <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, updateExistingGiftImage)} />
                      </label>
                    )}
                  </div>

                  {role === 'admin' ? (
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-1 mt-2">
                      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Plus size={18} className="text-rose-500" /> 新增異動
                      </h3>
                      
                      <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                        <button type="button" onClick={() => setFormData({...formData, recordType: 'normal'})} className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${formData.recordType === 'normal' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                          一般進出庫
                        </button>
                        <button type="button" onClick={() => setFormData({...formData, recordType: 'withdraw'})} className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${formData.recordType === 'withdraw' ? 'bg-amber-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                          長官提領備用
                        </button>
                        <button type="button" onClick={() => setFormData({...formData, recordType: 'log'})} className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${formData.recordType === 'log' ? 'bg-indigo-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                          備用發放補登
                        </button>
                      </div>

                      <form onSubmit={handleRecordSubmit} className="space-y-4">
                        
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                          <label className="block text-sm font-medium text-slate-700 mb-1">
                            {formData.recordType === 'normal' ? '贈送者 / 經手人' : formData.recordType === 'withdraw' ? '提領備用之長官' : '發放備用之長官'}
                          </label>
                          <div className="flex gap-2">
                            <select value={formData.senderOption} onChange={(e) => setFormData({...formData, senderOption: e.target.value})} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white">
                              <option value="校長">校長</option>
                              <option value="陳副校長">陳副校長</option>
                              <option value="張副校長">張副校長</option>
                              <option value="楊副校長">楊副校長</option>
                              <option value="主秘">主秘</option>
                              <option value="自訂">自訂...</option>
                            </select>
                            {formData.senderOption === '自訂' && (
                              <input type="text" required placeholder="請輸入姓名/單位" value={formData.customSender} onChange={(e) => setFormData({...formData, customSender: e.target.value})} className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none" />
                            )}
                          </div>
                        </div>

                        {selectedGift.isNumbered && formData.recordType === 'normal' && (
                           <div className="flex gap-4 mb-2">
                             <label className="flex items-center gap-2 cursor-pointer">
                               <input type="radio" checked={normalDirection === 'out'} onChange={() => setNormalDirection('out')} className="text-rose-500 focus:ring-rose-500" />
                               <span className="text-sm font-bold text-slate-700">出庫 (送出)</span>
                             </label>
                             <label className="flex items-center gap-2 cursor-pointer">
                               <input type="radio" checked={normalDirection === 'in'} onChange={() => setNormalDirection('in')} className="text-emerald-500 focus:ring-emerald-500" />
                               <span className="text-sm font-bold text-slate-700">進庫 (補貨/退回)</span>
                             </label>
                           </div>
                        )}

                        <div className={`grid gap-4 ${!selectedGift.isNumbered ? 'grid-cols-2' : 'grid-cols-1'}`}>
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">日期</label>
                            <input type="date" required value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none" />
                          </div>

                          {!selectedGift.isNumbered ? (
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-1">
                                {formData.recordType === 'normal' ? '數量 (+進, -出)' : '數量 (請輸入正整數)'}
                              </label>
                              <input type="number" required min={formData.recordType !== 'normal' ? "1" : undefined} placeholder={formData.recordType === 'normal' ? '例: 10 或 -5' : '例: 3'} value={formData.change} onChange={(e) => setFormData({...formData, change: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono" />
                            </div>
                          ) : (
                            <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                               {formData.recordType === 'normal' && normalDirection === 'in' ? (
                                  <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">請輸入要入庫的編號 <Info size={14} className="text-slate-400" title="可使用逗號或連字號，例如: 1, 3, 5-10"/></label>
                                    <input type="text" required placeholder="例: 1, 3, 5-10" value={incomingNumbersStr} onChange={(e) => setIncomingNumbersStr(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono" />
                                  </div>
                               ) : (
                                  <div>
                                    <div className="flex justify-between items-end mb-2">
                                      <label className="block text-sm font-medium text-slate-700">
                                        請點選要操作的編號：
                                      </label>
                                      {selectedNumbers.length > 0 && (
                                        <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded">已選 {selectedNumbers.length} 件</span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                                       {(() => {
                                          let pool = [];
                                          if (formData.recordType === 'normal' || formData.recordType === 'withdraw') {
                                            pool = selectedGift.availableNumbers || [];
                                          } else if (formData.recordType === 'log') {
                                            const sender = formData.senderOption === '自訂' ? formData.customSender : formData.senderOption;
                                            pool = selectedGift.numberedReserves[sender] || [];
                                          }
                                          
                                          if (pool.length === 0) {
                                            return <div className="text-sm text-slate-400 py-2">目前無可選編號</div>;
                                          }

                                          return pool.map(num => (
                                            <button 
                                              key={num} 
                                              type="button"
                                              onClick={() => toggleNumberSelection(num)}
                                              className={`w-10 h-10 rounded-md font-mono text-sm border flex items-center justify-center transition-all
                                                ${selectedNumbers.includes(num) 
                                                  ? 'bg-rose-500 text-white border-rose-600 shadow-inner' 
                                                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
                                                }`}
                                            >
                                              {num}
                                            </button>
                                          ));
                                       })()}
                                    </div>
                                  </div>
                               )}
                            </div>
                          )}
                        </div>

                        {formData.recordType !== 'withdraw' && (
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">對象 / 事項</label>
                            {/* 更新：改為 textarea 支援換行 */}
                            <textarea rows="3" required placeholder={formData.recordType === 'log' ? '請輸入補登之贈送對象' : '例: 贈送給某某校長'} value={formData.target} onChange={(e) => setFormData({...formData, target: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none" />
                          </div>
                        )}
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">備註 (選填)</label>
                          <textarea rows="2" value={formData.note} onChange={(e) => setFormData({...formData, note: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none" />
                        </div>

                        <button type="submit" className={`w-full text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2 ${formData.recordType === 'normal' ? 'bg-rose-600 hover:bg-rose-700' : formData.recordType === 'withdraw' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                          送出更新
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="bg-blue-50 text-blue-800 p-5 rounded-xl border border-blue-100 flex-1 flex flex-col items-center justify-center text-center mt-4">
                      <Shield size={48} className="text-blue-200 mb-3" />
                      <h3 className="font-bold mb-1">您目前為檢視模式</h3>
                      <p className="text-sm opacity-80">請點擊右上角「管理員」按鈕輸入密碼解鎖。</p>
                    </div>
                  )}
                </div>

                {/* 右側：歷史紀錄 */}
                <div className="w-full md:w-[55%] flex flex-col bg-slate-100 border-l border-slate-200 md:overflow-y-auto">
                  <div className="p-4 md:p-6 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-10 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <History size={20} className="text-slate-500" /> 歷史紀錄
                    </h3>
                    <div className="flex gap-2">
                      <button onClick={() => exportSingleCSV(selectedGift)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200" title="僅匯出此禮品的紀錄">
                        <Download size={16} /> <span className="hidden sm:inline">單項匯出</span>
                      </button>
                      <button onClick={closeModal} className="hidden md:flex p-1.5 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4 md:p-6 md:overflow-y-auto flex-1">
                    <div className="space-y-4">
                      {selectedGift.history.length === 0 ? (
                        <div className="text-center text-slate-400 py-10">尚無紀錄</div>
                      ) : (
                        [...selectedGift.history]
                        .sort((a, b) => {
                          const dA = new Date(a.date).getTime() || 0;
                          const dB = new Date(b.date).getTime() || 0;
                          if (dB === dA) return (b.id || 0) - (a.id || 0);
                          return dB - dA;
                        })
                        .map((record, index) => {
                          const isLog = record.target.includes('【備用補登】');
                          const isWithdraw = record.target.includes('【提領備用】');
                          
                          return (
                          <div key={record.id || index} className={`flex gap-4 p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow ${isLog ? 'border-indigo-200' : isWithdraw ? 'border-amber-200' : 'border-slate-200'}`}>
                            <div className="flex-shrink-0 pt-1">
                              {record.change > 0 ? (
                                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                                  <Plus size={18} strokeWidth={3} />
                                </div>
                              ) : (
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${isWithdraw ? 'bg-amber-50 text-amber-600 border-amber-100' : isLog ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                  <X size={18} strokeWidth={3} />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-1">
                                {/* 更新：加上 whitespace-pre-wrap 支援自動換行顯示 */}
                                <span className={`font-bold text-lg pr-2 whitespace-pre-wrap ${isLog ? 'text-indigo-800' : isWithdraw ? 'text-amber-800' : 'text-slate-800'}`} style={{ wordBreak: 'break-word' }}>
                                  {record.target}
                                </span>
                                
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <span className={`font-black font-mono text-lg mr-2 ${record.change > 0 ? 'text-emerald-600' : isWithdraw ? 'text-amber-600' : isLog ? 'text-indigo-600' : 'text-rose-600'}`}>
                                    {record.change > 0 ? '+' : ''}{record.change}
                                  </span>
                                  {role === 'admin' && (
                                    <>
                                      <button 
                                        onClick={() => setEditingRecord(record)}
                                        className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-100 rounded-md transition-colors"
                                        title="編輯紀錄"
                                      >
                                        <Edit2 size={16} />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteRecord(record.id)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-100 rounded-md transition-colors"
                                        title="刪除此紀錄"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              
                              {record.serialNumbers && record.serialNumbers.length > 0 && (
                                <div className="mb-2 bg-slate-50 border border-slate-200 rounded p-2">
                                  <span className="text-xs font-bold text-slate-500 block mb-1">綁定編號：</span>
                                  <span className="font-mono text-sm text-slate-700">{record.serialNumbers.join(', ')}</span>
                                </div>
                              )}
                              
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500 mb-2">
                                <span className="flex items-center gap-1 font-mono">
                                  <History size={14} />{record.date}
                                </span>
                                {record.sender && (
                                  <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-medium ${getSenderColorClasses(record.sender)}`}>
                                    <UserSearch size={14} />由 {record.sender} 致贈
                                  </span>
                                )}
                              </div>

                              {record.note && (
                                <div className="text-sm bg-amber-50 border border-amber-100 text-amber-800 px-3 py-2 rounded-md inline-block max-w-full whitespace-pre-wrap break-words">
                                  {record.note}
                                </div>
                              )}
                            </div>
                          </div>
                        )})
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 編輯禮品基本資料 Modal (終極校正模式) */}
      {isEditGiftModalOpen && role === 'admin' && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Edit2 size={20} className="text-indigo-600" /> 校正庫存與資料</h3>
              <button onClick={() => setIsEditGiftModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm"><X size={20} /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="mb-5 p-3.5 bg-indigo-50 rounded-xl text-sm text-indigo-800 flex items-start gap-2.5 border border-indigo-100 leading-relaxed">
                <Info size={18} className="mt-0.5 flex-shrink-0 text-indigo-600" />
                <p>若發現實際盤點與系統紀錄有落差，您可在此處進行<strong>強制校正</strong>。修改後將直接覆蓋系統當前狀態。</p>
              </div>
              <form onSubmit={handleEditGiftSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">禮品名稱</label>
                  <input type="text" required value={editGiftData.name} onChange={(e) => setEditGiftData({...editGiftData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                
                {selectedGift?.isTracked !== false && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {selectedGift?.isNumbered ? '實際在庫總數 (系統將自動依據下方編號數量計算)' : '實際在庫總數 (手動校正)'}
                    </label>
                    <input 
                      type="number" 
                      required 
                      disabled={selectedGift?.isNumbered}
                      value={selectedGift?.isNumbered ? parseNumbers(editGiftData.availableNumbersStr).length : editGiftData.stock} 
                      onChange={(e) => setEditGiftData({...editGiftData, stock: e.target.value})} 
                      className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none font-mono ${selectedGift?.isNumbered ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'focus:ring-2 focus:ring-indigo-500'}`} 
                    />
                  </div>
                )}

                {selectedGift?.isNumbered && (
                  <div className="bg-rose-50 p-4 rounded-xl border border-rose-100">
                    <label className="block text-sm font-medium text-rose-800 mb-2 flex items-center gap-1">
                      現有編號清單校正 <Info size={14} className="text-rose-400" title="可使用逗號或連字號，例如: 1, 3, 5-10"/>
                    </label>
                    <textarea 
                      rows="4" 
                      value={editGiftData.availableNumbersStr} 
                      onChange={(e) => setEditGiftData({...editGiftData, availableNumbersStr: e.target.value})} 
                      className="w-full px-3 py-2 border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono text-sm leading-relaxed" 
                    />
                    <p className="text-xs text-rose-600 mt-2 font-medium">若號碼有遺漏或多出，請直接在此處修改（使用逗號分隔）。儲存後，總數會自動對齊這些號碼的數量。</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">存放位置或說明 (備註)</label>
                  <textarea rows="3" placeholder="例如：存放於秘書室鐵櫃" value={editGiftData.note} onChange={(e) => setEditGiftData({...editGiftData, note: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
                </div>

                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-2 flex justify-center items-center gap-2 shadow-sm">
                  確認並儲存校正
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 新增禮品 Modal */}
      {isAddGiftModalOpen && role === 'admin' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Package size={20} className="text-rose-600" /> 新增禮品種類</h3>
              <button onClick={() => setIsAddGiftModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm"><X size={20} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleAddGiftSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">禮品名稱</label>
                  <input type="text" required placeholder="輸入新禮品名稱" value={newGiftData.name} onChange={(e) => setNewGiftData({...newGiftData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none" />
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={newGiftData.isTracked} onChange={(e) => setNewGiftData({...newGiftData, isTracked: e.target.checked})} className="mt-1 w-4 h-4 text-rose-600 rounded focus:ring-rose-500" />
                    <div>
                      <span className="text-sm font-bold text-slate-800 block">此禮品需要控管數量 (列管)</span>
                      <span className="text-xs text-slate-500 mt-0.5 block">取消勾選則為「免登記禮品」，純作圖錄。</span>
                    </div>
                  </label>

                  {newGiftData.isTracked && (
                    <div className="pt-2 border-t border-slate-200">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" checked={newGiftData.isNumbered} onChange={(e) => setNewGiftData({...newGiftData, isNumbered: e.target.checked})} className="mt-1 w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                        <div>
                          <span className="text-sm font-bold text-indigo-900 block">此禮品具備限量編號 <span className="text-xs font-normal text-indigo-600">(如版畫、紀念酒)</span></span>
                          <span className="text-xs text-slate-500 mt-0.5 block">系統將自動產生號碼標籤，供出庫時點選綁定。</span>
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                {newGiftData.isTracked && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      {newGiftData.isNumbered ? '發行總數量 (例如 100，系統將自動產生 1~100 號)' : '初始入庫數量'}
                    </label>
                    <input 
                      type="number" 
                      required 
                      min="1" 
                      placeholder="例如: 100" 
                      value={newGiftData.isNumbered ? newGiftData.totalNumbers : newGiftData.stock} 
                      onChange={(e) => {
                        if (newGiftData.isNumbered) {
                          setNewGiftData({...newGiftData, totalNumbers: e.target.value});
                        } else {
                          setNewGiftData({...newGiftData, stock: e.target.value});
                        }
                      }} 
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono" 
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">存放位置或說明 (選填)</label>
                  <textarea rows="2" placeholder="備註或建議放置地點" value={newGiftData.note} onChange={(e) => setNewGiftData({...newGiftData, note: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none text-sm" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">圖片</label>
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><ImageIcon className="h-4 w-4 text-slate-400" /></div>
                      <input type="text" placeholder="貼上網路圖片網址..." value={newGiftData.image} onChange={(e) => setNewGiftData({...newGiftData, image: e.target.value})} className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none text-sm" />
                    </div>
                    <span className="text-slate-400 text-sm font-medium">或</span>
                    <label className="cursor-pointer bg-slate-100 text-slate-700 px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-200 transition-colors flex items-center gap-1.5 text-sm font-medium flex-shrink-0">
                      <Upload size={16} /> 本機上傳
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, (base64) => setNewGiftData({...newGiftData, image: base64}))} />
                    </label>
                  </div>
                  {newGiftData.image && newGiftData.image.startsWith('data:image') && (
                    <p className="text-xs text-emerald-600 mt-1.5">✓ 已成功載入本機圖片</p>
                  )}
                </div>

                <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-2">確認新增</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 查詢送禮紀錄 Modal */}
      {isRecipientSearchModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><UserSearch size={20} className="text-indigo-600" /> 防重複送禮：對象查詢</h3>
              <button onClick={() => { 
                setIsRecipientSearchModalOpen(false); 
                setRecipientSearchTerm(''); 
                setExpandedSearchItems({}); 
              }} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm"><X size={20} /></button>
            </div>
            <div className="p-6 border-b border-slate-100 bg-white">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-5 w-5 text-indigo-400" /></div>
                <input type="text" autoFocus placeholder="輸入對象姓名、單位或職稱 (如：校長、基金會)..." value={recipientSearchTerm} onChange={(e) => {
                  setRecipientSearchTerm(e.target.value);
                  setExpandedSearchItems({}); 
                }} className="block w-full pl-10 pr-3 py-3 border-2 border-indigo-100 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-0 focus:border-indigo-400 transition-colors text-lg" />
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50 min-h-[300px]">
              {!recipientSearchTerm.trim() ? (
                <div className="text-center text-slate-400 py-10 flex flex-col items-center"><UserSearch size={48} className="mb-3 opacity-20" />請在上方輸入對象關鍵字，快速檢索送禮紀錄</div>
              ) : getRecipientHistory().length === 0 ? (
                <div className="text-center text-slate-500 py-10">找不到包含「<span className="font-bold text-indigo-600">{recipientSearchTerm}</span>」的送禮紀錄。<br/><span className="text-emerald-600 font-medium mt-2 inline-block">您可以放心致贈！</span></div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-slate-500 mb-4">找到 {getRecipientHistory().length} 筆包含「<span className="font-bold text-indigo-600">{recipientSearchTerm}</span>」的送出紀錄：</div>
                  {getRecipientHistory().map((record, idx) => {
                    const isExpanded = expandedSearchItems[idx];
                    const needsExpansion = record.target.length > 30 || record.target.includes('\n') || (record.note && record.note.length > 30) || (record.note && record.note.includes('\n'));
                    
                    return (
                    <div key={idx} className="flex gap-4 p-4 rounded-xl border border-slate-200 bg-white shadow-sm items-start hover:shadow-md transition-shadow">
                      <img src={record.giftImage} alt={record.giftName} className="w-14 h-14 rounded-lg object-cover border border-slate-100 flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0 pr-4">
                            <div className={`font-bold text-slate-800 text-lg leading-snug ${isExpanded ? 'whitespace-pre-wrap' : 'truncate'}`}>
                              {record.target}
                            </div>
                            {needsExpansion && (
                              <button 
                                onClick={() => setExpandedSearchItems(prev => ({...prev, [idx]: !prev[idx]}))}
                                className="text-sm text-indigo-600 font-bold hover:text-indigo-800 mt-1.5 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md transition-colors w-fit"
                              >
                                {isExpanded ? <><ChevronUp size={16}/> 收合名單</> : <><ChevronDown size={16}/> 展開完整名單與備註</>}
                              </button>
                            )}
                          </div>
                          <div className="text-sm font-mono font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md whitespace-nowrap flex-shrink-0">
                            致贈 {Math.abs(record.change)} 件
                          </div>
                        </div>
                        
                        {record.serialNumbers && (
                          <div className="text-xs text-slate-500 mt-2 font-mono bg-slate-50 p-1.5 rounded inline-block">
                            <span className="font-bold text-slate-600">綁定編號:</span> {record.serialNumbers.join(', ')}
                          </div>
                        )}
                        
                        <div className="text-sm text-slate-600 mt-2 flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{record.giftName}</span>
                          <span className="text-slate-300">|</span> 
                          <span className="flex items-center gap-1"><History size={14} />{record.date}</span>
                          {record.sender && (<><span className="text-slate-300">|</span><span className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-medium ${getSenderColorClasses(record.sender)}`}><UserSearch size={14} />由 {record.sender} 致贈</span></>)}
                        </div>
                        
                        {record.note && (
                          <div className={`text-sm text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed ${isExpanded ? 'whitespace-pre-wrap' : 'truncate'}`}>
                            <span className="font-bold text-slate-700 mr-1.5">備註:</span>
                            {record.note}
                          </div>
                        )}
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 修改歷史紀錄 Modal (純文字) */}
      {editingRecord && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Edit2 size={20} className="text-indigo-600" /> 修改歷史紀錄</h3>
              <button onClick={() => setEditingRecord(null)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm"><X size={20} /></button>
            </div>
            <div className="p-6">
              {selectedGift.isNumbered ? (
                <div className="mb-5 p-3.5 bg-amber-50 rounded-xl text-sm text-amber-800 flex items-start gap-2.5 border border-amber-100 leading-relaxed">
                  <Info size={18} className="mt-0.5 flex-shrink-0 text-amber-600" />
                  <p>為確保庫存與限量編號的連動正確性，此處僅供修改<strong>文字紀錄 (日期、對象、經手人與備註)</strong>。若原登記的「數量」或「編號」有誤，請直接<strong>刪除該筆紀錄</strong>（系統會自動加回庫存與編號），再重新新增一筆即可。</p>
                </div>
              ) : (
                <div className="mb-5 p-3.5 bg-blue-50 rounded-xl text-sm text-blue-800 flex items-start gap-2.5 border border-blue-100 leading-relaxed">
                  <Info size={18} className="mt-0.5 flex-shrink-0 text-blue-600" />
                  <p>您可在此直接修改此筆紀錄的<strong>文字內容與數量</strong>，儲存後系統將會自動為您重新計算總庫存。</p>
                </div>
              )}

              <form onSubmit={handleEditRecordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">日期</label>
                  <input type="date" required value={editingRecord.date} onChange={(e) => setEditingRecord({...editingRecord, date: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>

                {!selectedGift.isNumbered && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">數量 (+進, -出)</label>
                    <input type="number" required value={editingRecord.change} onChange={(e) => setEditingRecord({...editingRecord, change: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono" />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">贈送者 / 經手人</label>
                  <input type="text" value={editingRecord.sender || ''} onChange={(e) => setEditingRecord({...editingRecord, sender: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">對象 / 事項</label>
                  {/* 更新：改為 textarea 支援換行 */}
                  <textarea rows="3" required value={editingRecord.target} onChange={(e) => setEditingRecord({...editingRecord, target: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">備註 (選填)</label>
                  <textarea rows="2" value={editingRecord.note || ''} onChange={(e) => setEditingRecord({...editingRecord, note: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors mt-2 flex justify-center items-center gap-2">
                  儲存修改
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 全螢幕圖片預覽 Modal */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4 md:p-10 cursor-zoom-out"
          onClick={() => setFullScreenImage(null)}
        >
          <button 
            className="absolute top-4 right-4 md:top-6 md:right-6 text-white/70 hover:text-white bg-black/20 hover:bg-black/50 rounded-full p-2 transition-colors pointer-events-auto"
            onClick={() => setFullScreenImage(null)}
          >
            <X size={32} />
          </button>
          <img 
            src={fullScreenImage} 
            alt="放大圖片" 
            className="max-w-full max-h-full object-contain shadow-2xl rounded-md cursor-default pointer-events-auto bg-slate-50" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

    </div>
  );
}
