import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, orderBy, limit, serverTimestamp, getDocs, writeBatch, deleteField } from 'firebase/firestore';
import { Ship, ScrollText, ChevronLeft, ChevronRight, XCircle, Clock, UserCheck, Plus, Minus, Trash2, LayoutDashboard, Calendar, Trophy, XOctagon, CheckCircle2, Smile, Lock, Unlock, ArrowUp, ArrowDown, Printer, UserMinus, Type, GripVertical, Edit3, AlertTriangle, History, CalendarDays, Anchor, Palette } from 'lucide-react';

const APP_VERSION = "V20.0.260223_Golden_Voyage";
const firebaseConfig = { apiKey: "AIzaSyArwz6gPeW9lNq_8LOfnKYwZmkRN-Wgtb8", authDomain: "class-5a-app.firebaseapp.com", projectId: "class-5a-app", storageBucket: "class-5a-app.firebasestorage.app", messagingSenderId: "828328241350", appId: "1:828328241350:web:5d39d529209f87a2540fc7" };
const STUDENTS = [{ id: '1', name: '陳昕佑' }, { id: '2', name: '徐偉綸' }, { id: '3', name: '蕭淵群' }, { id: '4', name: '吳秉晏' }, { id: '5', name: '呂秉蔚' }, { id: '6', name: '吳家昇' }, { id: '7', name: '翁芷儀' }, { id: '8', name: '鄭筱妍' }, { id: '9', name: '周筱涵' }, { id: '10', name: '李婕妤' }];
const SPECIAL_IDS = ['5', '7', '8'];
const QUICK_TAGS = ["預習數課", "數習", "數八", "背成+小+寫", "國甲", "國乙", "國丙", "閱讀A", "閱讀B", "國預習單", "朗讀", "解釋單", "國練卷", "符號本", "帶學用品", "訂正功課"];

// 新增色彩庫 (粉色與紫色已加入)
const COLOR_PALETTE = [
  { name: '白色', value: '#FFFFFF' },
  { name: '紅色', value: '#FF6B6B' },
  { name: '橙色', value: '#FF922B' },
  { name: '黃色', value: '#FCC419' },
  { name: '綠色', value: '#51CF66' },
  { name: '藍色', value: '#339AF0' },
  { name: '粉色', value: '#FF87BF' },
  { name: '紫色', value: '#BE4BDB' }
];

const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const maskName = (n) => n ? n[0] + "O" + (n[2] || "") : "";

const App = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [user, setUser] = useState(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [displayItems, setDisplayItems] = useState([]); // Array of {text, color}
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
  
  // 功能 3：月曆快選系統 (支援跨月)
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date());

  // 功能 4：色彩編輯狀態
  const [selectedLineIndex, setSelectedLineIndex] = useState(null);

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
      // 結構相容性處理：若舊資料是字串則轉為物件
      const formattedItems = items.map(item => typeof item === 'string' ? { text: item, color: '#FFFFFF' } : item);
      setDisplayItems(formattedItems);
      if (!isEditing) setAnnouncementText(formattedItems.map(i => i.text).join('\n'));
    });
    onSnapshot(collection(db, `attendance_${dateKey}`), (snap) => {
      const data = {}; snap.forEach(d => data[d.id] = d.data());
      setAttendance(data);
    });
    const fetchPrev = async () => {
      const q = query(collection(db, "announcements"), where("date", "<", dateKey), orderBy("date", "desc"), limit(1));
      const snap = await getDocs(q);
      const items = !snap.empty ? snap.docs[0].data().items : [];
      setPrevTasks(items.map(item => typeof item === 'string' ? item : item.text));
    };
    fetchPrev();
  }, [db, viewDate, isEditing]);

  const saveTasks = async () => {
    const dateKey = formatDate(viewDate);
    const lines = announcementText.split('\n').filter(Boolean);
    const newItems = lines.map((text, idx) => {
      const existing = displayItems[idx];
      return { text: text.trim(), color: existing?.color || '#FFFFFF' };
    });
    await setDoc(doc(db, "announcements", dateKey), { items: newItems, date: dateKey }, { merge: true });
    setIsEditing(false);
  };

  const getFinalAttStatus = (id, attData) => {
    if (!attData) return 'absent';
    if (attData.manualAtt) return attData.manualAtt; 
    if (attData.status === 'sick' || attData.status === 'personal') return attData.status;
    if (!attData.checkinTime) return 'absent';
    const [h, m, s] = attData.checkinTime.split(':').map(Number);
    const totalS = h * 3600 + m * 60 + (s || 0);
    const lateS = SPECIAL_IDS.includes(id) ? (8 * 3600 + 10 * 60 + 30) : (7 * 3600 + 40 * 60 + 1);
    return totalS >= lateS ? 'late' : 'on-time';
  };

  const getFinalTaskStatus = (id, originalTaskName, attData) => {
    const cleanName = originalTaskName.trim();
    if (attData?.manualTasks?.[cleanName]) return attData.manualTasks[cleanName];
    const hw = attData?.completedTasks || {};
    if (!hw[originalTaskName] && !hw[cleanName]) return 'missing';
    const actionTime = attData.lastActionTime;
    if (!actionTime) return 'done';
    const [h, m, s] = actionTime.split(':').map(Number);
    const totalS = h * 3600 + m * 60 + (s || 0);
    const lateS = SPECIAL_IDS.includes(id) ? (8 * 3600 + 15 * 60) : (7 * 3600 + 40 * 60 + 1);
    return totalS >= lateS ? 'late' : 'done';
  };

  // 報表邏輯 (背景靜默計算)
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
        const dailyTasks = !annSnap.empty ? annSnap.docs[0].data().items.map(t => typeof t === 'string' ? t : t.text) : [];
        const isCurrentView = dKey === formatDate(viewDate);

        STUDENTS.forEach(student => {
          const sid = student.id;
          const d = (isCurrentView && attendance[sid]) ? attendance[sid] : attMap[sid];
          if (!d) {
            stats[sid].dailyRecords[dKey] = { att: 'absent', missingList: [], lateList: [], allDone: false };
            if (dailyTasks.length > 0) {
              stats[sid].missingDays++;
              dailyTasks.forEach(t => {
                stats[sid].issues.push(`${dKey.slice(5)}: ${t} (缺交)`);
                stats[sid].dailyRecords[dKey].missingList.push(t);
              });
            } else stats[sid].dailyRecords[dKey].allDone = true;
            return;
          }
          const finalAtt = getFinalAttStatus(sid, d);
          stats[sid][finalAtt === 'on-time' ? 'onTime' : finalAtt === 'late' ? 'late' : finalAtt === 'sick' ? 'sick' : 'personal']++;
          stats[sid].dailyRecords[dKey] = { att: finalAtt, missingList: [], lateList: [], allDone: false };
          if (dailyTasks.length > 0) {
            let mCount = 0; let lCount = 0;
            dailyTasks.forEach(t => {
              const fStat = getFinalTaskStatus(sid, t, d);
              if (fStat === 'missing') { mCount++; stats[sid].issues.push(`${dKey.slice(5)}: ${t} (缺交)`); stats[sid].dailyRecords[dKey].missingList.push(t); }
              else if (fStat === 'late') { lCount++; stats[sid].issues.push(`${dKey.slice(5)}: ${t} (遲交)`); stats[sid].dailyRecords[dKey].lateList.push(t); }
            });
            if (mCount > 0) stats[sid].missingDays++; else if (lCount > 0) stats[sid].lateDays++; else { stats[sid].fullDoneDays++; stats[sid].dailyRecords[dKey].allDone = true; }
          } else stats[sid].dailyRecords[dKey].allDone = true;
        });
      }
      if (isMounted) setMonthlyStats(stats);
    };
    fetchMonth();
    return () => { isMounted = false; };
  }, [db, activeStatMonth, recordedDates, attendance, viewDate, refreshCounter]);

  const cycleManualAtt = async (studentId) => {
    if (!user) return;
    const d = attendance[studentId] || {};
    const cycle = ['auto', 'on-time', 'late', 'sick', 'personal'];
    const next = cycle[(cycle.indexOf(d.manualAtt || 'auto') + 1) % cycle.length];
    await setDoc(doc(db, `attendance_${formatDate(viewDate)}`, studentId), { manualAtt: next === 'auto' ? deleteField() : next }, { merge: true });
    setRefreshCounter(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex flex-col font-sans select-none overflow-x-hidden">
      {/* 頂部 Header */}
      <header className="bg-white border-b-2 border-sky-100 shadow-sm sticky top-0 z-[100] print:hidden">
        <div className="px-8 py-4 flex items-center justify-between border-b border-sky-50">
          <div className="flex items-center gap-6">
            <div className="relative">
              <Ship className="w-16 h-16 text-sky-600" />
              <div className="absolute -top-1 -right-1 bg-amber-400 w-5 h-5 rounded-full border-2 border-white animate-bounce"></div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-4">
                <h1 className="text-6xl font-black text-sky-900 leading-none">五甲航海日誌</h1>
                <span className="text-lg font-bold text-slate-300">Ver {APP_VERSION}</span>
                <button onClick={() => user ? signOut(auth) : signInWithEmailAndPassword(auth, prompt("Email"), prompt("密碼"))} className={`ml-4 px-4 py-2 rounded-xl text-xl font-bold flex items-center gap-2 ${user ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  {user ? <Unlock size={24}/> : <Lock size={24}/>} {user ? '教師模式' : '學生模式'}
                </button>
              </div>
              {/* 功能 1：具美感的標題佳句 (沙灘金與標楷體) */}
              <div className="flex items-center gap-3 mt-2">
                <div className="h-px w-8 bg-amber-200"></div>
                <p className="text-2xl font-black text-amber-500 tracking-[0.3em] font-serif italic drop-shadow-sm">
                  ⚓ 學 海 無 涯 勤 是 岸 ⚓
                </p>
                <div className="h-px w-8 bg-amber-200"></div>
              </div>
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
              <select value={activeStatMonth} onChange={(e) => setActiveStatMonth(e.target.value)} className="bg-white border-2 border-sky-300 text-sky-700 rounded-xl px-2 py-1 font-black text-xl outline-none cursor-pointer">
                {Array.from({length:12}, (_, i) => `${i+1}月`).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto max-w-[40vw] scrollbar-hide py-1">
              {recordedDates.filter(d => parseInt(d.split('-')[1]) === parseInt(activeStatMonth)).map(d => (
                <button key={d} onClick={() => setViewDate(new Date(d))} className={`px-6 py-2 rounded-2xl text-2xl font-black transition-all shrink-0 ${formatDate(viewDate) === d ? 'bg-sky-600 text-white shadow-lg scale-105' : 'bg-white text-sky-400 border border-sky-100 hover:bg-sky-50'}`}>{d.split('-')[2]}</button>
              ))}
            </div>
          </div>
          
          {user && (
            <div className="flex items-center gap-3">
              <button onClick={() => handleDeleteDate(formatDate(viewDate))} className="p-3 bg-rose-100 text-rose-600 rounded-2xl hover:bg-rose-500 hover:text-white transition-all"><Trash2 size={32}/></button>
              <div className="flex bg-white p-1.5 rounded-2xl items-center shadow-inner border border-sky-100">
                <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)))} className="p-2 hover:bg-sky-50 rounded-xl"><ChevronLeft size={36}/></button>
                <span className="text-3xl font-black px-6 text-sky-800">{formatDate(viewDate)}</span>
                <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)))} className="p-2 hover:bg-sky-50 rounded-xl"><ChevronRight size={36}/></button>
              </div>
              <button onClick={saveTasks} className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white" title="儲存"><Plus size={32}/></button>
              
              {/* 功能 3：月曆快選系統 (支援跨月選擇) */}
              <div className="relative">
                <button onClick={() => { setShowCalendarPicker(!showCalendarPicker); setPickerMonth(new Date(viewDate)); }} className={`p-3 rounded-2xl shadow-sm transition-all ${showCalendarPicker ? 'bg-sky-600 text-white scale-110' : 'bg-sky-100 text-sky-600 hover:bg-sky-200'}`}><CalendarDays size={32}/></button>
                {showCalendarPicker && (
                  <div className="absolute right-0 top-full mt-4 bg-white border-4 border-sky-200 rounded-[2.5rem] shadow-2xl z-[300] p-6 w-80 animate-in fade-in zoom-in-95">
                    <div className="flex justify-between items-center mb-6">
                      <button onClick={() => setPickerMonth(new Date(pickerMonth.setMonth(pickerMonth.getMonth() - 1)))} className="p-2 hover:bg-sky-50 rounded-full text-sky-600"><ChevronLeft size={24}/></button>
                      <h4 className="text-2xl font-black text-sky-800">{pickerMonth.getFullYear()}年 {pickerMonth.getMonth() + 1}月</h4>
                      <button onClick={() => setPickerMonth(new Date(pickerMonth.setMonth(pickerMonth.getMonth() + 1)))} className="p-2 hover:bg-sky-50 rounded-full text-sky-600"><ChevronRight size={24}/></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-400 mb-2">
                      {['日','一','二','三','四','五','六'].map(w => <div key={w} className="text-sm">{w}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {(() => {
                        const y = pickerMonth.getFullYear(), m = pickerMonth.getMonth();
                        const first = new Date(y, m, 1).getDay();
                        const days = new Date(y, m + 1, 0).getDate();
                        const cells = [];
                        for(let i=0; i<first; i++) cells.push(<div key={`e-${i}`} />);
                        for(let d=1; d<=days; d++) {
                          const dKey = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                          const hasData = recordedDates.includes(dKey);
                          cells.push(
                            <button key={d} onClick={() => { setViewDate(new Date(dKey)); setShowCalendarPicker(false); }} className={`aspect-square rounded-xl text-lg font-bold transition-all relative ${formatDate(viewDate) === dKey ? 'bg-sky-600 text-white' : hasData ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'hover:bg-slate-50 text-slate-300'}`}>
                              {d}{hasData && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-500 rounded-full" />}
                            </button>
                          );
                        }
                        return cells;
                      })()}
                    </div>
                    <button onClick={() => setShowCalendarPicker(false)} className="w-full mt-6 py-3 bg-slate-100 rounded-2xl text-slate-500 font-bold hover:bg-rose-50 hover:text-rose-600">關閉視窗</button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 主視窗 */}
      <main className="flex flex-col lg:flex-row p-4 gap-2 print:hidden items-stretch pb-12">
        {/* 1. 簽到區 */}
        <div style={{ width: `${w1}%` }} className="bg-white rounded-[3rem] shadow-sm p-5 flex flex-col border border-sky-50 shrink-0">
          <h2 className="text-3xl font-black mb-6 text-sky-800 flex items-center gap-3 px-2 shrink-0"><UserCheck size={40}/> 航海員簽到</h2>
          <div className="grid grid-cols-2 gap-4 flex-1">
            {STUDENTS.map(s => {
              const d = attendance[s.id]; const attStat = getFinalAttStatus(s.id, d);
              let color = 'bg-slate-50 text-slate-300 border-slate-100';
              if (!isPublished) color = 'bg-slate-100 opacity-60 cursor-not-allowed';
              else if (attStat === 'on-time') color = 'bg-emerald-50 text-emerald-600 border-emerald-200';
              else if (attStat === 'late') color = 'bg-pink-50 text-pink-600 border-pink-200';
              else if (attStat === 'sick') color = 'bg-purple-50 text-purple-700 border-purple-100';
              else if (attStat === 'personal') color = 'bg-orange-50 text-orange-700 border-orange-100';
              return (
                <button key={s.id} disabled={!isPublished} onClick={() => { setSelectedTasks(d?.completedTasks || {}); setActiveStudent(s); }} className={`min-h-[96px] rounded-[1.8rem] flex flex-col items-center justify-center transition-all border-b-8 active:border-b-0 ${color}`}>
                  <span className="text-5xl font-black">{maskName(s.name)}</span>
                  {d?.checkinTime && <span className="text-2xl font-black mt-1 opacity-80">{attStat === 'on-time' ? d.checkinTime : attStat === 'late' ? '遲到' : attStat === 'sick' ? '病假' : '事假'}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-4 mx-1 cursor-col-resize flex items-center justify-center hover:bg-sky-200 rounded-full" onMouseDown={(e) => {
          const startX = e.clientX, startW = w1;
          const move = (ev) => setW1(Math.max(15, Math.min(startW + ((ev.clientX - startX) / window.innerWidth) * 100, 40)));
          const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
          document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
        }}><GripVertical className="text-sky-300"/></div>

        {/* 2. 進度區 (功能 2：語義化金色進度條) */}
        <div style={{ width: `${w2}%` }} className="bg-white rounded-[3rem] shadow-sm p-5 flex flex-col border border-sky-50 shrink-0">
          <h2 className="text-3xl font-black mb-6 text-sky-800 flex items-center gap-3 px-2 shrink-0"><LayoutDashboard size={40}/> 今日任務進度</h2>
          <div className="flex flex-col gap-4 flex-1 justify-between">
            {STUDENTS.map(s => {
              const d = attendance[s.id];
              const comp = prevTasks.filter(t => getFinalTaskStatus(s.id, t, d) !== 'missing').length;
              const total = prevTasks.length;
              const isFull = comp === total && total > 0;
              const progress = total > 0 ? (comp / total) * 100 : 0;
              
              return (
                <div key={s.id} onClick={() => setViewOnlyStudent({ student: s, tasks: d?.completedTasks || {} })} className={`min-h-[48px] flex items-center px-4 rounded-[1.2rem] border transition-all cursor-pointer ${isFull ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-3xl font-black text-sky-900 w-28 truncate">{maskName(s.name)}</span>
                  
                  {/* 進度條改色：齊全為沙灘金，未完為深藍色海浪 */}
                  <div className="flex-1 h-6 bg-slate-200 rounded-full mx-4 relative overflow-hidden shadow-inner">
                    <div className={`h-full transition-all duration-1000 ease-out relative ${isFull ? 'bg-gradient-to-r from-amber-300 to-yellow-500' : 'bg-sky-600'}`} style={{ width: `${progress}%` }}>
                       {progress > 0 && (
                         <div className="absolute right-0 top-1/2 -translate-y-1/2 pr-1 animate-pulse">
                           <Ship size={16} className="text-white drop-shadow-md" />
                         </div>
                       )}
                       <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/waves.png')]"></div>
                    </div>
                  </div>
                  <span className={`text-3xl font-black w-20 text-right ${isFull ? 'text-amber-600' : 'text-slate-500'}`}>{comp}/{total}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-4 mx-1 cursor-col-resize flex items-center justify-center hover:bg-sky-200 rounded-full" onMouseDown={(e) => {
          const startX = e.clientX, startW = w2;
          const move = (ev) => setW2(Math.max(15, Math.min(startW + ((ev.clientX - startX) / window.innerWidth) * 100, 40)));
          const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
          document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
        }}><GripVertical className="text-sky-300"/></div>

        {/* 3. 任務區 (功能 4：支援彩色任務) */}
        <div className="flex-1 bg-[#0C4A6E] rounded-[3rem] shadow-xl p-8 text-white flex flex-col shrink-0 min-w-0 relative">
          <Anchor size={200} className="absolute -bottom-10 -right-10 text-white/5 rotate-12" />
          <div className="flex justify-between items-center mb-6 border-b border-white/20 pb-4 relative z-10">
            <h2 className="text-4xl font-black flex items-center gap-4 text-sky-200"><ScrollText size={48}/> 任務發布區</h2>
            <div className="flex items-center gap-4">
              <div className="flex bg-white/10 p-2 rounded-2xl border border-white/10 items-center gap-2">
                <button onClick={() => setUseBiauKai(!useBiauKai)} className={`p-2 rounded-xl ${useBiauKai ? 'bg-sky-500 shadow-lg' : ''}`}><Type/></button>
                <button onClick={() => setFontSize(f => Math.max(20, f-4))} className="p-2"><Minus/></button>
                <button onClick={() => setFontSize(f => Math.min(100, f+4))} className="p-2"><Plus/></button>
              </div>
              {user && <button onClick={() => isEditing ? saveTasks() : setIsEditing(true)} className="bg-emerald-500 px-8 py-3 rounded-2xl font-black text-2xl shadow-lg text-white">{isEditing ? '儲存' : '編輯'}</button>}
            </div>
          </div>

          {/* 功能 4：任務色彩選擇器 */}
          {isEditing && (
            <div className="flex flex-col gap-4 mb-4 relative z-10 animate-fade-in">
              <div className="flex flex-wrap gap-2">
                {QUICK_TAGS.map(t => <button key={t} onClick={() => setAnnouncementText(p => p ? p + '\n' + t : t)} className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl font-bold hover:bg-white/30">{t}</button>)}
              </div>
              <div className="flex items-center gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                <Palette size={24} className="text-sky-300" />
                <span className="text-xl font-bold text-sky-100">選中行顏色：</span>
                <div className="flex gap-2">
                  {COLOR_PALETTE.map(c => (
                    <button key={c.name} onClick={() => {
                      if (selectedLineIndex !== null) {
                        const newItems = [...displayItems];
                        if (newItems[selectedLineIndex]) {
                          newItems[selectedLineIndex].color = c.value;
                          setDisplayItems(newItems);
                        }
                      }
                    }} title={c.name} className="w-10 h-10 rounded-full border-2 border-white/20 transition-transform hover:scale-125 shadow-md" style={{ backgroundColor: c.value }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 bg-black/20 rounded-[2.5rem] p-8 shadow-inner overflow-y-auto relative z-10">
            {isEditing ? (
              <div className="flex flex-col gap-1">
                {announcementText.split('\n').map((line, idx) => (
                  <div key={idx} onClick={() => setSelectedLineIndex(idx)} className={`flex items-center gap-4 p-2 rounded-xl transition-colors cursor-pointer ${selectedLineIndex === idx ? 'bg-white/10 border border-white/20' : 'hover:bg-white/5'}`}>
                    <span className="w-8 h-8 bg-sky-800 rounded-full flex items-center justify-center text-sm font-bold">{idx+1}</span>
                    <input value={line} onChange={(e) => {
                      const lines = announcementText.split('\n'); lines[idx] = e.target.value; setAnnouncementText(lines.join('\n'));
                    }} className="bg-transparent flex-1 outline-none text-4xl font-black" style={{ color: displayItems[idx]?.color || '#FFFFFF' }} />
                  </div>
                ))}
                <button onClick={() => setAnnouncementText(p => p + '\n新任務')} className="mt-4 p-4 border-2 border-dashed border-white/20 rounded-2xl text-white/50 hover:bg-white/5">+ 新增一行</button>
              </div>
            ) : (
              <div style={{ fontFamily: useBiauKai ? '"BiauKai", "DFKai-SB", "標楷體", serif' : 'inherit', fontSize: `${fontSize}px`, lineHeight: lineHeight }} className={useBiauKai ? 'font-normal tracking-wide' : 'font-black'}>
                {displayItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-8 border-b border-white/5 pb-2 mb-2 last:border-0 transition-all">
                    <span className="flex-shrink-0 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-900 text-2xl shadow-lg border-4 border-yellow-200/80 font-sans font-black">{i+1}</span>
                    <span className="drop-shadow-sm pt-1" style={{ color: item.color || '#FFFFFF' }}>{item.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 彈窗系統 (略，維持與 V19 相同功能) */}
      {(activeStudent || viewOnlyStudent) && (() => {
        const targetId = activeStudent ? activeStudent.id : viewOnlyStudent.student.id;
        const liveMonthData = monthlyStats[targetId];
        return (
          <div className="fixed inset-0 bg-sky-900/95 backdrop-blur-xl z-[400] flex items-center justify-center p-8 print:hidden">
            <div className="bg-white rounded-[4rem] w-full max-w-[90vw] p-10 shadow-2xl relative flex flex-col max-h-[90vh] border-[12px] border-sky-100/50">
              <div className="flex justify-between items-center mb-6 border-b-4 border-sky-50 pb-6 shrink-0">
                <h3 className="text-6xl font-black text-sky-900 flex items-center gap-6">{maskName(activeStudent?.name || viewOnlyStudent?.student.name)} <span className="text-2xl text-sky-500 font-bold bg-sky-50 px-4 py-2 rounded-full">{viewOnlyStudent?.isHistory ? `${activeStatMonth} 學習歷程` : `任務確認`}</span></h3>
                <button onClick={() => { setActiveStudent(null); setViewOnlyStudent(null); }} className="text-slate-300 hover:text-red-500 bg-slate-50 rounded-full p-2"><XCircle size={64}/></button>
              </div>
              <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                {viewOnlyStudent?.isHistory ? (
                   <div className="space-y-3">
                     {liveMonthData && Object.entries(liveMonthData.dailyRecords).sort((a,b)=>b[0].localeCompare(a[0])).map(([date, rec]) => (
                       <div key={date} className="p-4 bg-slate-50 rounded-3xl border-2 border-slate-100 flex flex-col gap-3">
                         <div className="flex items-center justify-between border-b-2 border-slate-200 pb-2"><span className="text-4xl font-black text-sky-800">{date}</span>{getStatusDisplay(rec.att, 'att')}</div>
                         <div className="flex gap-2 flex-wrap pt-1">{rec.allDone && <span className="text-3xl font-black text-blue-600 flex items-center gap-2"><CheckCircle2 size={32}/> 任務齊全</span>}{rec.missingList.map(m => <span key={m} className="px-4 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-2xl font-bold">{m} (缺)</span>)}</div>
                       </div>
                     ))}
                   </div>
                ) : activeStudent && (
                  <div className="grid grid-cols-3 gap-6">
                    {prevTasks.map((t, idx) => (
                      <label key={idx} className={`p-6 rounded-[2rem] border-4 flex items-center gap-6 transition-all cursor-pointer shadow-sm ${selectedTasks[t] ? 'bg-blue-50 border-blue-500 text-blue-800' : 'bg-white border-slate-300'}`}>
                        <input type="checkbox" checked={!!selectedTasks[t]} onChange={(e) => setSelectedTasks({...selectedTasks, [t]: e.target.checked})} className="w-10 h-10 accent-blue-600" />
                        <span className="text-4xl font-black leading-tight">{t}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {activeStudent && (
                <div className="grid grid-cols-3 gap-6 shrink-0 h-28 mt-8 border-t-4 border-slate-50 pt-8">
                  <button onClick={() => submitCheckin('present')} className="bg-sky-500 text-white rounded-[2rem] text-4xl font-black shadow-xl">確認打卡</button>
                  <button onClick={() => submitCheckin('sick')} className="bg-purple-400 text-white rounded-[2rem] text-4xl font-black shadow-md">病假</button>
                  <button onClick={() => submitCheckin('personal')} className="bg-orange-400 text-white rounded-[2rem] text-4xl font-black shadow-md">事假</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* 功能 5：優化列印報表區域 (加寬明細欄位) */}
      <div className="hidden print:block p-8 bg-white text-black font-sans">
        <h1 className="text-center text-4xl font-bold mb-8 border-b-4 border-black pb-4">五年甲班 {activeStatMonth} 學習表現統計表</h1>
        <div className="grid grid-cols-1 gap-12"> {/* 改為單欄以換取最大寬度 */}
          {STUDENTS.map(s => {
            const sd = monthlyStats[s.id] || { onTime: 0, late: 0, sick: 0, personal: 0, fullDoneDays: 0, issues: [] };
            return (
              <div key={s.id} className="border-4 border-black p-10 rounded-[2rem] break-inside-avoid shadow-sm flex flex-col md:flex-row gap-8">
                <div className="w-64 shrink-0 border-r-4 border-slate-200 pr-8">
                  <h3 className="text-4xl font-black mb-4">{s.name}</h3>
                  <div className="space-y-3 text-xl font-bold">
                    <p className="text-emerald-600">準時: {sd.onTime} 天</p>
                    <p className="text-rose-500">遲到: {sd.late} 天</p>
                    <p className="text-slate-500">假別: {sd.sick + sd.personal} 天</p>
                    <div className="pt-4 border-t-2 border-slate-100">
                      <p className="text-blue-600 text-2xl">任務齊全: {sd.fullDoneDays} 天</p>
                    </div>
                  </div>
                </div>
                {/* 功能 5：加寬補交明細區域 */}
                <div className="flex-1">
                  <p className="text-2xl font-black mb-4 flex items-center gap-2"><AlertTriangle className="text-amber-500"/> 需補交/補正任務明細：</p>
                  <div className="grid grid-cols-2 gap-x-12 gap-y-2">
                    {sd.issues.length > 0 ? sd.issues.map((iss, i) => (
                      <div key={i} className="text-lg border-b border-slate-100 pb-1 flex justify-between">
                        <span>· {iss.split(': ')[1]}</span>
                        <span className="text-slate-400 text-sm font-mono">{iss.split(': ')[0]}</span>
                      </div>
                    )) : <p className="text-slate-400 italic text-xl">目前各項任務皆已齊全，表現優異！</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default App;
