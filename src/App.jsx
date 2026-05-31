import React, { useState, useEffect } from 'react';
// --- Firebase Imports ---
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc } from 'firebase/firestore';

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

// Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Static Data Structures ---
const GRADE_SECTIONS = {
  'Grade 7': ['Archimedes', 'Edison', 'Galileo', 'Newton'],
  'Grade 8': ['Aristotle', 'Darwin', 'Mendel', 'Linnaeus'],
  'Grade 9': ['Boyle', 'Charles', 'Dalton', 'Mendeleev'],
  'Grade 10': ['Einstein', 'Faraday', 'Pascal', 'Rutherford'],
  'Grade 11': ['Banzon', 'Campos', 'Gomez', 'Sylianco'],
  'Grade 12': ['Biyo', 'Del Mundo', 'Quisumbing', 'Zara']
};

const INITIAL_INVENTORY = [
  { id: 'EQ-LP', name: 'Laptop', category: 'Equipment', total: 46, available: 46, pending: 0, borrowed: 0 },
  { id: 'EQ-TB', name: 'Tablet', category: 'Equipment', total: 160, available: 160, pending: 0, borrowed: 0 },
  { id: 'EQ-MN', name: 'Monitor', category: 'Equipment', total: 25, available: 25, pending: 0, borrowed: 0 },
  { id: 'EQ-TV', name: 'Television (TV)', category: 'Equipment', total: 5, available: 5, pending: 0, borrowed: 0 },
  { id: 'EQ-RB', name: 'Robotics Kit', category: 'Equipment', total: 30, available: 30, pending: 0, borrowed: 0 },
  { id: 'EQ-RT', name: 'Wi-Fi Router', category: 'Equipment', total: 10, available: 10, pending: 0, borrowed: 0 },
  { id: 'EQ-UP', name: 'UPS (Power Backup)', category: 'Equipment', total: 12, available: 12, pending: 0, borrowed: 0 },
  { id: 'TL-LT', name: 'LAN Tester', category: 'Tools', total: 10, available: 10, pending: 0, borrowed: 0 },
  { id: 'TL-CT', name: 'Crimping Tool', category: 'Tools', total: 15, available: 15, pending: 0, borrowed: 0 },
  { id: 'TL-SD-SET', name: 'Screwdriver Set', category: 'Tools', total: 20, available: 20, pending: 0, borrowed: 0, isScrewdriverTrigger: true },
  { id: 'TL-SD-PH', name: 'Phillips Screwdriver', category: 'Tools', total: 5, available: 5, pending: 0, borrowed: 0, hidden: true },
  { id: 'TL-SD-FL', name: 'Flathead Screwdriver', category: 'Tools', total: 5, available: 5, pending: 0, borrowed: 0, hidden: true },
  { id: 'TL-SD-TX', name: 'Torx Screwdriver', category: 'Tools', total: 5, available: 5, pending: 0, borrowed: 0, hidden: true },
  { id: 'TL-SD-HX', name: 'Hex Screwdriver', category: 'Tools', total: 5, available: 5, pending: 0, borrowed: 0, hidden: true },
  { id: 'TL-BB', name: 'Bread Board', category: 'Tools', total: 40, available: 40, pending: 0, borrowed: 0 },
  { id: 'TL-SI', name: 'Soldering Iron', category: 'Tools', total: 10, available: 10, pending: 0, borrowed: 0 },
  { id: 'AC-KB', name: 'Keyboard', category: 'Accessories', total: 30, available: 30, pending: 0, borrowed: 0 },
  { id: 'AC-MS', name: 'Mouse', category: 'Accessories', total: 35, available: 35, pending: 0, borrowed: 0 },
  { id: 'AC-HS', name: 'Headset', category: 'Accessories', total: 25, available: 25, pending: 0, borrowed: 0 },
  { id: 'AC-VG', name: 'VGA Cable', category: 'Accessories', total: 5, available: 5, pending: 0, borrowed: 0 },
  { id: 'AC-HD', name: 'HDMI Cable', category: 'Accessories', total: 5, available: 5, pending: 0, borrowed: 0 },
  { id: 'AC-EX', name: 'Extension Cord', category: 'Accessories', total: 15, available: 15, pending: 0, borrowed: 0 },
  { id: 'SV-2D', name: '2D Printing', category: 'Services', total: 999, available: 999, pending: 0, borrowed: 0 },
  { id: 'SV-3D', name: '3D Printing', category: 'Services', total: 1, available: 0, pending: 0, borrowed: 0, isLocked: true }
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

  // --- ORIGINAL STATES ---
  const [currentView, setCurrentView] = useState('student');
  const [isLockedToStudent, setIsLockedToStudent] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const ADMIN_PASSCODE = "0029";
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('Tools');
  const [cart, setCart] = useState([]); 
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [isSDModalOpen, setIsSDModalOpen] = useState(false);
  const [sdCounts, setSdCounts] = useState({ 'TL-SD-PH': 0, 'TL-SD-FL': 0, 'TL-SD-TX': 0, 'TL-SD-HX': 0 });
  const [studentForm, setStudentForm] = useState({ name: '', email: '', gradeLevel: '', gradeSection: '', purpose: '', borrowDate: '' });

  // --- EFFECTS ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'student') {
      setCurrentView('student');
      setIsLockedToStudent(true); 
    } else {
      setCurrentView('admin');
      setIsLockedToStudent(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "requests"), (snapshot) => {
      const fetchedRequests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedRequests.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setRequests(fetchedRequests);

      let updatedInventory = INITIAL_INVENTORY.map(item => ({ ...item, pending: 0, borrowed: 0, available: item.total }));

      fetchedRequests.forEach(req => {
        if (req.status === 'Pending') {
          req.items.forEach(reqItem => {
            const match = updatedInventory.find(i => i.id === reqItem.itemId);
            if (match) match.pending += reqItem.quantity;
          });
        } else if (req.status === 'Approved') {
          req.items.forEach(reqItem => {
            const match = updatedInventory.find(i => i.id === reqItem.itemId);
            if (match) {
              match.borrowed += reqItem.quantity;
              if (match.category !== 'Services') {
                match.available = Math.max(0, match.available - reqItem.quantity);
              }
            }
          });
        }
      });
      setInventory(updatedInventory);
    });
    return () => unsubscribe();
  }, []);

  // --- FUNCTIONS ---
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (pinInput === ADMIN_PASSCODE) {
      setIsAdminUnlocked(true);
      setPinInput('');
    } else {
      alert("Incorrect PIN. Access Denied.");
      setPinInput('');
    }
  };

  const triggerEmailNotification = async (reqData, newStatus) => {
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: reqData.email,
          subject: `Equipment Request Update: ${newStatus}`,
          studentName: reqData.studentName,
          status: newStatus,
          items: reqData.items
        })
      });
    } catch (err) {
      console.error("Failed to send email configuration callback:", err);
    }
  };

  const handleAddToCart = (item) => {
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
      setCart([]); setShowSuccessScreen(true);
      setStudentForm({ name: '', email: '', gradeLevel: '', gradeSection: '', purpose: '', borrowDate: '' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { alert("Error logging request to database. Please try again.");
    }
  };

  const handleApproveRequest = async (reqId) => {
    const targetRequest = requests.find(r => r.id === reqId);
    try { 
      await updateDoc(doc(db, "requests", reqId), { status: 'Approved' }); 
      if (targetRequest) triggerEmailNotification(targetRequest, 'Approved');
    } catch (err) { alert("Error updating request status."); }
  };

  const handleRejectRequest = async (reqId) => {
    const targetRequest = requests.find(r => r.id === reqId);
    try { 
      await updateDoc(doc(db, "requests", reqId), { status: 'Rejected' }); 
      if (targetRequest) triggerEmailNotification(targetRequest, 'Rejected');
    } catch (err) { alert("Error updating request status."); }
  };

  const handleReturnRequest = async (reqId) => {
    try { await updateDoc(doc(db, "requests", reqId), { status: 'Returned' });
    } 
    catch (err) { alert("Error marking as returned."); }
  };

  const filteredInventory = inventory.filter(item => item.category === activeTab && !item.hidden);

  // --- UPDATED SIDEBAR ROUTING LOGIC ---
  const navItems = isLockedToStudent 
    ? ['Inventory', 'Settings'] 
    : ['Inventory', 'Borrowed', 'History', 'Settings'];

  const handleNavClick = (item) => {
    setUiTab(item);
    if (!isLockedToStudent && currentView === 'admin') {
      setCurrentView('admin');
    } else {
      setCurrentView('student');
    }
  };

  // --- DYNAMIC THEMING HELPERS ---
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
      
      {/* 1. ANIMATED 6K HIGH-TECH BACKGROUND */}
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
                linear-gradient(to right, ${isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} 1px, transparent 1px),
                linear-gradient(to bottom, ${isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'} 1px, transparent 1px);
              animation: panGrid 3s linear infinite;
            }
          `}
        </style>
        <div className="absolute inset-0 tech-grid"></div>
        <div className={`absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] pointer-events-none ${isDarkMode ? 'bg-indigo-900/30' : 'bg-blue-400/20'}`}></div>
        <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[140px] pointer-events-none ${isDarkMode ? 'bg-emerald-900/20' : 'bg-cyan-400/20'}`}></div>
      </div>

      {/* Screwdriver Modal */}
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

      {/* 2. MAIN APP LAYOUT */}
      <div className="relative z-10 flex h-screen w-full backdrop-blur-[2px]">
        
        {/* Sidebar Navigation */}
        <aside className={`w-64 border-r flex flex-col transition-colors duration-500 backdrop-blur-xl ${isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white/70 border-slate-200'}`}>
          <div className="p-6 border-b border-inherit">
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-cyan-500 drop-shadow-sm leading-tight">
              Pascian<br/>Robotics Hub
            </h1>
            <p className="text-xs uppercase tracking-widest mt-2 opacity-60 font-mono font-bold">System Terminal</p>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => (
              <button
                key={item}
                onClick={() => handleNavClick(item)}
                className={`w-full text-left px-4 py-3 rounded-lg font-bold transition-all duration-300 flex items-center gap-3 ${
                  uiTab === item ? theme.tabActive : theme.tabInactive
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-sm transition-all duration-300 ${uiTab === item ? 'bg-current shadow-[0_0_8px_currentColor]' : 'bg-transparent'}`}></div>
                {item}
              </button>
            ))}
          </nav>
        </aside>

        {/* 3. MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full flex flex-col space-y-6">
            
            {/* Dynamic Header */}
            <header className="flex justify-between items-center">
              <h2 className={`text-3xl font-black tracking-tight flex items-center gap-3 font-mono ${theme.textMain}`}>
                <span className="opacity-40">&gt;</span> {uiTab}
              </h2>
            </header>

            {/* ADMIN PIN SCREEN */}
            {currentView === 'admin' && !isAdminUnlocked && (
              <div className="flex flex-col items-center justify-center h-[60vh] animate-in fade-in zoom-in duration-300">
                <div className={`${theme.card} p-10 rounded-3xl border backdrop-blur-xl shadow-2xl max-w-sm w-full text-center space-y-6`}>
                  <div className="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20 shadow-inner">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                  </div>
                  <div>
                    <h2 className={`text-2xl font-black ${theme.textMain}`}>Admin Terminal</h2>
                    <p className={`text-sm mt-2 ${theme.textMuted}`}>Enter access code to proceed.</p>
                  </div>
                  <form onSubmit={handleAdminLogin} className="space-y-4">
                    <input type="password" placeholder="••••" value={pinInput} onChange={(e) => setPinInput(e.target.value)} className={`w-full text-center tracking-[1em] text-2xl p-4 rounded-xl font-mono ${theme.input} shadow-inner outline-none transition-all`} autoFocus />
                    <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-1 active:scale-95 transition-all duration-300 uppercase tracking-widest text-sm">Authenticate</button>
                  </form>
                </div>
              </div>
            )}

            {/* VIEW 1: SETTINGS */}
            {uiTab === 'Settings' && (
              <div className={`${theme.card} flex-1 rounded-3xl border backdrop-blur-xl p-8 transition-colors duration-500`}>
                <div className="space-y-6 max-w-xl">
                  <h3 className={`text-xl font-bold border-b pb-3 font-mono ${theme.border}`}>System Preferences</h3>
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

            {/* VIEW 2: STUDENT CATALOG (STUDENT VIEW ONLY) */}
            {uiTab === 'Inventory' && currentView === 'student' && (
              <div className="space-y-8 animate-in fade-in duration-300">
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

                <div className={`flex p-1.5 rounded-2xl w-full shadow-inner overflow-x-auto gap-1 ${isDarkMode ? 'bg-slate-900/60' : 'bg-slate-200/60'}`}>
                  {['Equipment', 'Tools', 'Accessories', 'Services'].map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-3.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex-1 text-center active:scale-95 ${activeTab === tab ? theme.tabActive : theme.tabInactive}`}>{tab}</button>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredInventory.map((item) => {
                      const isAvailable = item.category === 'Services' ? !item.isLocked : item.available > 0;
                      return (
                        <div key={item.id} onClick={() => !item.isLocked && isAvailable && handleAddToCart(item)} className={`${theme.card} border p-5 rounded-2xl backdrop-blur-md transition-all flex flex-col justify-between min-h-[140px] ${item.isLocked ? 'opacity-40' : isAvailable ? 'cursor-pointer hover:border-indigo-500 active:scale-[0.99]' : 'opacity-50'}`}>
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

                  <div className={`${theme.card} border rounded-3xl p-6 backdrop-blur-xl shadow-lg sticky top-6`}>
                    <h3 className={`text-xl font-black mb-4 flex items-center gap-2 ${theme.textMain}`}>
                      <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                      Request Cart
                    </h3>
                    
                    {cart.length === 0 ? (
                      <div className={`text-center py-12 rounded-2xl border border-dashed ${isDarkMode ? 'border-slate-700 text-slate-500' : 'border-slate-300 text-slate-400'}`}>
                        <p className="font-medium text-sm">Cart is empty.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="max-h-[30vh] overflow-y-auto pr-2 space-y-2">
                          {cart.map((item) => (
                            <div key={item.id} className={`flex justify-between items-center p-3 rounded-xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                              <div className="flex-1 truncate pr-2">
                                <p className={`font-bold text-sm truncate ${theme.textMain}`}>{item.name}</p>
                                <p className={`text-[10px] font-mono ${theme.textMuted}`}>{item.id}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                {item.category !== 'Services' && (
                                  <div className="flex items-center gap-2 bg-slate-500/10 rounded-lg p-1">
                                    <button onClick={() => handleUpdateCartQuantity(item.id, -1)} className={`w-6 h-6 rounded-md flex items-center justify-center font-bold active:scale-95 ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-slate-800 shadow-sm'}`}>-</button>
                                    <span className="font-mono font-bold text-sm w-4 text-center">{item.quantity}</span>
                                    <button onClick={() => handleUpdateCartQuantity(item.id, 1)} className={`w-6 h-6 rounded-md flex items-center justify-center font-bold active:scale-95 ${isDarkMode ? 'bg-slate-700 text-white' : 'bg-white text-slate-800 shadow-sm'}`}>+</button>
                                  </div>
                                )}
                                <button onClick={() => handleRemoveFromCart(item.id)} className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <form onSubmit={handleBorrowSubmit} className="space-y-3 pt-4 border-t border-slate-500/20">
                          <input required type="text" placeholder="Student Name" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm font-medium outline-none border transition-all ${theme.input}`} />
                          <input required type="email" placeholder="Email Address" value={studentForm.email} onChange={e => setStudentForm({...studentForm, email: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm font-medium outline-none border transition-all ${theme.input}`} />
                          <div className="grid grid-cols-2 gap-3">
                            <select required value={studentForm.gradeLevel} onChange={e => setStudentForm({...studentForm, gradeLevel: e.target.value, gradeSection: ''})} className={`w-full px-4 py-3 rounded-xl text-sm font-medium outline-none border transition-all ${theme.input}`}>
                              <option value="">Grade Level</option>
                              {Object.keys(GRADE_SECTIONS).map(grade => <option key={grade} value={grade}>{grade}</option>)}
                            </select>
                            <select required value={studentForm.gradeSection} onChange={e => setStudentForm({...studentForm, gradeSection: e.target.value})} disabled={!studentForm.gradeLevel} className={`w-full px-4 py-3 rounded-xl text-sm font-medium outline-none border transition-all disabled:opacity-50 ${theme.input}`}>
                              <option value="">Section</option>
                              {studentForm.gradeLevel && GRADE_SECTIONS[studentForm.gradeLevel].map(section => <option key={section} value={section}>{section}</option>)}
                            </select>
                          </div>
                          <input required type="date" min={getMinBorrowDate()} value={studentForm.borrowDate} onChange={e => setStudentForm({...studentForm, borrowDate: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm font-medium outline-none border transition-all ${theme.input}`} />
                          <textarea required placeholder="Purpose / Experiment Name" value={studentForm.purpose} onChange={e => setStudentForm({...studentForm, purpose: e.target.value})} className={`w-full px-4 py-3 rounded-xl text-sm font-medium outline-none border transition-all resize-none h-24 ${theme.input}`} />
                          <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 active:scale-95 transition-all uppercase tracking-widest text-sm">Submit Request</button>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 3: LIVE INVENTORY TRACKER (ADMIN VIEW ONLY) */}
            {uiTab === 'Inventory' && currentView === 'admin' && isAdminUnlocked && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <section className="space-y-6">
                  
                  {/* Centered Category Tabs */}
                  <div className="flex justify-center">
                    <div className={`flex p-1.5 rounded-2xl w-full max-w-2xl shadow-inner overflow-x-auto gap-1 ${isDarkMode ? 'bg-slate-900/60' : 'bg-slate-200/60'}`}>
                      {['Equipment', 'Tools', 'Accessories', 'Services'].map((tab) => (
                        <button 
                          key={tab} 
                          onClick={() => setActiveTab(tab)} 
                          className={`px-5 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex-1 text-center active:scale-95 ${activeTab === tab ? theme.tabActive : theme.tabInactive}`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={`${theme.card} border rounded-xl overflow-hidden shadow-sm overflow-x-auto backdrop-blur-md`}>
                    <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className={isDarkMode ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-100 text-slate-700'}>
                          <th className="p-4 font-bold text-sm uppercase tracking-wider">Item Details</th>
                          <th className="p-4 font-bold text-sm uppercase tracking-wider text-center">Total Stock</th>
                          <th className="p-4 font-bold text-sm uppercase tracking-wider text-center text-emerald-500">Available</th>
                          <th className="p-4 font-bold text-sm uppercase tracking-wider text-center text-orange-500">Pending</th>
                          <th className="p-4 font-bold text-sm uppercase tracking-wider text-center text-violet-500">Borrowed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-inherit">
                        {inventory
                          .filter(i => i.category === activeTab && !i.hidden)
                          .map(item => (
                            <tr key={item.id} className="transition-colors hover:bg-black/5">
                              <td className={`p-4 font-medium flex items-center gap-3 ${theme.textMain}`}>
                                <span className={`text-[10px] font-mono px-2 py-1 rounded border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>{item.id}</span>
                                {item.name}
                              </td>
                              <td className={`p-4 text-center ${theme.textMuted}`}>
                                {item.category === 'Services' ? '-' : item.total}
                              </td>
                              <td className="p-4 text-center font-semibold text-emerald-500">
                                {item.category === 'Services' ? '-' : item.available}
                              </td>
                              <td className="p-4 text-center font-medium text-orange-500">
                                {item.pending}
                              </td>
                              <td className="p-4 text-center font-medium text-violet-500">
                                {item.borrowed}
                              </td>
                            </tr>
                        ))}
                        {inventory.filter(i => i.category === activeTab && !i.hidden).length === 0 && (
                          <tr>
                            <td colSpan="5" className={`p-8 text-center text-sm font-medium ${theme.textMuted}`}>
                              No items found in this category.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {/* VIEW 4: BORROWED (ADMIN ONLY) */}
            {uiTab === 'Borrowed' && currentView === 'admin' && isAdminUnlocked && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className={`${theme.card} border rounded-2xl overflow-hidden backdrop-blur-xl shadow-lg`}>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={isDarkMode ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-100 text-slate-700'}>
                        <th className="p-4 font-bold text-sm uppercase">Date/Time</th>
                        <th className="p-4 font-bold text-sm uppercase">Student Info</th>
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
                            <ul className="space-y-1">
                              {req.items.map((i, idx) => (
                                <li key={idx} className={`text-sm ${theme.textMain}`}>
                                  <span className="font-bold text-indigo-500 mr-2">{i.quantity}x</span>{i.itemName}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="p-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              req.status === 'Pending' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                              'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            }`}>
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

            {/* VIEW 5: HISTORY (ADMIN ONLY) */}
            {uiTab === 'History' && currentView === 'admin' && isAdminUnlocked && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <h3 className={`text-xl font-bold border-b pb-2 ${theme.textMain} ${theme.border}`}>Archived Records</h3>
                <div className={`${theme.card} border rounded-2xl overflow-hidden backdrop-blur-xl shadow-lg`}>
                  <table className="w-full text-left border-collapse">
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
                            <div className="text-xs font-mono mt-1 opacity-70">{new Date(req.timestamp).toLocaleTimeString()}</div>
                          </td>
                          <td className="p-4">
                            <div className={`font-bold ${theme.textMain}`}>{req.studentName}</div>
                            <div className={`text-xs ${theme.textMuted}`}>{req.gradeLevel} - {req.gradeSection}</div>
                          </td>
                          <td className="p-4">
                            <ul className="space-y-1">
                              {req.items.map((i, idx) => (
                                <li key={idx} className={`text-sm ${theme.textMain}`}>
                                  <span className="font-bold text-indigo-500 mr-2">{i.quantity}x</span>{i.itemName}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="p-4 text-right">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              req.status === 'Returned' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' :
                              'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                            }`}>
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
      </div>
    </div>
  );
}