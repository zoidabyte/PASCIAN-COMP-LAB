import React, { useState, useEffect, useMemo } from 'react';
// --- Firebase Imports ---
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'; 

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyD2mG663nyQqvUfe_Vsut5fhb07h4meURU",
  authDomain: "perh-cce15.firebaseapp.com",
  projectId: "perh-cce15",
  storageBucket: "perh-cce15.firebasestorage.app",
  messagingSenderId: "567116531737",
  appId: "1:567116531737:web:cffbab7a6af5c6bcf30288",
  measurementId: "G-DNX5ZLLS21"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Static Data Structures ---
const GRADE_SECTIONS = {
  'Grade 7': ['Archimedes', 'Edison', 'Galileo', 'Newton'],
  'Grade 8': ['Aristotle', 'Darwin', 'Mendel', 'Linnaeus'],
  'Grade 9': ['Boyle', 'Charles', 'Dalton', 'Mendeleev'],
  'Grade 10': ['Einstein', 'Faraday', 'Pascal', 'Rutherford'],
  'Grade 11': ['Banzon', 'Campos', 'Gomez', 'Sylianco'],
  'Grade 12': ['Biyo', 'Del Mundo', 'Quisumbing', 'Zara']
};

// Base Catalog Data (Now acts as the single source of truth instead of Firebase)
const INITIAL_INVENTORY = [
  // --- Equipment ---
  { id: 'EQ-LP', name: 'Laptop', category: 'Equipment', total: 46 },
  { id: 'EQ-TB', name: 'Tablet', category: 'Equipment', total: 160 },
  { id: 'EQ-MN', name: 'Monitor', category: 'Equipment', total: 25 },
  { id: 'EQ-TV', name: 'TV', category: 'Equipment', total: 5 },
  { id: 'EQ-RB', name: 'Robotics Kit', category: 'Equipment', total: 30 },
  { id: 'EQ-RT', name: 'Router', category: 'Equipment', total: 10 },
  { id: 'EQ-UP', name: 'UPS', category: 'Equipment', total: 10 },

  // --- Tools ---
  { id: 'TL-VG', name: 'VGA Cable', category: 'Tools', total: 50 },
  { id: 'TL-HD', name: 'HDMI Cable', category: 'Tools', total: 50 },
  { id: 'TL-LT', name: 'LAN Tester', category: 'Tools', total: 10 },
  { id: 'TL-CT', name: 'Crimping Tool', category: 'Tools', total: 15 },
  { id: 'TL-SD-SET', name: 'Screwdriver Set', category: 'Tools', total: 20, isScrewdriverTrigger: true },
  { id: 'TL-BB', name: 'Bread Board', category: 'Tools', total: 40 },
  { id: 'TL-SI', name: 'Soldering Iron', category: 'Tools', total: 10 },

  // --- Accessories ---
  { id: 'AC-KB', name: 'Keyboard', category: 'Accessories', total: 30 },
  { id: 'AC-MS', name: 'Mouse', category: 'Accessories', total: 35 },
  { id: 'AC-EX', name: 'Extension Cord', category: 'Accessories', total: 15 },
  { id: 'EQ-HS', name: 'Headset', category: 'Accessories', total: 20 },
  { id: 'AC-HD', name: 'External Hard Drive', category: 'Accessories', total: 10 },

  // --- Hidden/Child Items ---
  { id: 'TL-SD-PH', name: 'Phillips Screwdriver', category: 'Tools', total: 5, hidden: true },
  { id: 'TL-SD-FL', name: 'Flathead Screwdriver', category: 'Tools', total: 5, hidden: true },
  { id: 'TL-SD-TX', name: 'Torx Screwdriver', category: 'Tools', total: 5, hidden: true },
  { id: 'TL-SD-HX', name: 'Hex Screwdriver', category: 'Tools', total: 5, hidden: true },

  // --- Services ---
  { id: 'EQ-PR', name: '2D Printer', category: 'Services', total: 1000 },
  { id: 'SV-3D', name: '3D Printing', category: 'Services', total: 1, isLocked: true }
];

const getMinBorrowDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 2);
  return date.toISOString().split('T')[0];
};

export default function App() {
  // --- UI STATES ---
  const [uiTab, setUiTab] = useState('Inventory');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentView, setCurrentView] = useState('student');
  const [isLockedToStudent, setIsLockedToStudent] = useState(false);
  const [activeTab, setActiveTab] = useState('Tools');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);

  // --- FIREBASE & DATA STATES ---
  // Inventory is now initialized locally from the constant
  const [baseInventory, setBaseInventory] = useState(INITIAL_INVENTORY);
  const [requests, setRequests] = useState([]);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  // --- APP STATES ---
  const [cart, setCart] = useState([]); 
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [isSDModalOpen, setIsSDModalOpen] = useState(false);
  const [sdCounts, setSdCounts] = useState({ 'TL-SD-PH': 0, 'TL-SD-FL': 0, 'TL-SD-TX': 0, 'TL-SD-HX': 0 });
  const [studentForm, setStudentForm] = useState({ name: '', email: '', gradeLevel: '', gradeSection: '', purpose: '', borrowDate: '' });


  // --- AUTH STATES ---
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // --- ROUTING EFFECT ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'student') {
      setCurrentView('student');
      setIsLockedToStudent(true); 
      setUiTab('Inventory');
    } else {
      setCurrentView('admin');
      setIsLockedToStudent(false);
      setUiTab('Admin Login'); 
    }
  }, []);

  // --- FIREBASE SUBSCRIPTIONS (Kept Requests & Settings) ---
  useEffect(() => {
    // 1. Listen to Requests (Syncs live borrowing)
    const unsubRequests = onSnapshot(collection(db, "requests"), (snapshot) => {
      const fetchedRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedRequests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setRequests(fetchedRequests);
    });

    // 2. Listen to Global Settings (Maintenance Mode)
    const unsubSettings = onSnapshot(doc(db, "settings", "global"), (docSnap) => {
      if (docSnap.exists()) {
        setIsMaintenanceMode(docSnap.data().isMaintenanceMode || false);
      }
    });

    return () => { unsubRequests(); unsubSettings(); };
  }, []);

  // --- DYNAMIC INVENTORY CALCULATION ---
  const inventory = useMemo(() => {
    let updated = baseInventory.map(item => ({ ...item, pending: 0, borrowed: 0, available: item.total }));

    requests.forEach(req => {
      if (req.status === 'Pending') {
        req.items?.forEach(reqItem => {
          const match = updated.find(i => i.id === reqItem.itemId);
          if (match) {
            match.pending += reqItem.quantity;
            if (match.category !== 'Services') {
              match.available = Math.max(0, match.available - reqItem.quantity);
            }
          }
        });
      } else if (req.status === 'Approved') {
        req.items?.forEach(reqItem => {
          const match = updated.find(i => i.id === reqItem.itemId);
          if (match) {
            match.borrowed += reqItem.quantity;
            if (match.category !== 'Services') {
              match.available = Math.max(0, match.available - reqItem.quantity);
            }
          }
        });
      }
    });
    return updated;
  }, [baseInventory, requests]);

  // --- FUNCTIONS ---
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      setIsAdminUnlocked(true);
      setAdminPassword(''); 
      setUiTab('Borrowed');
    } catch (error) {
      setLoginError("Invalid Email or Password. Access Denied.");
      setAdminPassword('');
    }
  };

  const handleAdminLogout = async () => {
    await signOut(auth);
    setIsAdminUnlocked(false);
    setAdminEmail(''); 
    setUiTab('Admin Login'); 
  };

  // -- LOCAL INVENTORY MANAGEMENT (ADMIN SETTINGS) --
  const toggleMaintenanceMode = async () => {
    await setDoc(doc(db, "settings", "global"), { isMaintenanceMode: !isMaintenanceMode }, { merge: true });
  };

  const handleUpdateItemTotal = (id, newTotal) => {
    setBaseInventory(prev => prev.map(item => item.id === id ? { ...item, total: Number(newTotal) } : item));
  };



  // -- CART FUNCTIONS --
  const handleAddToCart = (item) => {
    if (!isLockedToStudent || isMaintenanceMode) return;
    if (item.isScrewdriverTrigger) {
      setIsSDModalOpen(true);
      return;
    }
    const existingCartItem = cart.find(c => c.id === item.id);
    if (existingCartItem) {
      if (item.category !== 'Services' && existingCartItem.quantity >= item.available) return alert(`Only ${item.available} units available.`);
      setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else setCart([...cart, { id: item.id, name: item.name, quantity: 1, available: item.available, category: item.category }]);
  };

  const confirmScrewdriverSelection = () => {
    let updatedCart = [...cart];
    Object.entries(sdCounts).forEach(([id, qtyToAdd]) => {
      if (qtyToAdd > 0) {
        const tool = inventory.find(i => i.id === id);
        if (!tool) return;
        const existingItemIndex = updatedCart.findIndex(c => c.id === id);
        if (existingItemIndex >= 0) updatedCart[existingItemIndex].quantity = Math.min(tool.available, updatedCart[existingItemIndex].quantity + qtyToAdd);
        else updatedCart.push({ id, name: tool.name, quantity: qtyToAdd, available: tool.available, category: 'Tools' });
      }
    });
    setCart(updatedCart);
    setIsSDModalOpen(false);
    setSdCounts({ 'TL-SD-PH': 0, 'TL-SD-FL': 0, 'TL-SD-TX': 0, 'TL-SD-HX': 0 });
  };

  const handleUpdateCartQuantity = (id, amount) => {
    setCart(cart.map(c => {
      if (c.id === id) {
        const newQty = c.quantity + amount;
        if (c.category !== 'Services' && newQty > c.available) { alert(`Max available stock reached.`); return c; }
        return newQty > 0 ? { ...c, quantity: newQty } : null;
      }
      return c;
    }).filter(Boolean));
  };

  const handleRemoveFromCart = (id) => setCart(cart.filter(c => c.id !== id));

  const handleBorrowSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return alert("Your cart is empty.");
    try {
      await addDoc(collection(db, "requests"), {
        studentName: studentForm.name, email: studentForm.email, gradeLevel: studentForm.gradeLevel, gradeSection: studentForm.gradeSection, borrowDate: studentForm.borrowDate,
        items: cart.map(c => ({ itemId: c.id, itemName: c.name, quantity: c.quantity })), purpose: studentForm.purpose, timestamp: new Date().toISOString(), status: 'Pending'
      });
      setCart([]); 
      setIsCheckoutModalOpen(false); 
      setShowSuccessScreen(true);
      setStudentForm({ name: '', email: '', gradeLevel: '', gradeSection: '', purpose: '', borrowDate: '' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { alert("Error logging request to database. Please try again."); }
  };

  // ADMIN STATUS FUNCTIONS
  const handleApproveRequest = async (reqId) => {
    try { await updateDoc(doc(db, "requests", reqId), { status: 'Approved' }); } 
    catch (err) { alert("Error updating request status."); }
  };

  const handleRejectRequest = async (reqId) => {
    try { await updateDoc(doc(db, "requests", reqId), { status: 'Rejected' }); } 
    catch (err) { alert("Error updating request status."); }
  };

  const handleReturnRequest = async (reqId) => {
    try { await updateDoc(doc(db, "requests", reqId), { status: 'Returned' }); } 
    catch (err) { alert("Error marking as returned."); }
  };

  const filteredInventory = inventory.filter(item => item.category === activeTab && !item.hidden);

  const navItems = isLockedToStudent 
    ? ['Inventory'] 
    : (isAdminUnlocked ? ['Inventory', 'Borrowed', 'History', 'Settings'] : ['Admin Login', 'Settings']);

  const handleNavClick = (item) => {
    setUiTab(item);
    if (!isLockedToStudent && currentView === 'admin') setCurrentView('admin');
    else setCurrentView('student');
  };

  // --- DYNAMIC THEMING ---
  const theme = {
    base: isDarkMode ? 'bg-[#0a0f1c] text-slate-200' : 'bg-slate-50 text-slate-800',
    card: isDarkMode ? 'bg-slate-900/60 border-slate-700/50 text-slate-200 shadow-black/50' : 'bg-white/60 border-slate-200/50 text-slate-800 shadow-slate-200/50',
    input: isDarkMode ? 'bg-slate-800/80 border-slate-600 text-white focus:border-indigo-500' : 'bg-white/80 border-slate-300 text-slate-900 focus:border-indigo-500',
    textMain: isDarkMode ? 'text-white' : 'text-slate-900',
    textMuted: isDarkMode ? 'text-slate-400' : 'text-slate-500',
    border: isDarkMode ? 'border-slate-700/50' : 'border-slate-200/50',
    tabActive: isDarkMode ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white text-indigo-600 border border-indigo-200 shadow-sm',
    tabInactive: isDarkMode ? 'text-slate-400 hover:bg-slate-800/50' : 'text-slate-600 hover:bg-white/50',
  };

  return (
    <div className={`min-h-screen w-full relative transition-colors duration-500 overflow-hidden font-sans antialiased ${theme.base}`}>
      
      {/* BACKGROUND */}
      <div className="absolute inset-0 z-0 opacity-60">
        <style>
          {`
            @keyframes panGrid {
              0% { background-position: 0px 0px; }
              100% { background-position: 40px 40px; }
            }
            .tech-grid {
              background-size: 40px 40px;
              background-image: 
                linear-gradient(to right, ${isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.15)'} 1px, transparent 1px),
                linear-gradient(to bottom, ${isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.15)'} 1px, transparent 1px);
              animation: panGrid 3s linear infinite;
            }
          `}
        </style>
        <div className="absolute inset-0 tech-grid"></div>
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] pointer-events-none ${isDarkMode ? 'bg-indigo-900/30' : 'bg-blue-400/20'}`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] pointer-events-none ${isDarkMode ? 'bg-emerald-900/20' : 'bg-cyan-400/20'}`}></div>
      </div>

      {/* --- CHECKOUT MODAL --- */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 overflow-y-auto">
          <div className={`${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl border my-8`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`font-black ${theme.textMain} text-2xl`}>Finalize Request</h3>
              <button onClick={() => setIsCheckoutModalOpen(false)} className="text-slate-400 hover:text-red-500 font-bold text-2xl">&times;</button>
            </div>

            <div className="max-h-[30vh] overflow-y-auto pr-2 space-y-3 mb-6">
              {cart.map((cartItem) => (
                <div key={cartItem.id} className={`flex justify-between items-center p-3 rounded-xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <span className={`text-sm font-bold truncate pr-2 ${theme.textMain}`}>{cartItem.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => handleUpdateCartQuantity(cartItem.id, -1)} className={`h-8 w-8 rounded-lg text-lg font-black flex items-center justify-center active:scale-95 ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-white border'}`}>-</button>
                    <span className={`text-sm font-mono font-black w-5 text-center ${theme.textMain}`}>{cartItem.quantity}</span>
                    <button type="button" onClick={() => handleUpdateCartQuantity(cartItem.id, 1)} className={`h-8 w-8 rounded-lg text-lg font-black flex items-center justify-center active:scale-95 ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-white border'}`}>+</button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleBorrowSubmit} className={`space-y-4 pt-4 border-t ${theme.border}`}>
              <input required type="text" placeholder="Full Name" value={studentForm.name} onChange={(e) => setStudentForm({...studentForm, name: e.target.value})} className={`w-full rounded-xl px-4 py-3.5 text-base shadow-inner ${theme.input}`} />
              <input required type="email" placeholder="School Email Address" value={studentForm.email} onChange={(e) => setStudentForm({...studentForm, email: e.target.value})} className={`w-full rounded-xl px-4 py-3.5 text-base shadow-inner ${theme.input}`} />
              <div className="grid grid-cols-2 gap-3">
                <select required value={studentForm.gradeLevel} onChange={(e) => setStudentForm({...studentForm, gradeLevel: e.target.value, gradeSection: ''})} className={`w-full rounded-xl px-3 py-3.5 text-base ${theme.input}`}>
                  <option value="">Grade</option>
                  {Object.keys(GRADE_SECTIONS).map(grade => <option key={grade} value={grade}>{grade}</option>)}
                </select>
                <select required disabled={!studentForm.gradeLevel} value={studentForm.gradeSection} onChange={(e) => setStudentForm({...studentForm, gradeSection: e.target.value})} className={`w-full rounded-xl px-3 py-3.5 text-base disabled:opacity-50 ${theme.input}`}>
                  <option value="">Section</option>
                  {studentForm.gradeLevel && GRADE_SECTIONS[studentForm.gradeLevel].map(sec => <option key={sec} value={sec}>{sec}</option>)}
                </select>
              </div>
              <input required type="date" min={getMinBorrowDate()} value={studentForm.borrowDate} onChange={(e) => setStudentForm({...studentForm, borrowDate: e.target.value})} className={`w-full rounded-xl px-4 py-3.5 text-base shadow-inner ${theme.input}`} />
              
              <textarea required rows="2" placeholder="Activity Purpose / Project Name" value={studentForm.purpose} onChange={(e) => setStudentForm({...studentForm, purpose: e.target.value})} className={`w-full rounded-xl px-4 py-3.5 text-base shadow-inner resize-none ${theme.input}`}></textarea>
              
              <div className="bg-red-500/10 border border-red-500/30 text-red-600 p-4 rounded-xl text-sm font-bold flex gap-3 items-start mt-2">
                <span className="text-xl leading-none">⚠️</span>
                <p>Disclaimer: By submitting this request, you agree that any broken, lost, or damaged equipment will result in YOU having to replace it.</p>
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white py-4 mt-2 rounded-xl text-base font-black tracking-wide shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 active:scale-[0.98] transition-transform">Agree & Submit Request</button>
            </form>
          </div>
        </div>
      )}

      {/* SCREWDRIVER MODAL */}
      {isSDModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className={`${theme.card} rounded-2xl p-6 w-full max-w-md shadow-2xl border backdrop-blur-xl`}>
            <h3 className={`font-black ${theme.textMain} text-xl mb-4`}>Select Screwdrivers</h3>
            <div className="space-y-4">
               {['TL-SD-PH', 'TL-SD-FL', 'TL-SD-TX', 'TL-SD-HX'].map(id => {
                const item = inventory.find(i => i.id === id);
                return (
                  <div key={id} className={`flex justify-between items-center py-2 border-b ${theme.border}`}>
                    <span className="text-base font-bold">{item?.name}</span>
                    <div className="flex items-center gap-4">
                      <button type="button" onClick={() => setSdCounts({...sdCounts, [id]: Math.max(0, sdCounts[id] - 1)})} className={`px-4 py-2 rounded-xl font-black text-xl active:scale-95 transition-transform ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'}`}>-</button>
                      <span className="font-mono font-bold w-6 text-center text-lg">{sdCounts[id]}</span>
                      <button type="button" onClick={() => setSdCounts({...sdCounts, [id]: Math.min(item?.available || 0, sdCounts[id] + 1)})} className="bg-indigo-500/20 text-indigo-500 px-4 py-2 rounded-xl font-black text-xl hover:bg-indigo-500/30 active:scale-95 transition-transform">+</button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-6 flex gap-4">
              <button type="button" onClick={() => {setIsSDModalOpen(false); setSdCounts({'TL-SD-PH': 0, 'TL-SD-FL': 0, 'TL-SD-TX': 0, 'TL-SD-HX': 0});}} className={`flex-1 py-3.5 rounded-xl font-bold active:scale-95 transition-transform ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'}`}>Cancel</button>
              <button type="button" onClick={confirmScrewdriverSelection} className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-500/30 active:scale-95 transition-transform">Confirm Add</button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN APP LAYOUT */}
      <div className="relative z-10 flex h-screen w-full backdrop-blur-[2px]">
        
        {/* Sidebar Navigation */}
        <aside className={`w-64 border-r flex flex-col transition-colors duration-500 backdrop-blur-xl ${isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white/70 border-slate-200'}`}>
          <div className="p-6 border-b border-inherit">
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-cyan-500 drop-shadow-sm leading-tight">
              Pascian TLE-ICT<br/> Department 
            </h1>
            <p className="text-xs uppercase tracking-widest mt-2 opacity-60 font-mono font-bold">System Terminal</p>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => handleNavClick(item)}
                className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-3 ${uiTab === item ? theme.tabActive : theme.tabInactive}`}
              >
                <div className={`w-1.5 h-1.5 rounded-sm transition-all duration-300 ${uiTab === item ? 'bg-current shadow-[0_0_8px_currentColor]' : 'bg-transparent'}`}></div>
                {item}
              </button>
            ))}
          </nav>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="max-w-7xl mx-auto h-full flex flex-col space-y-6 pb-24">
            
            {/* Header */}
            <header className="flex justify-between items-center">
              <h2 className={`text-3xl font-black tracking-tight flex items-center gap-3 font-mono ${theme.textMain}`}>
                <span className="opacity-40">&gt;</span> {uiTab}
              </h2>
            </header>

            {/* ADMIN LOGIN SCREEN */}
            {uiTab === 'Admin Login' && currentView === 'admin' && !isAdminUnlocked && (
              <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in zoom-in duration-300">
                <div className={`${theme.card} p-10 rounded-3xl border backdrop-blur-xl shadow-2xl max-w-sm w-full text-center space-y-6`}>
                  <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20 shadow-inner">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  </div>
                  <div>
                    <h2 className={`text-2xl font-black ${theme.textMain}`}>Admin Gateway</h2>
                    <p className={`text-sm mt-2 ${theme.textMuted}`}>Database authorization required.</p>
                  </div>
                  {loginError && <p className="text-red-500 text-sm font-bold">{loginError}</p>}
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <input type="email" placeholder="Admin Email Address" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className={`w-full text-center tracking-wide text-sm p-4 rounded-xl font-mono ${theme.input} shadow-inner outline-none transition-all`} required autoFocus />
                    <input type="password" placeholder="••••••••" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className={`w-full text-center tracking-[0.5em] text-2xl p-4 rounded-xl font-mono ${theme.input} shadow-inner outline-none transition-all`} required />
                    <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 active:scale-95 transition-all uppercase tracking-widest text-sm">Verify Credentials</button>
                  </form>
                </div>
              </div>
            )}

            {/* VIEW 1: SETTINGS (ADMIN ONLY) */}
            {uiTab === 'Settings' && isAdminUnlocked && (
              <div className={`${theme.card} flex-1 rounded-3xl border backdrop-blur-xl p-6 md:p-8 transition-colors duration-500 space-y-10 animate-in fade-in`}>
                
                {/* Global Access Settings */}
                <div className="space-y-4 max-w-2xl">
                  <h3 className={`text-xl font-bold border-b pb-3 font-mono ${theme.border}`}>Global Access</h3>
                  <div className={`flex items-center justify-between p-5 rounded-2xl border transition-colors ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white/80 border-slate-200'}`}>
                    <div>
                      <p className={`font-bold text-lg ${theme.textMain}`}>Maintenance Mode</p>
                      <p className={`text-sm ${theme.textMuted}`}>Locks the student QR catalog immediately.</p>
                    </div>
                    <button onClick={toggleMaintenanceMode} className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 ${isMaintenanceMode ? 'bg-rose-500' : 'bg-slate-300'}`}>
                      <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition duration-300 shadow-md ${isMaintenanceMode ? 'translate-x-9' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>


                
                {/* Visual Settings */}
                <div className="space-y-4 max-w-2xl">
                  <h3 className={`text-xl font-bold border-b pb-3 font-mono ${theme.border}`}>Display</h3>
                  <div className={`flex items-center justify-between p-5 rounded-2xl border transition-colors ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white/80 border-slate-200'}`}>
                    <div>
                      <p className={`font-bold text-lg ${theme.textMain}`}>Interface Theme</p>
                      <p className={`text-sm ${theme.textMuted}`}>Toggle dark mode rendering for the terminal.</p>
                    </div>
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                      <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition duration-300 shadow-md ${isDarkMode ? 'translate-x-9' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* VIEW 2: STUDENT CATALOG */}
            {uiTab === 'Inventory' && (currentView === 'student' || (currentView === 'admin' && isAdminUnlocked)) && (
              <div className="space-y-8 animate-in fade-in duration-300 w-full">
                
                {showSuccessScreen && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-md rounded-2xl p-5 flex flex-col sm:flex-row gap-4 justify-between items-center text-emerald-600 shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 shrink-0 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-xl shadow-inner">✓</div>
                      <div>
                        <h4 className="font-black text-base text-emerald-500">Request Uploaded Successfully!</h4>
                        <p className="text-sm opacity-80">Your layout transaction has updated the database pipeline.</p>
                      </div>
                    </div>
                    <button onClick={() => setShowSuccessScreen(false)} className="w-full sm:w-auto text-emerald-600 text-sm font-black bg-white/10 hover:bg-white/20 px-6 py-3.5 rounded-xl border border-emerald-500/30 active:scale-95 transition-transform">Dismiss Info</button>
                  </div>
                )}

                {/* MAINTENANCE MODE BLOCKER */}
                {isMaintenanceMode && currentView === 'student' ? (
                  <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4">
                    <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center border-4 border-rose-500/20 mb-4">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    </div>
                    <h2 className={`text-4xl font-black ${theme.textMain}`}>Hub is Closed</h2>
                    <p className={`text-lg max-w-md ${theme.textMuted}`}>We are currently doing maintenance or inventory checks. Please check back later to borrow equipment.</p>
                  </div>
                ) : (
                  <>
                    <div className={`flex p-1.5 rounded-2xl w-full shadow-inner overflow-x-auto gap-1 ${isDarkMode ? 'bg-slate-900/60' : 'bg-slate-200/60'}`}>
                      {['Equipment', 'Tools', 'Accessories', 'Services'].map((tab) => (
                        <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-3.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex-1 text-center active:scale-95 ${activeTab === tab ? theme.tabActive : theme.tabInactive}`}>{tab}</button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredInventory.map((item) => {
                        const isAvailable = item.category === 'Services' ? !item.isLocked : item.available > 0;
                        return (
                          <div key={item.id} onClick={() => !item.isLocked && isAvailable && isLockedToStudent && handleAddToCart(item)} className={`${theme.card} border p-5 rounded-2xl backdrop-blur-md transition-all flex flex-col justify-between min-h-[140px] ${item.isLocked ? 'opacity-40' : isAvailable ? (isLockedToStudent ? 'cursor-pointer hover:border-indigo-500 active:scale-[0.99]' : 'opacity-90') : 'opacity-50'}`}>
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <span className={`text-xs font-mono px-2 py-1 rounded-md border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>{item.id}</span>
                                {item.isLocked ? (
                                  <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-md">Locked</span>
                                ) : isAvailable ? (
                                  <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">Available</span>
                                ) : (
                                  <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded-md">Out of Stock</span>
                                )}
                              </div>
                              <h4 className={`font-bold text-lg leading-tight mt-1 ${theme.textMain}`}>{item.name}</h4>
                            </div>
                            {!item.isLocked && item.category !== 'Services' && (
                              <div className="mt-4 flex items-center justify-between text-sm">
                                <span className={theme.textMuted}>Stock:</span>
                                <span className="font-mono font-bold text-indigo-500">{item.available} / {item.total}</span>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* VIEW 4 & 5: BORROWED & HISTORY (ADMIN ONLY) */}
            {uiTab === 'Borrowed' && currentView === 'admin' && isAdminUnlocked && (
               <div className="space-y-6 animate-in fade-in duration-300">
               <div className={`${theme.card} border rounded-2xl overflow-hidden backdrop-blur-xl shadow-lg overflow-x-auto`}>
                 <table className="w-full text-left border-collapse min-w-[800px]">
                   <thead>
                     <tr className={isDarkMode ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-100 text-slate-700'}>
                       <th className="p-4 font-bold text-sm uppercase">Date/Time</th>
                       <th className="p-4 font-bold text-sm uppercase">Student Info</th>
                       <th className="p-4 font-bold text-sm uppercase">Purpose</th>
                       <th className="p-4 font-bold text-sm uppercase">Requested Items</th>
                       <th className="p-4 font-bold text-sm uppercase">Status</th>
                       <th className="p-4 font-bold text-sm uppercase text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-inherit">
                     {requests.filter(r => r.status === 'Pending' || r.status === 'Approved').map(req => (
                       <tr key={req.id} className="hover:bg-black/5 transition-colors">
                         <td className={`p-4 ${theme.textMuted}`}>
                           <div className="text-sm font-medium">{new Date(req.timestamp).toLocaleDateString()}</div>
                           <div className="text-xs font-mono mt-1 opacity-70">{new Date(req.timestamp).toLocaleTimeString()}</div>
                         </td>
                         <td className="p-4">
                           <div className={`font-bold ${theme.textMain}`}>{req.studentName}</div>
                           <div className={`text-xs ${theme.textMuted}`}>{req.gradeLevel} - {req.gradeSection}</div>
                         </td>
                         <td className="p-4">
                           <div className={`text-sm font-medium ${theme.textMain} max-w-[200px] whitespace-normal leading-tight opacity-90`}>{req.purpose || 'N/A'}</div>
                         </td>
                         <td className="p-4">
                           <ul className="space-y-1">
                             {req.items?.map((i, idx) => (
                               <li key={idx} className={`text-sm ${theme.textMain}`}><span className="font-bold text-indigo-500 mr-2">{i.quantity}x</span>{i.itemName}</li>
                             ))}
                           </ul>
                         </td>
                         <td className="p-4">
                           <span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'Pending' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'}`}>
                             {req.status}
                           </span>
                         </td>
                         <td className="p-4 text-right space-x-2">
                           {req.status === 'Pending' && (
                             <>
                               <button onClick={() => handleApproveRequest(req.id)} className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-600 active:scale-95 transition-transform">Approve</button>
                               <button onClick={() => handleRejectRequest(req.id)} className="bg-rose-500/10 text-rose-500 px-4 py-2 rounded-lg text-xs font-bold hover:bg-rose-500 hover:text-white active:scale-95 transition-all">Reject</button>
                             </>
                           )}
                           {req.status === 'Approved' && (
                             <button onClick={() => handleReturnRequest(req.id)} className="bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-600 active:scale-95 transition-transform">Mark Returned</button>
                           )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
            )}
            
            {uiTab === 'History' && currentView === 'admin' && isAdminUnlocked && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h3 className={`text-xl font-bold border-b pb-2 ${theme.textMain} ${theme.border}`}>Archived Records</h3>
                <div className={`${theme.card} border rounded-2xl overflow-hidden backdrop-blur-xl shadow-lg overflow-x-auto`}>
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className={isDarkMode ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-100 text-slate-700'}>
                        <th className="p-4 font-bold text-sm uppercase">Date/Time</th>
                        <th className="p-4 font-bold text-sm uppercase">Student Info</th>
                        <th className="p-4 font-bold text-sm uppercase">Requested Items</th>
                        <th className="p-4 font-bold text-sm uppercase text-right">Final Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-inherit">
                      {requests.filter(r => r.status === 'Returned' || r.status === 'Rejected').map(req => (
                        <tr key={req.id} className="hover:bg-black/5 transition-colors opacity-70 hover:opacity-100">
                          <td className={`p-4 ${theme.textMuted}`}>
                            <div className="text-sm font-medium">{new Date(req.timestamp).toLocaleDateString()}</div>
                          </td>
                          <td className="p-4">
                            <div className={`font-bold ${theme.textMain}`}>{req.studentName}</div>
                            <div className={`text-xs ${theme.textMuted}`}>{req.gradeLevel}</div>
                          </td>
                          <td className="p-4">
                            <ul className="space-y-1">
                              {req.items?.map((i, idx) => (
                                <li key={idx} className={`text-sm ${theme.textMain}`}><span className="font-bold text-indigo-500 mr-2">{i.quantity}x</span>{i.itemName}</li>
                              ))}
                            </ul>
                          </td>
                          <td className="p-4 text-right">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'Returned' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                              {req.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
        
        {/* FLOATING CHECKOUT BUTTON FOR STUDENTS */}
        {cart.length > 0 && currentView === 'student' && !isMaintenanceMode && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <button onClick={() => setIsCheckoutModalOpen(true)} className="flex items-center gap-4 bg-indigo-600 text-white px-8 py-4 rounded-full font-black text-lg shadow-2xl shadow-indigo-500/40 hover:-translate-y-1 hover:shadow-indigo-500/60 active:scale-95 transition-all">
              <span className="bg-white/20 text-white w-8 h-8 rounded-full flex items-center justify-center font-mono">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
              Proceed to Checkout
              <svg className="w-6 h-6 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}