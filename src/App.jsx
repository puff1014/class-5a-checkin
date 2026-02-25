import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, orderBy, limit, serverTimestamp, getDocs, writeBatch, deleteField } from 'firebase/firestore';
import { Ship, ScrollText, ChevronLeft, ChevronRight, XCircle, Clock, UserCheck, Plus, Minus, Trash2, LayoutDashboard, Calendar, Trophy, XOctagon, CheckCircle2, Smile, Lock, Unlock, ArrowUp, ArrowDown, Printer, UserMinus, Type, GripVertical, Edit3, AlertTriangle, History, CalendarDays, Anchor } from 'lucide-react';

const APP_VERSION = "V21.5.260225_Absolute_Logic_Integrity";
const firebaseConfig = { apiKey: "AIzaSyArwz6gPeW9lNq_8LOfnKYwZmkRN-Wgtb8", authDomain: "class-5a-app.firebaseapp.com", projectId: "class-5a-app", storageBucket: "class-5a-app.firebasestorage.app", messagingSenderId: "828328241350", appId: "1:828328241350:web:5d39d529209f87a2540fc7" };
const STUDENTS = [{ id: '1', name: '陳昕佑' }, { id: '2', name: '徐偉綸' }, { id: '3', name: '蕭淵群' }, { id: '4', name: '吳秉晏' }, { id: '5', name: '呂秉蔚' }, { id: '6', name: '吳家昇' }, { id: '7', name: '翁芷儀' }, { id: '8', name: '鄭筱妍' }, { id: '9', name: '周筱涵' }, { id: '10', name: '李婕妤' }];
const SPECIAL_IDS = ['5', '7', '8'];
const QUICK_TAGS = ["預習數課", "數習", "數八", "背成+小+寫", "國甲", "國乙", "國丙", "國習", "國隨", "閱讀A", "閱讀B", "國預習單", "朗讀", "解釋單", "國練卷", "符號本", "帶學用品", "訂正功課"];

const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const maskName = (n) => n ? n[0] + "O" + (n[2] || "") : "";

const App = () => {
 const [db, setDb] = useState(null);
 const [auth, setAuth] = useState(null);
 const [user, setUser] = useState(null);
 const [viewDate, setViewDate] = useState(new Date());
 const [currentTime, setCurrentTime] = useState(new Date());
 const [isEditing, setIsEditing] = useState(false);
 const [displayItems, setDisplayItems] = useState([]);
 const [announcementText, setAnnouncementText] = useState("");
 const [attendance, setAttendance] = useState({});
 const [activeStudent, setActiveStudent] = useState(null);
 const [viewOnlyStudent, setViewOnlyStudent] = useState(null);
 const [prevTasks, setPrevTasks] = useState([]);
 const [selectedTasks, setSelectedTasks] = useState({});
 const [fontSize, setFontSize] = useState(48);
 const [lineHeight, setLineHeight] = useState(1.1);
 const [useBiauKai, setUseBiauKai] = useState(false);
 const [recordedDates, setRecordedDates] = useState([]);
 const [activeStatMonth, setActiveStatMonth] = useState(`${new Date().getMonth() + 1}月`);
 const [monthlyStats, setMonthlyStats] = useState({});
 const [w1, setW1] = useState(25);
 const [w2, setW2] = useState(25);
 const [refreshCounter, setRefreshCounter] = useState(0);
 const [showCalendarPicker, setShowCalendarPicker] = useState(false);
 const [pickerDate, setPickerDate] = useState(new Date());

 const highlighterColors = ['transparent', '#C0392B', '#16A085', '#2980B9', '#8E44AD'];

 // 修正變色連動邏輯
 const cycleHighlighter = async (index) => {
   if (!user) return;
   const dateKey = formatDate(viewDate);
   const newItems = [...displayItems];
   const item = newItems[index];
   const text = typeof item === 'string' ? item : item.text;
   const colorIdx = typeof item === 'string' ? 0 : (item.colorIdx || 0);
   const nextIdx = (colorIdx + 1) % highlighterColors.length;
   newItems[index] = { text, colorIdx: nextIdx };
   await setDoc(doc(db, "announcements", dateKey), { items: newItems }, { merge: true });
 };

 useEffect(() => {
   const app = initializeApp(firebaseConfig);
   setDb(getFirestore(app));
   setAuth(getAuth(app));
   onAuthStateChanged(getAuth(app), (u) => setUser(u));
   const timer = setInterval(() => setCurrentTime(new Date()), 1000);
   return () => clearInterval(timer);
 }, []);

 useEffect(() => {
   if (!db) return;
   onSnapshot(collection(db, "announcements"), (snap) => setRecordedDates(snap.docs.map(d => d.id).sort()));
 }, [db]);

 useEffect(() => {
   if (!db) return;
   const dateKey = formatDate(viewDate);
   onSnapshot(doc(db, "announcements", dateKey), (snap) => {
     const items = snap.exists() ? snap.data().items || [] : [];
     setDisplayItems(items);
     if (!isEditing) setAnnouncementText(items.map(i => typeof i === 'string' ? i : i.text).join('\n'));
   });
   onSnapshot(collection(db, `attendance_${dateKey}`), (snap) => {
     const data = {};
     snap.forEach(d => data[d.id] = d.data());
     setAttendance(data);
   });
   const fetchPrev = async () => {
     const q = query(collection(db, "announcements"), where("date", "<", dateKey), orderBy("date", "desc"), limit(1));
     const snap = await getDocs(q);
     setPrevTasks(!snap.empty ? snap.docs[0].data().items : []);
   };
   fetchPrev();
 }, [db, viewDate, isEditing]);

 const getAutoAttStatus = (id, time) => {
   if (!time) return 'absent';
   const [h, m, s] = time.split(':').map(Number);
   const totalS = h * 3600 + m * 60 + (s || 0);
   if (SPECIAL_IDS.includes(id)) return totalS >= 8 * 3600 + 10 * 60 + 30 ? 'late' : 'on-time';
   return totalS >= 7 * 3600 + 40 * 60 + 1 ? 'late' : 'on-time';
 };

 const getFinalAttStatus = (id, attData) => {
   if (!attData) return 'absent';
   if (attData.manualAtt) return attData.manualAtt; 
   if (attData.status === 'sick') return 'sick';
   if (attData.status === 'personal') return 'personal';
   return getAutoAttStatus(id, attData.checkinTime);
 };

 const isAutoTaskLate = (id, actionTime) => {
   if (!actionTime) return false;
   const [h, m, s] = actionTime.split(':').map(Number);
   const totalS = h * 3600 + m * 60 + (s || 0);
   if (SPECIAL_IDS.includes(id)) return totalS > 8 * 3600 + 15 * 60;
   return totalS >= 7 * 3600 + 40 * 60 + 1;
 };

 const getFinalTaskStatus = (id, originalTaskName, attData) => {
   const cleanName = typeof originalTaskName === 'string' ? originalTaskName.trim() : originalTaskName.text.trim();
   if (attData?.manualTasks?.[cleanName]) return attData.manualTasks[cleanName];
   const hw = attData?.completedTasks || {};
   if (!hw[cleanName]) return 'missing';
   if (isAutoTaskLate(id, attData.lastActionTime)) return 'late';
   return 'done';
 };

 useEffect(() => {
   if (!db || recordedDates.length === 0) return;
   let isMounted = true;
   const fetchMonth = async () => {
     const monthStr = activeStatMonth.replace('月', '').padStart(2, '0');
     const targetDates = recordedDates.filter(d => d.split('-')[1] === monthStr);
     const stats = {};
     STUDENTS.forEach(s => stats[s.id] = { onTime: 0, late: 0, sick: 0, personal: 0, fullDoneDays: 0, lateDays: 0, missingDays: 0, issues: [], dailyRecords: {} });
     for (const dKey of targetDates) {
       const attSnap = await getDocs(collection(db, `attendance_${dKey}`));
       const attMap = {}; attSnap.forEach(doc => { attMap[doc.id] = doc.data(); });
       const annSnap = await getDocs(query(collection(db, "announcements"), where("date", "<", dKey), orderBy("date", "desc"), limit(1)));
       const dailyTasks = !annSnap.empty ? annSnap.docs[0].data().items : [];
       STUDENTS.forEach(student => {
         const sid = student.id; const d = attMap[sid];
         if (!d) {
           stats[sid].dailyRecords[dKey] = { att: 'absent', missingList: dailyTasks.map(t=> typeof t === 'string' ? t.trim() : t.text.trim()), allDone: false };
           if (dailyTasks.length > 0) stats[sid].missingDays++;
           return;
         }
         const finalAtt = getFinalAttStatus(sid, d);
         if (finalAtt === 'on-time') stats[sid].onTime++; else if (finalAtt === 'late') stats[sid].late++; else if (finalAtt === 'sick') stats[sid].sick++; else if (finalAtt === 'personal') stats[sid].personal++;
         const missing = []; const late = [];
         dailyTasks.forEach(t => {
           const stat = getFinalTaskStatus(sid, t, d);
           const tName = typeof t === 'string' ? t.trim() : t.text.trim();
           if (stat === 'missing') missing.push(tName); else if (stat === 'late') late.push(tName);
         });
         stats[sid].dailyRecords[dKey] = { att: finalAtt, missingList: missing, lateList: late, allDone: missing.length === 0 && late.length === 0 };
         if (missing.length > 0) stats[sid].missingDays++; else if (late.length > 0) stats[sid].lateDays++; else stats[sid].fullDoneDays++;
       });
     }
     if (isMounted) setMonthlyStats(stats);
   };
   fetchMonth(); return () => { isMounted = false; };
 }, [db, activeStatMonth, recordedDates, refreshCounter]);

 const cycleManualAtt = async (studentId) => {
   if (!user) return;
   const dateKey = formatDate(viewDate);
   const d = attendance[studentId] || {};
   const cycle = ['auto', 'on-time', 'late', 'sick', 'personal'];
   const next = cycle[(cycle.indexOf(d.manualAtt || 'auto') + 1) % cycle.length];
   await setDoc(doc(db, `attendance_${dateKey}`, studentId), { manualAtt: next === 'auto' ? deleteField() : next }, { merge: true });
   setRefreshCounter(p => p + 1);
 };

 const cycleManualTask = async (studentId, taskName) => {
   if (!user) return;
   const dateKey = formatDate(viewDate);
   const cleanT = typeof taskName === 'string' ? taskName.trim() : taskName.text.trim();
   const d = attendance[studentId] || {};
   const cycle = ['auto', 'done', 'late', 'missing', 'exempt'];
   const current = d.manualTasks?.[cleanT] || 'auto';
   const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
   await setDoc(doc(db, `attendance_${dateKey}`, studentId), { manualTasks: { ...d.manualTasks, [cleanT]: next === 'auto' ? null : next } }, { merge: true });
   setRefreshCounter(p => p + 1);
 };

 const submitCheckin = async (status = 'present') => {
   const dateKey = formatDate(viewDate);
   const nowTime = new Date().toLocaleTimeString('zh-TW', { hour12: false });
   await setDoc(doc(db, `attendance_${dateKey}`, activeStudent.id), {
     name: activeStudent.name, status, completedTasks: selectedTasks, checkinTime: attendance[activeStudent.id]?.checkinTime || nowTime, lastActionTime: nowTime, timestamp: serverTimestamp()
   }, { merge: true });
   setActiveStudent(null); setRefreshCounter(p => p + 1);
 };

 const handleDeleteDate = async (dateStr) => {
   if (!user) return;
   if (window.confirm(`確定要刪除 ${dateStr} 的紀錄與標籤嗎？`)) {
     const batch = writeBatch(db);
     batch.delete(doc(db, "announcements", dateStr));
     (await getDocs(collection(db, `attendance_${dateStr}`))).forEach(d => batch.delete(d.ref));
     await batch.commit();
     if (dateStr === formatDate(viewDate)) { setDisplayItems([]); setAttendance({}); }
   }
 };

 const isPublished = recordedDates.includes(formatDate(viewDate));

 return (
   <div className="min-h-screen bg-[#F0F9FF] flex flex-col font-sans select-none overflow-x-hidden">
     <header className="bg-white border-b-2 border-sky-100 shadow-sm sticky top-0 z-[100] print:hidden">
       <div className="px-8 py-4 flex items-center justify-between border-b border-sky-50">
         <div className="flex items-center gap-6">
           <Ship className="w-16 h-16 text-sky-600 animate-pulse" />
           <div className="flex flex-col">
             <div className="flex items-baseline gap-4">
               <h1 className="text-6xl font-black text-sky-900 leading-none">五甲航海日誌</h1>
               <span className="text-lg font-bold text-slate-300">Ver {APP_VERSION}</span>
               <button onClick={() => user ? signOut(auth) : signInWithEmailAndPassword(auth, prompt("Email"), prompt("密碼"))} className={`ml-4 px-4 py-2 rounded-xl text-xl font-bold flex items-center gap-2 ${user ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                 {user ? <Unlock size={24}/> : <Lock size={24}/>} {user ? '教師模式' : '學生模式'}
               </button>
             </div>
             <p className="text-2xl font-normal text-sky-600/80 mt-2 tracking-[1.25em] font-serif italic whitespace-nowrap">學海無涯勤是岸</p>
           </div>
         </div>
         <div className="flex items-center gap-10">
           <span className="text-4xl font-bold text-slate-500">{currentTime.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })}</span>
           <span className="text-8xl font-mono font-black text-blue-700 drop-shadow-md">{currentTime.toLocaleTimeString('zh-TW', { hour12: false })}</span>
         </div>
       </div>

       <div className="px-8 py-3 flex items-center justify-between bg-sky-50/40">
         <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 bg-sky-100/50 px-4 py-1.5 rounded-2xl border border-sky-200 shadow-inner">
             <span className="font-bold text-sky-800 text-2xl">航行月：</span>
             <select value={activeStatMonth} onChange={(e) => setActiveStatMonth(e.target.value)} className="bg-white border-2 border-sky-300 text-sky-700 rounded-xl px-2 py-1 font-black text-xl outline-none cursor-pointer hover:bg-sky-50 transition-colors">
               {["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"].map(m => <option key={m} value={m}>{m}</option>)}
             </select>
           </div>
           <div className="w-px h-8 bg-sky-200 mx-1"></div>
           <div className="flex items-center gap-2 overflow-x-auto max-w-[40vw] scrollbar-hide py-1">
             {recordedDates.filter(d => parseInt(d.split('-')[1]) === parseInt(activeStatMonth)).map(d => (
               <button key={d} onClick={() => setViewDate(new Date(d))} className={`px-6 py-2 rounded-2xl text-2xl font-black transition-all shrink-0 ${formatDate(viewDate) === d ? 'bg-sky-600 text-white shadow-lg scale-105' : 'bg-white text-sky-400 border border-sky-100 hover:bg-sky-50'}`}>{d.split('-')[2]}</button>
             ))}
           </div>
         </div>
         {user && (
           <div className="flex items-center gap-3">
             <button onClick={() => handleDeleteDate(formatDate(viewDate))} className="p-3 bg-rose-100 text-rose-600 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><Trash2 size={32}/></button>
             <div className="flex bg-white p-1.5 rounded-2xl items-center shadow-inner border border-sky-100">
               <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)))} className="p-2 hover:bg-sky-50 rounded-xl transition-all"><ChevronLeft size={36}/></button>
               <span className="text-3xl font-black px-6 text-sky-800">{formatDate(viewDate)}</span>
               <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)))} className="p-2 hover:bg-sky-50 rounded-xl transition-all"><ChevronRight size={36}/></button>
             </div>
             <button onClick={() => setDoc(doc(db, "announcements", formatDate(viewDate)), { date: formatDate(viewDate), items: displayItems }, {merge:true})} className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"><Plus size={32}/></button>
             <button onClick={() => { setPickerDate(new Date(viewDate)); setShowCalendarPicker(!showCalendarPicker); }} className={`p-3 rounded-2xl transition-all shadow-sm ${showCalendarPicker ? 'bg-sky-600 text-white' : 'bg-sky-100 text-sky-600 hover:bg-sky-200'}`}><CalendarDays size={32}/></button>
           </div>
         )}
       </div>

       {showCalendarPicker && (
         <div className="absolute right-8 top-full mt-2 bg-white border-4 border-sky-200 rounded-[2rem] shadow-2xl z-[200] p-6 w-80 animate-in fade-in slide-in-from-top-4">
           <div className="flex justify-between items-center mb-6">
             <button onClick={() => setPickerDate(new Date(pickerDate.setMonth(pickerDate.getMonth() - 1)))} className="p-1 hover:bg-sky-50 rounded-lg text-sky-600"><ChevronLeft size={28}/></button>
             <h4 className="text-2xl font-black text-sky-800">{pickerDate.getFullYear()}年 {pickerDate.getMonth() + 1}月</h4>
             <button onClick={() => setPickerDate(new Date(pickerDate.setMonth(pickerDate.getMonth() + 1)))} className="p-1 hover:bg-sky-50 rounded-lg text-sky-600"><ChevronRight size={28}/></button>
           </div>
           <div className="grid grid-cols-7 gap-2">
             {['日','一','二','三','四','五','六'].map(w => <div key={w} className="text-center font-bold text-slate-400 py-1">{w}</div>)}
             {(() => {
               const year = pickerDate.getFullYear(); const month = pickerDate.getMonth();
               const firstDay = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
               const days = []; for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} />);
               for (let d = 1; d <= daysInMonth; d++) {
                 const dKey = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                 const hasData = recordedDates.includes(dKey);
                 days.push(<button key={d} onClick={() => { setViewDate(new Date(dKey)); setShowCalendarPicker(false); }} className={`aspect-square rounded-xl text-lg font-bold flex flex-col items-center justify-center transition-all ${formatDate(viewDate) === dKey ? 'bg-sky-600 text-white' : hasData ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'text-slate-300 hover:bg-slate-50'}`}>{d}{hasData && <Anchor size={10} className={formatDate(viewDate) === dKey ? 'text-white' : 'text-sky-400'}/></button>);
               } return days;
             })()}
           </div>
         </div>
       )}
     </header>

     <main className="flex flex-col lg:flex-row p-4 gap-2 print:hidden items-stretch pb-12">
       <div style={{ width: `${w1}%` }} className="bg-white rounded-[3rem] shadow-sm p-5 flex flex-col border border-sky-50 shrink-0">
         <h2 className="text-3xl font-black mb-6 text-sky-800 flex items-center gap-3 px-2 shrink-0"><UserCheck size={40}/> 航海員簽到</h2>
         <div className="grid grid-cols-2 gap-4 flex-1">
           {STUDENTS.map(s => {
             const d = attendance[s.id]; const attStat = getFinalAttStatus(s.id, d);
             let color = attStat === 'on-time' ? 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm' : attStat === 'late' ? 'bg-pink-50 text-pink-600 border-pink-200 shadow-sm' : 'bg-slate-50 text-slate-300 border-slate-100';
             if (attStat === 'sick' || attStat === 'personal') color = 'bg-purple-50 text-purple-600 border-purple-100';
             return <button key={s.id} onClick={() => { setSelectedTasks(d?.completedTasks || {}); setActiveStudent(s); }} className={`min-h-[96px] rounded-[1.8rem] flex flex-col items-center justify-center transition-all border-b-8 active:border-b-0 ${color}`}><span className="text-5xl font-black">{maskName(s.name)}</span></button>;
           })}
         </div>
       </div>

       <div className="w-4 mx-1 cursor-col-resize flex items-center justify-center hover:bg-sky-200 rounded-full transition-colors group shrink-0" onMouseDown={(e) => { const startX = e.clientX; const startW = w1; const move = (ev) => setW1(Math.max(15, Math.min(startW + ((ev.clientX - startX) / window.innerWidth) * 100, 40))); const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); }}><GripVertical className="text-sky-300 group-hover:text-sky-600"/></div>

       <div style={{ width: `${w2}%` }} className="bg-white rounded-[3rem] shadow-sm p-5 flex flex-col border border-sky-50 shrink-0">
         <h2 className="text-3xl font-black mb-6 text-sky-800 flex items-center gap-3 px-2 shrink-0"><LayoutDashboard size={40}/> 今日任務進度</h2>
         <div className="flex flex-col gap-4 flex-1 justify-between">
           {STUDENTS.map(s => {
             const d = attendance[s.id]; const total = prevTasks.length;
             const comp = prevTasks.filter(t => getFinalTaskStatus(s.id, t, d) === 'done').length;
             const progress = total > 0 ? (comp / total) * 100 : 0;
             const barColor = comp === total && total > 0 ? 'bg-[#E6BE8A]' : 'bg-[#0077BE]';
             return (
               <div key={s.id} onClick={() => setViewOnlyStudent({ student: s, tasks: d?.completedTasks || {} })} className={`min-h-[48px] flex items-center px-4 rounded-[1.2rem] border transition-all cursor-pointer ${comp === total && total > 0 ? 'bg-orange-50/30' : 'bg-slate-50'}`}>
                 <span className="text-3xl font-black text-sky-900 w-28 truncate">{maskName(s.name)}</span>
                 <div className="flex-1 h-7 bg-slate-200 rounded-full mx-4 relative overflow-hidden border border-slate-100 shadow-inner">
                   <div className={`h-full transition-all duration-1000 ${barColor}`} style={{ width: `${progress}%` }}>
                     {progress > 0 && <Ship size={16} className="absolute right-1 top-1/2 -translate-y-1/2 text-white drop-shadow-md" />}
                   </div>
                 </div>
                 <span className="text-3xl font-black w-20 text-right">{comp}/{total}</span>
               </div>
             );
           })}
         </div>
       </div>

       <div className="w-4 mx-1 cursor-col-resize flex items-center justify-center hover:bg-sky-200 rounded-full transition-colors group shrink-0" onMouseDown={(e) => { const startX = e.clientX; const startW = w2; const move = (ev) => setW2(Math.max(15, Math.min(startW + ((ev.clientX - startX) / window.innerWidth) * 100, 40))); const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); }}><GripVertical className="text-sky-300 group-hover:text-sky-600"/></div>

       <div className="flex-1 bg-[#0C4A6E] rounded-[3rem] shadow-xl p-8 text-white flex flex-col shrink-0 min-w-0 relative overflow-hidden">
         <Anchor size={200} className="absolute -bottom-10 -right-10 text-white/5 rotate-12 pointer-events-none" />
         <div className="flex justify-between items-center mb-6 border-b border-white/20 pb-4 shrink-0 relative z-10">
           <h2 className="text-4xl font-black flex items-center gap-4 text-sky-200 drop-shadow-md"><ScrollText size={48}/> 任務發布區</h2>
           <div className="flex items-center gap-4">
             {/* 補回控制鈕 */}
             <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl shadow-inner border border-white/10">
               <button onClick={() => setUseBiauKai(!useBiauKai)} className={`p-2 rounded-xl transition-all ${useBiauKai ? 'bg-sky-500 text-white shadow-lg' : 'hover:bg-white/20 text-sky-200'}`} title="切換標楷體"><Type size={24}/></button>
               <div className="w-px h-6 bg-white/20 mx-1" /><button onClick={() => setFontSize(f => Math.max(20, f-4))} className="p-2 hover:bg-white/20 rounded-xl transition-all text-sky-100"><Minus/></button><button onClick={() => setFontSize(f => Math.min(100, f+4))} className="p-2 hover:bg-white/20 rounded-xl transition-all text-sky-100"><Plus/></button>
               <div className="w-px h-6 bg-white/20 mx-1" /><button onClick={() => setLineHeight(l => Math.max(0.7, l-0.1))} className="p-2 hover:bg-white/20 rounded-xl transition-all text-sky-100"><ArrowDown size={24}/></button><button onClick={() => setLineHeight(l => Math.min(3.0, l+0.1))} className="p-2 hover:bg-white/20 rounded-xl transition-all text-sky-100"><ArrowUp size={24}/></button>
             </div>
             {user && <button onClick={() => isEditing ? (setIsEditing(false), setDoc(doc(db, "announcements", formatDate(viewDate)), { items: announcementText.split('\n').filter(Boolean).map(t=> ({ text: t.trim(), colorIdx: 0 })), date: formatDate(viewDate) }, {merge:true})) : setIsEditing(true)} className="bg-emerald-500 hover:bg-emerald-400 px-8 py-3 rounded-2xl font-black text-2xl shadow-lg transition-transform active:scale-95 text-white">{isEditing ? '儲存任務' : '編輯任務'}</button>}
           </div>
         </div>
         {isEditing && (
           <div className="flex flex-wrap gap-2 mb-4 animate-fade-in pr-2 shrink-0 relative z-10">
             {/* 補回 QUICK_TAGS */}
             {QUICK_TAGS.map(t => <button key={t} onClick={() => setAnnouncementText(p => p ? p + '\n' + t : t)} className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-xl font-bold hover:bg-white/30 transition-all">{t}</button>)}
           </div>
         )}
         <div className="flex-1 bg-black/20 rounded-[2.5rem] p-8 shadow-inner relative z-10 backdrop-blur-sm border border-white/5 overflow-y-auto">
           {isEditing ? (
             <textarea value={announcementText} onChange={e => setAnnouncementText(e.target.value)} style={{ fontFamily: useBiauKai ? '"BiauKai", "DFKai-SB", "標楷體", serif' : 'inherit' }} className="flex-1 bg-transparent text-white outline-none leading-relaxed text-4xl w-full min-h-[400px] font-black" placeholder="輸入今日任務..." />
           ) : (
             <div style={{ fontSize: `${fontSize}px`, lineHeight: lineHeight, fontFamily: useBiauKai ? '"BiauKai", "DFKai-SB", "標楷體", serif' : 'inherit' }} className="font-black">
               {displayItems.map((item, i) => {
                 const text = typeof item === 'string' ? item : item.text;
                 const cIdx = typeof item === 'string' ? 0 : (item.colorIdx || 0);
                 return (
                   <div key={i} className="flex items-start gap-8 mb-4 last:mb-0 transition-all">
                     <span className="flex-shrink-0 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-900 text-2xl shadow-lg border-4 border-yellow-200 font-black">{i+1}</span>
                     <span onClick={() => cycleHighlighter(i)} className="cursor-pointer px-2 rounded-md transition-all duration-300" style={{ backgroundColor: highlighterColors[cIdx], color: '#FFFFFF', textShadow: cIdx > 0 ? '1px 1px 3px rgba(0,0,0,0.8)' : 'none' }}>{text}</span>
                   </div>
                 );
               })}
             </div>
           )}
         </div>
       </div>
     </main>

     <section className="mx-4 mb-12 bg-white rounded-[3rem] p-8 shadow-2xl border-4 border-sky-100 flex flex-col print:hidden">
       <div className="flex justify-between items-center mb-6 px-2">
         <h3 className="text-4xl font-black text-sky-900 flex items-center gap-5"><Calendar size={48} className="text-sky-600"/> {activeStatMonth} 分析報表</h3>
         <div className="flex gap-4 items-center">
           {user && <button onClick={() => window.print()} className="bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-black text-xl hover:bg-indigo-700 shadow-xl transition-all active:scale-95"><Printer size={24}/> 列印報表</button>}
         </div>
       </div>
       <div className="overflow-auto rounded-[2rem] border-2 border-sky-50">
         <table className="w-full text-center table-fixed border-collapse">
           <thead className="text-white shadow-md">
             <tr className="text-2xl font-black"><th className="p-5 bg-sky-950 border-r border-sky-800 sticky left-0 z-50 w-48 text-left pl-10">姓名</th><th className="p-5 bg-sky-700 border-r border-sky-600 w-[35%]">出席狀況</th><th className="p-5 bg-blue-600">任務繳交 (天數)</th></tr>
           </thead>
           <tbody className="divide-y divide-sky-100">
             {STUDENTS.map(s => {
               const sData = monthlyStats[s.id];
               return (
                 <tr key={s.id} className="hover:bg-sky-50/50 transition-colors cursor-pointer group" onClick={() => sData && setViewOnlyStudent({ student: s, isHistory: true })}>
                   <td className="p-5 text-3xl font-black text-sky-900 border-r-2 border-sky-50 sticky left-0 z-10 bg-white text-left pl-10 group-hover:text-sky-600 group-hover:bg-sky-50/50 transition-all">{maskName(s.name)}</td>
                   <td className="p-5 border-r-2 border-sky-50"><div className="flex justify-center items-center gap-6 text-2xl font-black"><div className="flex items-center gap-2 text-emerald-600"><CheckCircle2 size={28}/> 準時: {sData ? sData.onTime : '--'}</div><div className="flex items-center gap-2 text-pink-500"><Clock size={28}/> 遲到: {sData ? sData.late : '--'}</div><div className="flex items-center gap-2 text-slate-400"><UserMinus size={28}/> 未到: {sData ? (sData.sick + sData.personal) : '--'}</div></div></td>
                   <td className="p-5"><div className="flex justify-center items-center gap-10 text-2xl font-black"><div className="flex items-center gap-2 text-blue-600"><Trophy size={32} className="text-blue-500"/> 齊全: {sData ? sData.fullDoneDays : '--'}</div><div className="flex items-center gap-2 text-rose-500"><AlertTriangle size={32}/> 缺交: {sData ? sData.missingDays : '--'}</div></div></td>
                 </tr>
               );
             })}
           </tbody>
         </table>
       </div>
     </section>

     {(activeStudent || viewOnlyStudent) && (() => {
       const targetId = activeStudent ? activeStudent.id : viewOnlyStudent.student.id;
       const liveMonthData = monthlyStats[targetId];
       return (
         <div className="fixed inset-0 bg-sky-900/95 backdrop-blur-xl z-[300] flex items-center justify-center p-8 print:hidden">
           <div className="bg-white rounded-[4rem] w-full max-w-[90vw] p-10 shadow-2xl relative flex flex-col max-h-[90vh] border-[12px] border-sky-100/50">
             <div className="flex justify-between items-center mb-6 border-b-4 border-sky-50 pb-6 shrink-0"><h3 className="text-6xl font-black text-sky-900 leading-none flex items-center gap-6">{maskName(activeStudent?.name || viewOnlyStudent?.student.name)} <span className="text-2xl text-sky-500 font-bold tracking-widest bg-sky-50 px-4 py-2 rounded-full border border-sky-100">{viewOnlyStudent?.isHistory ? `${activeStatMonth} 學習歷程` : `任務確認 - ${formatDate(viewDate)}`}</span></h3><button onClick={() => { setActiveStudent(null); setViewOnlyStudent(null); }} className="text-slate-300 hover:text-red-500 transition-all transform hover:rotate-90 bg-slate-50 rounded-full p-2"><XCircle size={64}/></button></div>
             <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
               {viewOnlyStudent?.isHistory ? (
                 <div className="space-y-3">{liveMonthData && Object.entries(liveMonthData.dailyRecords).sort((a,b)=>b[0].localeCompare(a[0])).map(([date, rec]) => (<div key={date} className="p-4 bg-slate-50 rounded-3xl border-2 border-slate-100 flex flex-col gap-3 shadow-sm"><div className="flex items-center justify-between border-b-2 border-slate-200 pb-2"><span className="text-4xl font-black text-sky-800">{date}</span>{getStatusDisplay(rec.att, 'att')}</div><div className="flex gap-2 flex-wrap pt-1">{rec.allDone ? <span className="text-blue-600 font-black text-2xl">任務齊全</span> : <>{rec.missingList.map(m => <span key={m} className="bg-rose-50 text-rose-700 px-3 py-1 rounded-xl text-xl font-bold border border-rose-200">{m}</span>)}</>}</div></div>))}</div>
               ) : viewOnlyStudent && user ? (
                 <div className="flex flex-col gap-6">
                   <div className="bg-slate-50 rounded-[2rem] p-6 border-2 border-slate-200 flex items-center gap-6"><span className="text-4xl font-black text-slate-700">出席狀態：</span><button onClick={() => cycleManualAtt(targetId)} className="text-4xl font-bold text-sky-600 bg-sky-100 px-6 py-2 rounded-2xl shadow-sm">{getStatusDisplay(getFinalAttStatus(targetId, attendance[targetId]), 'att')}</button></div>
                   <div className="grid grid-cols-3 gap-4">
                     {prevTasks.map((t, idx) => {
                       const cleanT = typeof t === 'string' ? t.trim() : t.text.trim();
                       const stat = getFinalTaskStatus(targetId, cleanT, attendance[targetId]);
                       return (<div key={idx} className="bg-white border-4 border-slate-100 rounded-[2rem] p-6 flex justify-between items-center shadow-sm hover:border-sky-200 transition-colors"><span className="text-4xl font-black text-slate-800 truncate pr-4">{cleanT}</span><button onClick={() => cycleManualTask(targetId, cleanT)} className="text-2xl font-bold bg-slate-100 px-4 py-2 rounded-xl active:scale-95 transition-all">{getStatusDisplay(stat, 'task')}</button></div>);
                     })}
                   </div>
                 </div>
               ) : (
                 <div className="grid grid-cols-3 gap-6">{activeStudent ? prevTasks.map((t, idx) => {
                   const cleanT = typeof t === 'string' ? t.trim() : t.text.trim();
                   const isSelected = !!selectedTasks[cleanT];
                   return (<label key={idx} className={`p-6 rounded-[2rem] border-4 flex items-center gap-6 transition-all active:scale-95 cursor-pointer shadow-sm ${isSelected ? 'bg-blue-50 border-blue-500 shadow-inner' : 'bg-white border-slate-300'}`}><input type="checkbox" checked={isSelected} onChange={(e) => setSelectedTasks({...selectedTasks, [cleanT]: e.target.checked})} className="w-10 h-10 accent-blue-600" /><span className="text-4xl font-black">{cleanT}</span></label>);
                 }) : null}</div>
               )}
             </div>
             {activeStudent && (<div className="grid grid-cols-3 gap-6 shrink-0 h-28 mt-8 border-t-4 border-slate-50 pt-8"><button onClick={() => submitCheckin('present')} className="bg-sky-500 text-white rounded-[2rem] text-4xl font-black shadow-xl hover:bg-sky-600 active:scale-95">確認打卡</button><button onClick={() => submitCheckin('sick')} className="bg-purple-400 text-white rounded-[2rem] text-4xl font-black hover:bg-purple-500 transition-all shadow-md active:scale-95">病假</button><button onClick={() => submitCheckin('personal')} className="bg-orange-400 text-white rounded-[2rem] text-4xl font-black hover:bg-orange-500 transition-all shadow-md active:scale-95">事假</button></div>)}
           </div>
         </div>
       );
     })()}
   </div>
 );
};

export default App;
