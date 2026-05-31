import React, { useState, useEffect } from 'react';

// --- Firebase Imports ---
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc } from 'firebase/firestore';
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

// Initialize Firebase, Firestore, & Auth
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // INITIALIZE AUTH

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

  // --- APP STATES ---
  const [currentView, setCurrentView] = useState('student');
  const [isLockedToStudent, setIsLockedToStudent] = useState(false);
  const [adminTab, setAdminTab] = useState('Pending'); 
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('Tools'); 
  const [cart, setCart] = useState([]); 
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [isSDModalOpen, setIsSDModalOpen] = useState(false);
  const [sdCounts, setSdCounts] = useState({ 'TL-SD-PH': 0, 'TL-SD-FL': 0, 'TL-SD-TX': 0, 'TL-SD-HX': 0 });
  const [studentForm, setStudentForm] = useState({ name: '', email: '', gradeLevel: '', gradeSection: '', purpose: '', borrowDate: '' });

  // --- NEW AUTH STATES ---
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminEmail, setAdminEmail] = useState('adminroboticshub@gmail.com'); // Pre-filled for convenience
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');

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

  // NEW FIREBASE LOGIN LOGIC
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      setIsAdminUnlocked(true);
      setAdminPassword(''); // Clear password field for security
    } catch (error) {
      setLoginError("Invalid Email or Password. Access Denied.");
      setAdminPassword('');
    }
  };

  // NEW LOGOUT LOGIC
  const handleAdminLogout = async () => {
    await signOut(auth);
    setIsAdminUnlocked(false);
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
    } catch (err) { alert("Error logging request to database. Please try again."); }
  };

  const handleApproveRequest = async (reqId) => {
    const targetRequest = requests.find(r => r.id === reqId);
    try { 
      await updateDoc(doc(db, "requests", reqId), { status: 'Approved' }); 
      if (targetRequest) triggerEmailNotification(targetRequest, 'Approved');
    } catch (err) { alert("Action Denied by Firebase: Ensure you are logged in as Admin."); }
  };

  const handleRejectRequest = async (reqId) => {
    const targetRequest = requests.find(r => r.id === reqId);
    try { 
      await updateDoc(doc(db, "requests", reqId), { status: 'Rejected' }); 
      if (targetRequest) triggerEmailNotification(targetRequest, 'Rejected');
    } catch (err) { alert("Action Denied by Firebase: Ensure you are logged in as Admin."); }
  };

  const handleReturnRequest = async (reqId) => {
    try { await updateDoc(doc(db, "requests", reqId), { status: 'Returned' }); } 
    catch (err) { alert("Action Denied by Firebase: Ensure you are logged in as Admin."); }
  };

  const filteredInventory = inventory.filter(item => item.category === activeTab && !item.hidden);

  // --- NAVIGATION ---
  const navItems = isLockedToStudent 
    ? ['Inventory', 'Settings'] 
    : ['Inventory', 'Borrowed', 'History', 'Settings'];

  const handleNavClick = (item) => {
    setUiTab(item);
    if (item === 'Inventory') setCurrentView('student');
    if (item === 'Borrowed') { setCurrentView('admin'); setAdminTab('Pending'); }
    if (item === 'History') { setCurrentView('admin'); setAdminTab('History'); }
  };

  // --- THEMING ---
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

      {/* MAIN LAYOUT */}
      <div className="relative z-10 flex h-screen w-full backdrop-blur-[2px]">
        
        {/* SIDEBAR */}
        <aside className={`w-64 border-r flex flex-col transition-colors duration-500 backdrop-blur-xl ${isDarkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white/70 border-slate-200'}`}>
          <div className="p-6 border-b border-inherit">
            <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-cyan-500 drop-shadow-sm">
              Robotics Hub
            </h1>
            <p className="text-xs uppercase tracking-widest mt-1 opacity-60 font-mono font-bold">System Terminal</p>
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

          <div className="p-6 border-t border-inherit">
             <div className="text-xs font-mono font-medium opacity-50 uppercase tracking-widest">
               Developed by <span className="text-indigo-500 font-bold">@zoidabyte</span>
             </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full flex flex-col space-y-6">
            
            {/* HEADER */}
            <header className="flex justify-between items-center">
              <h2 className={`text-3xl font-black tracking-tight flex items-center gap-3 font-mono ${theme.textMain}`}>
                <span className="opacity-40">&gt;</span> {uiTab} 
                {isAdminUnlocked && currentView === 'admin' && <span className="text-sm font-sans bg-emerald-500/20 text-emerald-500 px-3 py-1 rounded-full ml-2">Unlocked</span>}
              </h2>
              {isAdminUnlocked && currentView === 'admin' && (
                <button onClick={handleAdminLogout} className="text-sm font-bold text-red-500 hover:text-red-600 bg-red-500/10 px-4 py-2 rounded-lg transition-colors">
                  Lock Terminal 🔒
                </button>
              )}
            </header>

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
                    <button 
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition duration-300 shadow-md ${isDarkMode ? 'translate-x-9' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 2: INVENTORY */}
            {uiTab === 'Inventory' && currentView === 'student' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {showSuccessScreen && (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-md rounded-2xl p-5 flex flex-col sm:flex-row gap-4 justify-between items-center text-emerald-600 shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 shrink-0 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-xl shadow-inner">✓</div>
                      <div>
                        <h4 className="font-black text-base text-emerald-500">Request Uploaded Successfully!</h4>
                        <p className="text-sm opacity-80">Your transaction has updated the database pipeline.</p>
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
                              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>{item.id}</span>
                              <span className={`text-xs px-3 py-1 rounded-full font-black tracking-wide ${isAvailable ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                                {item.category === 'Services' ? (isAvailable ? 'Active' : 'Locked') : (isAvailable ? `${item.available} Units Available` : 'Out of Stock')}
                              </span>
                            </div>
                            <h3 className={`font-black mt-3 text-lg tracking-tight leading-tight ${theme.textMain}`}>{item.name}</h3>
                          </div>
                          {isAvailable && (
                            <div className={`mt-4 pt-3 border-t flex justify-between items-center ${theme.border}`}>
                              <span className={`text-xs font-semibold ${theme.textMuted}`}>{item.isScrewdriverTrigger ? 'Tap to setup selection' : 'Tap to add to your bag'}</span>
                              <span className="text-indigo-500 font-black text-xl bg-indigo-500/10 h-8 w-8 rounded-full flex items-center justify-center">+</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="lg:col-span-1">
                    <form onSubmit={handleBorrowSubmit} className={`${theme.card} border backdrop-blur-md rounded-3xl p-5 md:p-6 shadow-xl space-y-5 lg:sticky lg:top-24`}>
                      <h3 className={`font-black text-xl border-b pb-3 flex items-center justify-between ${theme.textMain} ${theme.border}`}>
                        <span>Selected Bag</span>
                        <span className="bg-indigo-600 text-white font-mono text-xs px-2.5 py-1 rounded-full">{cart.reduce((sum, i) => sum + i.quantity, 0)} Items</span>
                      </h3>
                      
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                          {cart.length === 0 ? <p className={`text-base text-center py-8 font-medium ${theme.textMuted}`}>No items inside your cart yet.<br/>Tap anything from the catalog above to add.</p> : 
                          cart.map((cartItem) => (
                          <div key={cartItem.id} className={`flex justify-between items-center p-3 rounded-xl border ${isDarkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                            <span className={`text-base font-bold truncate pr-2 max-w-[150px] ${theme.textMain}`}>{cartItem.name}</span>
                            <div className="flex items-center gap-3 shrink-0">
                              <button type="button" onClick={() => handleUpdateCartQuantity(cartItem.id, -1)} className={`h-9 w-9 rounded-lg text-lg font-black flex items-center justify-center shadow-sm active:scale-95 ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-white hover:bg-slate-100'}`}>-</button>
                              <span className={`text-base font-mono font-black w-5 text-center ${theme.textMain}`}>{cartItem.quantity}</span>
                              <button type="button" onClick={() => handleUpdateCartQuantity(cartItem.id, 1)} className={`h-9 w-9 rounded-lg text-lg font-black flex items-center justify-center shadow-sm active:scale-95 ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-white hover:bg-slate-100'}`}>+</button>
                              <button type="button" onClick={() => handleRemoveFromCart(cartItem.id)} className="text-slate-400 hover:text-red-500 font-black text-2xl pl-1 active:scale-90 transition-transform">×</button>
                            </div>
                            </div>
                        ))}
                      </div>

                      <div className={`space-y-4 pt-2 border-t ${theme.border}`}>
                        <div>
                          <label className={`text-xs uppercase font-black ml-1 tracking-wide ${theme.textMuted}`}>Borrower Info</label>
                          <input required type="text" placeholder="Full Name" value={studentForm.name} onChange={(e) => setStudentForm({...studentForm, name: e.target.value})} className={`w-full rounded-xl px-4 py-3.5 mt-1 text-base shadow-inner ${theme.input}`} />
                        </div>
                        <input required type="email" placeholder="School Email Address" value={studentForm.email} onChange={(e) => setStudentForm({...studentForm, email: e.target.value})} className={`w-full rounded-xl px-4 py-3.5 text-base shadow-inner ${theme.input}`} />
                        <div className="grid grid-cols-2 gap-3">
                          <select required value={studentForm.gradeLevel} onChange={(e) => setStudentForm({...studentForm, gradeLevel: e.target.value, gradeSection: ''})} className={`w-full rounded-xl px-3 py-3.5 text-base shadow-sm ${theme.input}`}>
                            <option value="">Grade</option>
                            {Object.keys(GRADE_SECTIONS).map(grade => <option key={grade} value={grade}>{grade}</option>)}
                          </select>
                          <select required disabled={!studentForm.gradeLevel} value={studentForm.gradeSection} onChange={(e) => setStudentForm({...studentForm, gradeSection: e.target.value})} className={`w-full rounded-xl px-3 py-3.5 text-base shadow-sm disabled:opacity-50 ${theme.input}`}>
                            <option value="">Section</option>
                            {studentForm.gradeLevel && GRADE_SECTIONS[studentForm.gradeLevel].map(sec => <option key={sec} value={sec}>{sec}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className={`text-xs uppercase font-black ml-1 tracking-wide ${theme.textMuted}`}>Target Collection Date</label>
                          <input required type="date" min={getMinBorrowDate()} value={studentForm.borrowDate} onChange={(e) => setStudentForm({...studentForm, borrowDate: e.target.value})} className={`w-full rounded-xl px-4 py-3.5 text-base shadow-inner ${theme.input}`} />
                        </div>
                        <div>
                          <label className={`text-xs uppercase font-black ml-1 tracking-wide ${theme.textMuted}`}>Activity Purpose</label>
                          <textarea required rows="2" placeholder="e.g., Robotics competition project..." value={studentForm.purpose} onChange={(e) => setStudentForm({...studentForm, purpose: e.target.value})} className={`w-full rounded-xl px-4 py-3.5 mt-1 text-base shadow-inner ${theme.input}`}></textarea>
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 text-white py-4 mt-2 rounded-xl text-base font-black tracking-wide shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 active:scale-[0.98] transition-transform">Submit Request</button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 3: ADMIN PORTAL */}
            {(uiTab === 'Borrowed' || uiTab === 'History') && currentView === 'admin' && (
              <div className="animate-in fade-in duration-300">
                {!isAdminUnlocked ? (
                  <div className={`${theme.card} max-w-sm mx-auto mt-20 p-8 rounded-3xl shadow-xl border text-center backdrop-blur-xl`}>
                    <div className="h-16 w-16 bg-indigo-500/20 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">🔒</div>
                    <h2 className={`text-xl font-black mb-2 ${theme.textMain}`}>Admin Gateway</h2>
                    <p className={`text-sm mb-6 ${theme.textMuted}`}>Database authorization required.</p>
                    
                    {loginError && <p className="text-red-500 text-sm font-bold mb-4">{loginError}</p>}
                    
                    <form onSubmit={handleAdminLogin} className="space-y-4">
                      {/* Email input pre-filled for convenience */}
                      <input 
                        type="email" 
                        value={adminEmail} 
                        onChange={(e) => setAdminEmail(e.target.value)} 
                        className={`w-full text-center text-sm font-mono rounded-xl px-4 py-3 opacity-60 ${theme.input}`}
                        readOnly // Optional: Remove readOnly if you ever want to change it on the fly
                      />
                      <input 
                        type="password" 
                        value={adminPassword} 
                        onChange={(e) => setAdminPassword(e.target.value)} 
                        placeholder="Enter Password" 
                        className={`w-full text-center tracking-widest text-xl font-mono rounded-xl px-4 py-4 ${theme.input}`}
                        autoFocus
                      />
                      <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black shadow-md shadow-indigo-500/30 hover:bg-indigo-500 active:scale-95 transition-all">Verify Credentials</button>
                    </form>
                  </div>
                ) : (
                  <div className="space-y-8">
                    
                    {/* Admin Specific Tabs */}
                    <section className="space-y-4">
                      <div className={`flex p-1.5 rounded-2xl w-full sm:w-fit shadow-inner ${isDarkMode ? 'bg-slate-900/60' : 'bg-slate-200/60'}`}>
                        {['Pending', 'Approved', 'History'].map((tab) => (
                          <button 
                            key={tab} 
                            onClick={() => setAdminTab(tab)} 
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 text-center sm:flex-none ${adminTab === tab ? theme.tabActive : theme.tabInactive}`}
                          >
                            {tab === 'Approved' ? 'Active Borrows' : tab}
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'}`}>
                              {requests.filter(r => tab === 'History' ? (r.status === 'Returned' || r.status === 'Rejected') : r.status === tab).length}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Main Requests Table */}
                      <div className={`${theme.card} border rounded-2xl overflow-hidden shadow-sm overflow-x-auto backdrop-blur-md`}>
                        <table className="w-full text-left text-base whitespace-nowrap">
                          <thead>
                            <tr className={`text-xs uppercase tracking-wider ${isDarkMode ? 'bg-slate-800/80 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                              <th className="px-5 py-4 font-bold">Student</th>
                              <th className="px-5 py-4 font-bold">Date Needed</th>
                              <th className="px-5 py-4 font-bold">Items</th>
                              <th className="px-5 py-4 text-right font-bold">Actions / Status</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                            {(() => {
                              const visibleRequests = requests.filter(r => adminTab === 'History' ? (r.status === 'Returned' || r.status === 'Rejected') : r.status === adminTab);
                              if (visibleRequests.length === 0) {
                                return <tr><td colSpan="4" className={`p-8 text-center ${theme.textMuted}`}>No {adminTab.toLowerCase()} requests right now.</td></tr>;
                              }
                              return visibleRequests.map(req => (
                                <tr key={req.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                                  <td className="px-5 py-4">
                                    <span className={`block font-bold ${theme.textMain}`}>{req.studentName}</span>
                                    <span className={`block text-sm font-mono ${theme.textMuted}`}>{req.gradeLevel} - {req.gradeSection}</span>
                                  </td>
                                  <td className="px-5 py-4">
                                    <span className="block font-bold text-indigo-500">
                                      {req.borrowDate ? new Date(req.borrowDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'N/A'}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4">
                                    {req.items?.map((item, idx) => (
                                      <div key={idx} className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                        {item.itemName} <span className="text-indigo-500 font-bold">x{item.quantity}</span>
                                      </div>
                                    ))}
                                  </td>
                                  <td className="px-5 py-4 text-right">
                                    {req.status === 'Pending' && (
                                      <div className="space-x-3">
                                        <button onClick={() => handleRejectRequest(req.id)} className={`${theme.textMuted} hover:text-red-500 font-bold text-sm transition-colors`}>Decline</button>
                                        <button onClick={() => handleApproveRequest(req.id)} className="bg-indigo-600 text-white hover:bg-indigo-500 px-4 py-2 rounded-lg text-sm font-black shadow-md shadow-indigo-500/30">Approve</button>
                                      </div>
                                    )}
                                    {req.status === 'Approved' && (
                                      <button onClick={() => handleReturnRequest(req.id)} className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/20 px-4 py-2 rounded-lg text-sm font-black transition-colors">
                                        Mark as Returned
                                      </button>
                                    )}
                                    {(req.status === 'Returned' || req.status === 'Rejected') && (
                                      <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide ${req.status === 'Returned' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {req.status}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </section>

                    {/* Live Inventory Tracker */}
                    <section className="space-y-4">
                      <h3 className={`text-lg font-bold border-b pb-2 ${theme.textMain} ${theme.border}`}>Live Inventory Tracker</h3>
                      <div className={`${theme.card} border rounded-xl overflow-hidden shadow-sm overflow-x-auto backdrop-blur-md`}>
                        <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead>
                            <tr className={`text-xs uppercase tracking-wider ${isDarkMode ? 'bg-slate-800/80 text-slate-400 border-b border-slate-700/50' : 'bg-slate-100 text-slate-600 border-b border-slate-200'}`}>
                              <th className="p-4 font-semibold">Item</th>
                              <th className="p-4 text-center font-semibold">Total Stock</th>
                              <th className="p-4 text-center font-semibold text-emerald-500">Available</th>
                              <th className="p-4 text-center font-semibold text-orange-500">Pending</th>
                              <th className="p-4 text-center font-semibold text-violet-500">Borrowed Out</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
                            {['Equipment', 'Tools', 'Accessories', 'Services'].map((category) => {
                              const categoryItems = inventory.filter(i => i.category === category && !i.hidden && !i.isScrewdriverTrigger);
                              if (categoryItems.length === 0) return null;
                              return (
                                <React.Fragment key={category}>
                                  <tr className={isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50/80'}>
                                    <td colSpan="5" className={`px-4 py-2 font-bold text-xs uppercase tracking-widest ${theme.textMuted}`}>
                                      {category}
                                    </td>
                                  </tr>
                                  {categoryItems.map((item) => (
                                    <tr key={item.id} className={isDarkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                                      <td className={`p-4 font-medium flex items-center gap-3 ${theme.textMain}`}>
                                        <span className={`text-xs font-mono px-2 py-0.5 rounded border ${isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-400 border-slate-200'}`}>{item.id}</span>
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
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </div>
                )}
              </div>
            )}
            
          </div>
        </main>
      </div>
    </div>
  );
}