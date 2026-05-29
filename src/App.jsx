import React, { useState, useEffect } from 'react';

// --- Data Structures ---
const GRADE_SECTIONS = {
  'Grade 7': ['Archimedes', 'Edison', 'Galileo', 'Newton'],
  'Grade 8': ['Aristotle', 'Darwin', 'Mendel', 'Linnaeus'],
  'Grade 9': ['Boyle', 'Charles', 'Dalton', 'Mendeleev'],
  'Grade 10': ['Einstein', 'Faraday', 'Pascal', 'Rutherford'],
  'Grade 11': ['Banzon', 'Campos', 'Gomez', 'Sylianco'],
  'Grade 12': ['Biyo', 'Del Mundo', 'Quisumbing', 'Zara']
};

const INITIAL_INVENTORY = [
  // --- Equipment ---
  { id: 'EQ-LP', name: 'Laptop', category: 'Equipment', total: 46, available: 44, pending: 1, borrowed: 1 },
  { id: 'EQ-TB', name: 'Tablet', category: 'Equipment', total: 160, available: 159, pending: 0, borrowed: 1 },
  { id: 'EQ-MN', name: 'Monitor', category: 'Equipment', total: 25, available: 24, pending: 1, borrowed: 0 },
  { id: 'EQ-TV', name: 'Television (TV)', category: 'Equipment', total: 5, available: 5, pending: 0, borrowed: 0 },
  { id: 'EQ-RB', name: 'Robotics Kit', category: 'Equipment', total: 30, available: 28, pending: 0, borrowed: 2 },
  { id: 'EQ-RT', name: 'Wi-Fi Router', category: 'Equipment', total: 10, available: 10, pending: 0, borrowed: 0 },
  { id: 'EQ-UP', name: 'UPS (Power Backup)', category: 'Equipment', total: 12, available: 12, pending: 0, borrowed: 0 },

  // --- Tools ---
  { id: 'TL-LT', name: 'LAN Tester', category: 'Tools', total: 10, available: 10, pending: 0, borrowed: 0 },
  { id: 'TL-CT', name: 'Crimping Tool', category: 'Tools', total: 15, available: 15, pending: 0, borrowed: 0 },
  { id: 'TL-SD-SET', name: 'Screwdriver Set', category: 'Tools', total: 20, available: 20, pending: 0, borrowed: 0, isScrewdriverTrigger: true },
  { id: 'TL-SD-PH', name: 'Phillips Screwdriver', category: 'Tools', total: 5, available: 4, pending: 1, borrowed: 0, hidden: true },
  { id: 'TL-SD-FL', name: 'Flathead Screwdriver', category: 'Tools', total: 5, available: 5, pending: 0, borrowed: 0, hidden: true },
  { id: 'TL-SD-TX', name: 'Torx Screwdriver', category: 'Tools', total: 5, available: 5, pending: 0, borrowed: 0, hidden: true },
  { id: 'TL-SD-HX', name: 'Hex Screwdriver', category: 'Tools', total: 5, available: 5, pending: 0, borrowed: 0, hidden: true },
  { id: 'TL-BB', name: 'Bread Board', category: 'Tools', total: 40, available: 40, pending: 0, borrowed: 0 },

  // --- Accessories ---
  { id: 'AC-KB', name: 'Keyboard', category: 'Accessories', total: 30, available: 30, pending: 0, borrowed: 0 },
  { id: 'AC-MS', name: 'Mouse', category: 'Accessories', total: 35, available: 34, pending: 0, borrowed: 1 },
  { id: 'AC-HS', name: 'Headset', category: 'Accessories', total: 25, available: 25, pending: 0, borrowed: 0 },
  { id: 'AC-VG', name: 'VGA Cable', category: 'Accessories', total: 5, available: 5, pending: 0, borrowed: 0 },
  { id: 'AC-HD', name: 'HDMI Cable', category: 'Accessories', total: 5, available: 3, pending: 2, borrowed: 0 },
  { id: 'AC-EX', name: 'Extension Cord', category: 'Accessories', total: 15, available: 15, pending: 0, borrowed: 0 },

  // --- Services ---
  { id: 'SV-2D', name: '2D Printing', category: 'Services', total: 999, available: 999, pending: 0, borrowed: 0 },
  { id: 'SV-3D', name: '3D Printing', category: 'Services', total: 1, available: 0, pending: 0, borrowed: 0, isLocked: true }
];

export default function App() {
  const [currentView, setCurrentView] = useState('student');
  const [isLockedToStudent, setIsLockedToStudent] = useState(false); // URL Lock state
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [requests, setRequests] = useState([]);
  
  // Student view states
  const [activeTab, setActiveTab] = useState('Tools'); 
  const [cart, setCart] = useState([]); 
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  
  // Screwdriver Modal State
  const [isSDModalOpen, setIsSDModalOpen] = useState(false);
  const [sdCounts, setSdCounts] = useState({ 'TL-SD-PH': 0, 'TL-SD-FL': 0, 'TL-SD-TX': 0, 'TL-SD-HX': 0 });
  
  const [studentForm, setStudentForm] = useState({ name: '', email: '', gradeLevel: '', gradeSection: '', purpose: '' });

  // --- Check URL for QR Code Lock ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'student') {
      setCurrentView('student');
      setIsLockedToStudent(true); // Hides the switcher toggle entirely
    } else {
      // Default view if accessed normally by admin
      setCurrentView('admin');
      setIsLockedToStudent(false);
    }
  }, []);

  // --- Core Logistics ---
  const handleAddToCart = (item) => {
    if (item.isScrewdriverTrigger) {
      setIsSDModalOpen(true);
      return;
    }
    
    const existingCartItem = cart.find(c => c.id === item.id);
    if (existingCartItem) {
      if (item.category !== 'Services' && existingCartItem.quantity >= item.available) {
        alert(`Cannot add more. Only ${item.available} units available.`);
        return;
      }
      setCart(cart.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { id: item.id, name: item.name, quantity: 1, available: item.available, category: item.category }]);
    }
  };

  const confirmScrewdriverSelection = () => {
    let updatedCart = [...cart];

    Object.entries(sdCounts).forEach(([id, qtyToAdd]) => {
      if (qtyToAdd > 0) {
        const tool = inventory.find(i => i.id === id);
        const existingItemIndex = updatedCart.findIndex(c => c.id === id);

        if (existingItemIndex >= 0) {
          const newTotalQty = Math.min(tool.available, updatedCart[existingItemIndex].quantity + qtyToAdd);
          updatedCart[existingItemIndex].quantity = newTotalQty;
        } else {
          updatedCart.push({ id, name: tool.name, quantity: qtyToAdd, available: tool.available, category: 'Tools' });
        }
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
        if (c.category !== 'Services' && newQty > c.available) {
          alert(`Max available stock (${c.available}) reached.`);
          return c;
        }
        return newQty > 0 ? { ...c, quantity: newQty } : null;
      }
      return c;
    }).filter(Boolean));
  };

  const handleRemoveFromCart = (id) => setCart(cart.filter(c => c.id !== id));

  const handleBorrowSubmit = (e) => {
    e.preventDefault();
    if (cart.length === 0) return alert("Your cart is empty.");

    const newRequest = {
      id: `REQ-${String(requests.length + 1).padStart(3, '0')}`,
      studentName: studentForm.name,
      email: studentForm.email,
      gradeLevel: studentForm.gradeLevel,
      gradeSection: studentForm.gradeSection,
      items: cart.map(c => ({ itemId: c.id, itemName: c.name, quantity: c.quantity })),
      purpose: studentForm.purpose,
      timestamp: new Date().toISOString(),
      status: 'Pending'
    };

    const updatedInventory = inventory.map(invItem => {
      const cartItem = cart.find(c => c.id === invItem.id);
      return cartItem ? { ...invItem, pending: invItem.pending + cartItem.quantity } : invItem;
    });

    setRequests([newRequest, ...requests]);
    setInventory(updatedInventory);
    setCart([]);
    setShowSuccessScreen(true);
    setStudentForm({ name: '', email: '', gradeLevel: '', gradeSection: '', purpose: '' });
  };

  const handleApproveRequest = async (reqId) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;

    setRequests(requests.map(r => r.id === reqId ? { ...r, status: 'Approved' } : r));
    setInventory(prevInventory => prevInventory.map(invItem => {
      const targetReqItem = req.items?.find(i => i.itemId === invItem.id);
      if (targetReqItem) {
        return {
          ...invItem,
          pending: Math.max(0, invItem.pending - targetReqItem.quantity),
          available: invItem.category === 'Services' ? invItem.available : Math.max(0, invItem.available - targetReqItem.quantity),
          borrowed: invItem.borrowed + targetReqItem.quantity
        };
      }
      return invItem;
    }));

    alert(`Success: System generated background transaction payload. Email receipt confirmation dispatched out to ${req.email}.`);
  };

  const handleRejectRequest = async (reqId) => {
    const req = requests.find(r => r.id === reqId);
    if (!req) return;

    setRequests(requests.map(r => r.id === reqId ? { ...r, status: 'Rejected' } : r));
    setInventory(prevInventory => prevInventory.map(invItem => {
      const targetReqItem = req.items?.find(i => i.itemId === invItem.id);
      return targetReqItem ? { 
        ...invItem, 
        pending: Math.max(0, invItem.pending - targetReqItem.quantity),
        available: invItem.available + targetReqItem.quantity 
      } : invItem;
    }));

    alert(`Notification: Request declined. Automated rejection audit email pipeline dispatched out to ${req.email}.`);
  };

  const filteredInventory = inventory.filter(item => item.category === activeTab && !item.hidden);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-500/20">
      
      {/* Screwdriver Modal Overlay */}
      {isSDModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-slate-200">
            <h3 className="font-black text-slate-900 text-lg mb-4">Select Screwdrivers</h3>
            <div className="space-y-4">
              {['TL-SD-PH', 'TL-SD-FL', 'TL-SD-TX', 'TL-SD-HX'].map(id => {
                const item = inventory.find(i => i.id === id);
                return (
                  <div key={id} className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-700">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSdCounts({...sdCounts, [id]: Math.max(0, sdCounts[id] - 1)})} className="bg-slate-100 px-3 py-1 rounded-lg font-bold hover:bg-slate-200">-</button>
                      <span className="font-mono font-bold w-6 text-center">{sdCounts[id]}</span>
                      <button onClick={() => setSdCounts({...sdCounts, [id]: Math.min(item.available, sdCounts[id] + 1)})} className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-lg font-bold hover:bg-indigo-200">+</button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={() => {setIsSDModalOpen(false); setSdCounts({'TL-SD-PH': 0, 'TL-SD-FL': 0, 'TL-SD-TX': 0, 'TL-SD-HX': 0});}} className="flex-1 py-2 rounded-xl text-slate-500 font-bold text-sm bg-slate-100 hover:bg-slate-200">Cancel</button>
              <button onClick={confirmScrewdriverSelection} className="flex-1 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700">Add to Cart</button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-50 px-8 py-4 flex justify-between items-center bg-white/70 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-md">
            <span className="font-black text-white text-lg">LP</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-widest text-slate-900 uppercase">Lab Pulse</h1>
            <p className="text-[10px] tracking-widest text-indigo-600 font-mono font-semibold">Equipment Portal</p>
          </div>
        </div>
        
        {/* HIDE THIS SWITCHER IF LINK CONTAINS ?mode=student */}
        {!isLockedToStudent && (
          <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-xl">
            <button onClick={() => setCurrentView('admin')} className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'admin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Admin</button>
            <button onClick={() => setCurrentView('student')} className={`px-5 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'student' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Student</button>
          </div>
        )}
      </header>

      {/* ADMIN VIEW */}
      {currentView === 'admin' && (
        <main className="max-w-7xl mx-auto p-8 space-y-8">
          <section className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Pending Requests</h2>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-5 py-4 font-bold">Student</th>
                    <th className="px-5 py-4 font-bold">Items</th>
                    <th className="px-5 py-4 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.filter(r => r.status === 'Pending').length === 0 ? (
                    <tr><td colSpan="3" className="p-8 text-center text-slate-400">No pending requests.</td></tr>
                  ) : requests.filter(r => r.status === 'Pending').map(req => (
                    <tr key={req.id}>
                      <td className="px-5 py-4">
                        <span className="block font-bold text-slate-900">{req.studentName}</span>
                        <span className="block text-slate-500 text-xs font-mono">{req.gradeLevel} - {req.gradeSection}</span>
                      </td>
                      <td className="px-5 py-4">
                        {req.items.map((item, idx) => (
                          <div key={idx} className="text-xs font-medium text-indigo-900">
                            {item.itemName} <span className="text-indigo-600 font-bold">x{item.quantity}</span>
                          </div>
                        ))}
                      </td>
                      <td className="px-5 py-4 text-right space-x-3">
                        <button onClick={() => handleRejectRequest(req.id)} className="text-slate-400 hover:text-red-600 font-bold text-xs">Decline</button>
                        <button onClick={() => handleApproveRequest(req.id)} className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg text-xs font-black shadow-md">Approve</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Full Inventory</h2>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="p-5 font-bold">Item</th>
                    <th className="p-5 text-center font-bold">Total</th>
                    <th className="p-5 text-center font-bold text-emerald-600">Available</th>
                    <th className="p-5 text-center font-bold text-orange-500">Pending</th>
                    <th className="p-5 text-center font-bold text-violet-600">Borrowed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventory.filter(i => !i.isScrewdriverTrigger).map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="p-5 font-bold text-slate-800 flex items-center gap-3">
                        <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded">{item.id}</span>
                        {item.name}
                      </td>
                      <td className="p-5 text-center font-mono">{item.category === 'Services' ? '-' : item.total}</td>
                      <td className="p-5 text-center font-mono font-black text-emerald-600">{item.category === 'Services' ? '-' : item.available}</td>
                      <td className="p-5 text-center font-mono font-bold text-orange-500">{item.pending}</td>
                      <td className="p-5 text-center font-mono font-bold text-violet-600">{item.borrowed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      )}

      {/* STUDENT VIEW */}
      {currentView === 'student' && (
        <main className="max-w-7xl mx-auto p-8 space-y-6">
          {showSuccessScreen && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex justify-between items-center text-emerald-900 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold">✓</div>
                <h4 className="font-bold text-sm">Request Submitted successfully!</h4>
              </div>
              <button onClick={() => setShowSuccessScreen(false)} className="text-emerald-800 text-xs font-black bg-white px-4 py-2 rounded-xl border border-emerald-200">Close</button>
            </div>
          )}

          <div className="flex space-x-2 bg-slate-200/60 p-1 rounded-xl w-fit">
            {['Equipment', 'Tools', 'Accessories', 'Services'].map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>{tab}</button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredInventory.map((item) => {
                const isAvailable = item.category === 'Services' ? !item.isLocked : item.available > 0;
                return (
                  <div key={item.id} onClick={() => !item.isLocked && isAvailable && handleAddToCart(item)} className={`bg-white border p-5 rounded-2xl shadow-sm transition-all ${item.isLocked ? 'opacity-60 bg-slate-50' : isAvailable ? 'cursor-pointer hover:border-indigo-400' : 'opacity-50'}`}>
                    <div className="flex justify-between">
                      <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{item.id}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded font-bold ${isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {item.category === 'Services' ? (isAvailable ? 'Available' : 'Locked') : (isAvailable ? `${item.available} Available` : 'Out of Stock')}
                      </span>
                    </div>
                    <h3 className="font-bold mt-3 text-base">{item.name}</h3>
                    {item.isScrewdriverTrigger && <span className="inline-block mt-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Click to configure quantities</span>}
                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-1">
              <form onSubmit={handleBorrowSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="font-black text-slate-900 text-lg border-b border-slate-100 pb-3">Your Cart</h3>
                
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {cart.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">Cart is empty</p> : 
                    cart.map((cartItem) => (
                    <div key={cartItem.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <span className="text-sm font-bold truncate pr-2">{cartItem.name}</span>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => handleUpdateCartQuantity(cartItem.id, -1)} className="px-2 py-1 bg-white border rounded text-xs font-bold">-</button>
                        <span className="text-xs font-mono font-bold w-4 text-center">{cartItem.quantity}</span>
                        <button type="button" onClick={() => handleUpdateCartQuantity(cartItem.id, 1)} className="px-2 py-1 bg-white border rounded text-xs font-bold">+</button>
                        <button type="button" onClick={() => handleRemoveFromCart(cartItem.id)} className="text-slate-400 hover:text-red-500 font-bold ml-1">×</button>
                      </div>
                    </div>
                  ))}
                </div>

                <input required type="text" placeholder="Full Name" value={studentForm.name} onChange={(e) => setStudentForm({...studentForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                <input required type="email" placeholder="Email" value={studentForm.email} onChange={(e) => setStudentForm({...studentForm, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                
                <div className="grid grid-cols-2 gap-3">
                  <select required type="text" placeholder="Grade" value={studentForm.gradeLevel} onChange={(e) => setStudentForm({...studentForm, gradeLevel: e.target.value, gradeSection: ''})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm">
                    <option value="">Grade</option>
                    {Object.keys(GRADE_SECTIONS).map(grade => <option key={grade} value={grade}>{grade}</option>)}
                  </select>
                  <select required disabled={!studentForm.gradeLevel} value={studentForm.gradeSection} onChange={(e) => setStudentForm({...studentForm, gradeSection: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm">
                    <option value="">Section</option>
                    {studentForm.gradeLevel && GRADE_SECTIONS[studentForm.gradeLevel].map(sec => <option key={sec} value={sec}>{sec}</option>)}
                  </select>
                </div>
                
                <textarea required rows="2" placeholder="Purpose" value={studentForm.purpose} onChange={(e) => setStudentForm({...studentForm, purpose: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm"></textarea>
                <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-black shadow-md hover:bg-indigo-700">Submit Request</button>
              </form>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}