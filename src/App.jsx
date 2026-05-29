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
  const [currentView, setCurrentView] = useState('student');
  const [isLockedToStudent, setIsLockedToStudent] = useState(false);

  // --- Security State ---
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const ADMIN_PASSCODE = "1234";

  // --- Admin Dashboard State ---
  const [adminTab, setAdminTab] = useState('Pending'); // Controls which requests are visible

  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [requests, setRequests] = useState([]);

  const [activeTab, setActiveTab] = useState('Tools'); 
  const [cart, setCart] = useState([]); 
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  
  const [isSDModalOpen, setIsSDModalOpen] = useState(false);
  const [sdCounts, setSdCounts] = useState({ 'TL-SD-PH': 0, 'TL-SD-FL': 0, 'TL-SD-TX': 0, 'TL-SD-HX': 0 });

  const [studentForm, setStudentForm] = useState({ name: '', email: '', gradeLevel: '', gradeSection: '', purpose: '', borrowDate: '' });

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
        // If status is 'Returned' or 'Rejected', it intentionally does NOT count toward pending or borrowed, auto-restoring stock!
      });
      setInventory(updatedInventory);
    });
    return () => unsubscribe();
  }, []);

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

  // --- Database Action Handlers ---
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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans antialiased selection:bg-indigo-500/20">
      
      {/* Screwdriver Modal */}
      {isSDModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200">
            <h3 className="font-black text-slate-900 text-xl mb-4">Select Screwdrivers</h3>
            <div className="space-y-4">
              {['TL-SD-PH', 'TL-SD-FL', 'TL-SD-TX', 'TL-SD-HX'].map(id => {
                const item = inventory.find(i => i.id === id);
                return (
                  <div key={id} className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-base font-bold text-slate-700">{item?.name}</span>
                    <div className="flex items-center gap-4">
                      <button type="button" onClick={() => setSdCounts({...sdCounts, [id]: Math.max(0, sdCounts[id] - 1)})} className="bg-slate-100 px-4 py-2 rounded-xl font-black text-xl hover:bg-slate-200 active:scale-95 transition-transform">-</button>
                      <span className="font-mono font-bold w-6 text-center text-lg">{sdCounts[id]}</span>
                      <button type="button" onClick={() => setSdCounts({...sdCounts, [id]: Math.min(item?.available || 0, sdCounts[id] + 1)})} className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl font-black text-xl hover:bg-indigo-200 active:scale-95 transition-transform">+</button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-6 flex gap-4">
              <button type="button" onClick={() => {setIsSDModalOpen(false); setSdCounts({'TL-SD-PH': 0, 'TL-SD-FL': 0, 'TL-SD-TX': 0, 'TL-SD-HX': 0});}} className="flex-1 py-3.5 rounded-xl text-slate-600 font-bold bg-slate-100 active:scale-95 transition-transform">Cancel</button>
              <button type="button" onClick={confirmScrewdriverSelection} className="flex-1 py-3.5 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-200 active:scale-95 transition-transform">Confirm Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-4 flex justify-between items-center bg-white border-b border-slate-200 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-md shrink-0">
            <span className="font-black text-white text-lg">PRH</span>
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">Pascian Robotics Hub</h1>
            <p className="text-xs tracking-wider text-indigo-600 font-mono font-bold">Equipment Portal</p>
          </div>
        </div>
        
        {!isLockedToStudent ? (
          <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-xl">
            <button onClick={() => setCurrentView('admin')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentView === 'admin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Admin</button>
            <button onClick={() => setCurrentView('student')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${currentView === 'student' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>Student</button>
          </div>
        ) : (
          <span className="bg-indigo-100 text-indigo-800 px-4 py-2 rounded-xl text-xs font-black tracking-wide uppercase border border-indigo-200">
            Portal
          </span>
        )}
      </header>

      {/* ADMIN CONTROL PANEL */}
      {currentView === 'admin' && (
        <main className="max-w-7xl mx-auto p-4 md:p-8">
          
          {/* Security Gate */}
          {!isAdminUnlocked ? (
            <div className="max-w-sm mx-auto mt-20 bg-white p-8 rounded-3xl shadow-xl border border-slate-200 text-center">
              <div className="h-16 w-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">🔒</div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Admin Access</h2>
              <p className="text-sm text-slate-500 mb-6">Enter your security PIN to access the dashboard.</p>
              
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <input 
                  type="password" 
                  value={pinInput} 
                  onChange={(e) => setPinInput(e.target.value)} 
                  placeholder="Enter PIN" 
                  className="w-full text-center tracking-widest text-2xl font-mono bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 focus:outline-none focus:border-indigo-500 focus:bg-white"
                  autoFocus
                />
                <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black shadow-md hover:bg-indigo-700 active:scale-95 transition-all">Unlock</button>
              </form>
            </div>
          ) : (
            
            /* Admin Dashboard */
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-end">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">System Dashboard</h2>
                <button onClick={() => setIsAdminUnlocked(false)} className="text-sm font-bold text-slate-500 hover:text-slate-800">Lock Terminal 🔒</button>
              </div>

              <section className="space-y-4">
                
                {/* Tracker Tabs */}
                <div className="flex bg-slate-200/80 p-1 rounded-xl w-full sm:w-fit shadow-inner">
                  {['Pending', 'Approved', 'History'].map((tab) => (
                    <button 
                      key={tab} 
                      onClick={() => setAdminTab(tab)} 
                      className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all flex-1 text-center sm:flex-none ${adminTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      {tab === 'Approved' ? 'Active Borrows' : tab}
                      <span className="ml-2 bg-slate-100 text-slate-500 text-xs px-2 py-0.5 rounded-full">
                        {requests.filter(r => tab === 'History' ? (r.status === 'Returned' || r.status === 'Rejected') : r.status === tab).length}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Filtered Request Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
                  <table className="w-full text-left text-base whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="px-5 py-4 font-bold">Student</th>
                        <th className="px-5 py-4 font-bold">Date Needed</th>
                        <th className="px-5 py-4 font-bold">Items</th>
                        <th className="px-5 py-4 text-right font-bold">Actions / Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      
                      {/* Determine which requests to show based on the active tab */}
                      {(() => {
                        const visibleRequests = requests.filter(r => adminTab === 'History' ? (r.status === 'Returned' || r.status === 'Rejected') : r.status === adminTab);
                        if (visibleRequests.length === 0) {
                          return <tr><td colSpan="4" className="p-8 text-center text-slate-400">No {adminTab.toLowerCase()} requests right now.</td></tr>;
                        }

                        return visibleRequests.map(req => (
                          <tr key={req.id}>
                            <td className="px-5 py-4">
                              <span className="block font-bold text-slate-900">{req.studentName}</span>
                              <span className="block text-slate-500 text-sm font-mono">{req.gradeLevel} - {req.gradeSection}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="block font-bold text-indigo-700">
                                {req.borrowDate ? new Date(req.borrowDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'N/A'}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              {req.items?.map((item, idx) => (
                                <div key={idx} className="text-sm font-medium text-slate-700">
                                  {item.itemName} <span className="text-indigo-600 font-bold">x{item.quantity}</span>
                                </div>
                              ))}
                            </td>
                            <td className="px-5 py-4 text-right">
                              
                              {/* Dynamic Buttons based on status */}
                              {req.status === 'Pending' && (
                                <div className="space-x-3">
                                  <button onClick={() => handleRejectRequest(req.id)} className="text-slate-500 hover:text-red-600 font-bold text-sm">Decline</button>
                                  <button onClick={() => handleApproveRequest(req.id)} className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-black shadow-md">Approve</button>
                                </div>
                              )}

                              {req.status === 'Approved' && (
                                <button onClick={() => handleReturnRequest(req.id)} className="bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200 px-4 py-2 rounded-lg text-sm font-black shadow-sm transition-colors">
                                  Mark as Returned
                                </button>
                              )}

                              {(req.status === 'Returned' || req.status === 'Rejected') && (
                                <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wide ${req.status === 'Returned' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
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

              <section className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 border-b border-slate-200 pb-2">Live Inventory Tracker</h3>
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                        <th className="p-4 font-semibold">Item</th>
                        <th className="p-4 text-center font-semibold">Total Stock</th>
                        <th className="p-4 text-center font-semibold text-emerald-600">Available</th>
                        <th className="p-4 text-center font-semibold text-orange-500">Pending</th>
                        <th className="p-4 text-center font-semibold text-violet-600">Borrowed Out</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      
                      {/* Group items by category to make the table scannable */}
                      {['Equipment', 'Tools', 'Accessories', 'Services'].map((category) => {
                        const categoryItems = inventory.filter(i => i.category === category && !i.hidden && !i.isScrewdriverTrigger);
                        
                        if (categoryItems.length === 0) return null;

                        return (
                          <React.Fragment key={category}>
                            {/* Category Sub-header Row */}
                            <tr className="bg-slate-50/80">
                              <td colSpan="5" className="px-4 py-2 font-bold text-xs uppercase tracking-widest text-slate-500">
                                {category}
                              </td>
                            </tr>
                            
                            {/* Items inside this category */}
                            {categoryItems.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-4 font-medium text-slate-700 flex items-center gap-3">
                                  <span className="text-xs text-slate-400 font-mono bg-white border border-slate-200 px-2 py-0.5 rounded shadow-sm">{item.id}</span>
                                  {item.name}
                                </td>
                                <td className="p-4 text-center text-slate-600">
                                  {item.category === 'Services' ? '-' : item.total}
                                </td>
                                <td className="p-4 text-center font-semibold text-emerald-600">
                                  {item.category === 'Services' ? '-' : item.available}
                                </td>
                                <td className="p-4 text-center font-medium text-orange-500">
                                  {item.pending}
                                </td>
                                <td className="p-4 text-center font-medium text-violet-600">
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
        </main>
      )}

      {/* STUDENT SUBMISSION SCREEN (Kept exactly the same) */}
      {currentView === 'student' && (
        <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
          {showSuccessScreen && (
            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-5 flex flex-col sm:flex-row gap-4 justify-between items-center text-emerald-900 shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 shrink-0 rounded-full bg-emerald-500 flex items-center justify-center text-white font-black text-xl shadow-inner">✓</div>
                <div>
                  <h4 className="font-black text-base">Request Uploaded Successfully!</h4>
                  <p className="text-sm text-emerald-700">Your layout transaction has updated the database pipeline.</p>
                </div>
              </div>
              <button onClick={() => setShowSuccessScreen(false)} className="w-full sm:w-auto text-emerald-900 text-sm font-black bg-white px-6 py-3.5 rounded-xl border border-emerald-200 active:scale-95 transition-transform">Dismiss Info</button>
            </div>
          )}

          <div className="flex bg-slate-200/80 p-1.5 rounded-2xl w-full shadow-inner overflow-x-auto gap-1">
            {['Equipment', 'Tools', 'Accessories', 'Services'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-3.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex-1 text-center active:scale-95 ${activeTab === tab ? 'bg-white text-indigo-600 font-black shadow-md' : 'text-slate-600 hover:text-slate-900'}`}>{tab}</button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredInventory.map((item) => {
                const isAvailable = item.category === 'Services' ? !item.isLocked : item.available > 0;
                return (
                  <div key={item.id} onClick={() => !item.isLocked && isAvailable && handleAddToCart(item)} className={`bg-white border border-slate-200 p-5 rounded-2xl shadow-md transition-all flex flex-col justify-between min-h-[140px] ${item.isLocked ? 'opacity-60 bg-slate-50' : isAvailable ? 'cursor-pointer hover:border-indigo-500 active:border-indigo-600 active:scale-[0.99]' : 'opacity-50'}`}>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded">{item.id}</span>
                        <span className={`text-xs px-3 py-1 rounded-full font-black tracking-wide ${isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          {item.category === 'Services' ? (isAvailable ? 'Active' : 'Locked') : (isAvailable ? `${item.available} Units Available` : 'Out of Stock')}
                        </span>
                      </div>
                      <h3 className="font-black mt-3 text-lg text-slate-800 tracking-tight leading-tight">{item.name}</h3>
                    </div>
                    {isAvailable && (
                      <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center">
                        <span className="text-xs text-slate-400 font-semibold">{item.isScrewdriverTrigger ? 'Tap to setup selection' : 'Tap to add to your bag'}</span>
                        <span className="text-indigo-600 font-black text-xl bg-indigo-50 h-8 w-8 rounded-full flex items-center justify-center">+</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-1">
              <form onSubmit={handleBorrowSubmit} className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-xl space-y-5 lg:sticky lg:top-24">
                <h3 className="font-black text-slate-900 text-xl border-b border-slate-100 pb-3 flex items-center justify-between">
                  <span>Selected Bag</span>
                  <span className="bg-indigo-600 text-white font-mono text-xs px-2.5 py-1 rounded-full">{cart.reduce((sum, i) => sum + i.quantity, 0)} Items</span>
                </h3>
                
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                   {cart.length === 0 ? <p className="text-base text-slate-400 text-center py-8 font-medium">No items inside your cart yet. Tap anything from the catalog above to add.</p> : 
                    cart.map((cartItem) => (
                    <div key={cartItem.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-base font-bold text-slate-800 truncate pr-2 max-w-[150px]">{cartItem.name}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <button type="button" onClick={() => handleUpdateCartQuantity(cartItem.id, -1)} className="h-9 w-9 bg-white border border-slate-200 rounded-lg text-lg font-black flex items-center justify-center shadow-sm active:bg-slate-100">-</button>
                        <span className="text-base font-mono font-black w-5 text-center text-slate-900">{cartItem.quantity}</span>
                        <button type="button" onClick={() => handleUpdateCartQuantity(cartItem.id, 1)} className="h-9 w-9 bg-white border border-slate-200 rounded-lg text-lg font-black flex items-center justify-center shadow-sm active:bg-slate-100">+</button>
                        <button type="button" onClick={() => handleRemoveFromCart(cartItem.id)} className="text-slate-400 hover:text-red-500 font-black text-2xl pl-1 active:scale-90 transition-transform">×</button>
                      </div>
                     </div>
                  ))}
                </div>

                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div>
                    <label className="text-xs uppercase font-black text-slate-400 ml-1 tracking-wide">Borrower Info</label>
                    <input required type="text" placeholder="Full Name" value={studentForm.name} onChange={(e) => setStudentForm({...studentForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 mt-1 text-base shadow-inner focus:outline-none focus:border-indigo-500 focus:bg-white" />
                  </div>
                  <input required type="email" placeholder="School Email Address" value={studentForm.email} onChange={(e) => setStudentForm({...studentForm, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base shadow-inner focus:outline-none focus:border-indigo-500 focus:bg-white" />
                  <div className="grid grid-cols-2 gap-3">
                    <select required value={studentForm.gradeLevel} onChange={(e) => setStudentForm({...studentForm, gradeLevel: e.target.value, gradeSection: ''})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3.5 text-base shadow-sm focus:outline-none focus:border-indigo-500 focus:bg-white">
                      <option value="">Grade</option>
                       {Object.keys(GRADE_SECTIONS).map(grade => <option key={grade} value={grade}>{grade}</option>)}
                    </select>
                    <select required disabled={!studentForm.gradeLevel} value={studentForm.gradeSection} onChange={(e) => setStudentForm({...studentForm, gradeSection: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3.5 text-base shadow-sm disabled:opacity-50 focus:outline-none focus:border-indigo-500 focus:bg-white">
                      <option value="">Section</option>
                      {studentForm.gradeLevel && GRADE_SECTIONS[studentForm.gradeLevel].map(sec => <option key={sec} value={sec}>{sec}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs uppercase font-black text-slate-400 ml-1 tracking-wide">Target Collection Date</label>
                    <input required type="date" min={getMinBorrowDate()} value={studentForm.borrowDate} onChange={(e) => setStudentForm({...studentForm, borrowDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-base shadow-inner focus:outline-none focus:border-indigo-500 focus:bg-white" />
                  </div>
                  <div>
                    <label className="text-xs uppercase font-black text-slate-400 ml-1 tracking-wide">Activity Purpose</label>
                    <textarea required rows="2" placeholder="e.g., Robotics competition project..." value={studentForm.purpose} onChange={(e) => setStudentForm({...studentForm, purpose: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 mt-1 text-base shadow-inner focus:outline-none focus:border-indigo-500 focus:bg-white"></textarea>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white py-4 mt-2 rounded-xl text-base font-black tracking-wide shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-transform">Submit Request</button>
                </div>
              </form>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}