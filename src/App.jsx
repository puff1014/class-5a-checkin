import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, orderBy, limit, serverTimestamp, getDocs, writeBatch, deleteField } from 'firebase/firestore';
import { Ship, ScrollText, ChevronLeft, ChevronRight, XCircle, Clock, UserCheck, Plus, Minus, Trash2, LayoutDashboard, Calendar, Trophy, XOctagon, CheckCircle2, Smile, Lock, Unlock, ArrowUp, ArrowDown, Printer, UserMinus, Type, GripVertical, Edit3, AlertTriangle, History, Anchor, Waves, CalendarDays } from 'lucide-react';

const APP_VERSION = "V19.0.260224_Shoreline";
const firebaseConfig = { apiKey: "AIzaSyArwz6gPeW9lNq_8LOfnKYwZmkRN-Wgtb8", authDomain: "class-5a-app.firebaseapp.com", projectId: "class-5a-app", storageBucket: "class-5a-app.firebasestorage.app", messagingSenderId: "828328241350", appId: "1:828328241350:web:5d39d529209f87a2540fc7" };
const STUDENTS = [{ id: '1', name: '陳昕佑' }, { id: '2', name: '徐偉綸' }, { id: '3', name: '蕭淵群' }, { id: '4', name: '吳秉晏' }, { id: '5', name: '呂秉蔚' }, { id: '6', name: '吳家昇' }, { id: '7', name: '翁芷儀' }, { id: '8', name: '鄭筱妍' }, { id: '9', name: '周筱涵' }, { id: '10', name: '李婕妤' }];
const SPECIAL_IDS = ['5', '7', '8'];
const QUICK_TAGS = ["預習數課", "數習", "數八", "背成+小+寫", "國甲", "國乙", "國丙", "閱讀A", "閱讀B", "國預習單", "朗讀", "解釋單", "國練卷", "符號本", "帶學用品", "訂正功課"];

const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const maskName = (n) => n ? n[0] + "O" + (n[2] || "") : "";

const App = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [user, setUser] = useState(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false); 
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

  // V19 全月曆海圖生成
  const renderCalendarGrid = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(<div key={`empty-${i}`} className="h-20 sm:h-24"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
      const dKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasData = recordedDates.includes(dKey);
      const isToday = formatDate(new Date()) === dKey;
      cells.push(
        <button key={d} onClick={() => { setViewDate(new Date(dKey)); setIsCalendarOpen(false); }}
          className={`h-20 sm:h-24 border-2 rounded-3xl flex flex-col items-center justify-center transition-all relative group
            ${hasData ? 'bg-sky-50 border-sky-200 shadow-sm' : 'bg-white border-slate-50 hover:border-sky-300'}
            ${isToday ? 'ring-4 ring-amber-400 font-bold' : ''}`}>
          <span className={`text-3xl ${hasData ? 'text-sky-700 font-black' : 'text-slate-400'}`}>{d}</span>
          {hasData && <Anchor size={18} className="text-sky-400 mt-1 animate-pulse" />}
        </button>
      );
    }
    return cells;
  };

  useEffect(() => {
    if (!db) return;
    const dateKey = formatDate(viewDate);
    const m = `${viewDate.getMonth() + 1}月`;
    if (activeStatMonth !== m) setActiveStatMonth(m);
    onSnapshot(doc(db, "announcements", dateKey), (snap) => {
      const items = snap.exists() ? snap.data().items || [] : [];
      setDisplayItems(items);
      if (!isEditing) setAnnouncementText(items.join('\n'));
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
    const cleanName = originalTaskName.trim();
    if (attData?.manualTasks?.[cleanName]) return attData.manualTasks[cleanName];
    const hw = attData?.completedTasks || {};
    if (!hw[originalTaskName] && !hw[cleanName]) return 'missing';
    if (isAutoTaskLate(id, attData.lastActionTime)) return 'late';
    return 'done';
  };

  // V19 海洋進度計算引擎
  const shorelineStats = useMemo(() => {
    const total = STUDENTS.length;
    let onShore = 0; let shallow = 0; let missingNames = [];
    STUDENTS.forEach(s => {
      const d = attendance[s.id];
      const attStat = getFinalAttStatus(s.id, d);
      const comp = prevTasks.filter(t => getFinalTaskStatus(s.id, t.trim(), d) === 'done' || getFinalTaskStatus(s.id, t.trim(), d) === 'late').length;
      const isFull = comp === prevTasks.length && prevTasks.length > 0;
      if (isFull && attStat === 'on-time') onShore++;
      else if (d?.checkinTime) shallow++;
      else missingNames.push(maskName(s.name));
    });
    return { beachWidth: (onShore / total) * 100, shallowWidth: (shallow / total) * 100, deepWidth: ((total - onShore - shallow) / total) * 100, missingNames };
  }, [attendance, prevTasks, STUDENTS, refreshCounter]);

  // V19 定錨推送邏輯
  const handlePushToV20 = async () => {
    if (!user || displayItems.length === 0) return;
    const tomorrow = new Date(viewDate); tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = formatDate(tomorrow);
    if (window.confirm(`確定定錨今日任務並推送至 V20 訂正作業表 (${tomorrowKey}) 嗎？`)) {
      try {
        await setDoc(doc(db, "v20_sync_tasks", tomorrowKey), { fromV18Date: formatDate(viewDate), tasks: displayItems, pushedAt: serverTimestamp(), targetCheckDate: tomorrowKey });
        alert(`🚀 定錨成功！V20 已經準備好任務清單了。`);
      } catch (e) { alert("推送失敗，請檢查權限或網路。"); }
    }
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
          const sid = student.id; const d = (dKey === formatDate(viewDate) && attendance[sid]) ? attendance[sid] : attMap[sid];
          if (!d) {
            stats[sid].dailyRecords[dKey] = { att: 'absent', missingList: [], lateList: [], allDone: false };
            if (dailyTasks.length > 0) { stats[sid].missingDays++; dailyTasks.forEach(t => stats[sid].issues.push(`${dKey.slice(5)}: ${t.trim()} (缺交)`)); }
            return; 
          }
          const finalAtt = getFinalAttStatus(sid, d);
          if (finalAtt === 'on-time') stats[sid].onTime++; else if (finalAtt === 'late') stats[sid].late++; else if (finalAtt === 'sick') stats[sid].sick++; else if (finalAtt === 'personal') stats[sid].personal++;
          stats[sid].dailyRecords[dKey] = { att: finalAtt, missingList: [], lateList: [], allDone: false };
          if (dailyTasks.length > 0) {
            let missingCount = 0; let lateCount = 0;
            dailyTasks.forEach(t => {
              const finalTask = getFinalTaskStatus(sid, t.trim(), d);
              if (finalTask === 'missing') { missingCount++; stats[sid].dailyRecords[dKey].missingList.push(t.trim()); }
              else if (finalTask === 'late') { lateCount++; stats[sid].dailyRecords[dKey].lateList.push(t.trim()); }
            });
            if (missingCount > 0) stats[sid].missingDays++; else if (lateCount > 0) stats[sid].lateDays++; else { stats[sid].fullDoneDays++; stats[sid].dailyRecords[dKey].allDone = true; }
          } else { stats[sid].dailyRecords[dKey].allDone = true; }
        });
      }
      if (isMounted) setMonthlyStats(stats);
    };
    fetchMonth(); return () => { isMounted = false; };
  }, [db, activeStatMonth, recordedDates, attendance, viewDate, refreshCounter]);

  const cycleManualAtt = async (studentId) => {
    if (!user) return;
    const dateKey = formatDate(viewDate);
    const current = (attendance[studentId] || {}).manualAtt || 'auto';
    const cycle = ['auto', 'on-time', 'late', 'sick', 'personal'];
    const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
    await setDoc(doc(db, `attendance_${dateKey}`, studentId), { manualAtt: next === 'auto' ? deleteField() : next }, { merge: true });
    setRefreshCounter(prev => prev + 1);
  };

  const cycleManualTask = async (studentId, taskName) => {
    if (!user) return;
    const dateKey = formatDate(viewDate);
    const currentManualTasks = (attendance[studentId] || {}).manualTasks || {};
    const cycle = ['auto', 'done', 'late', 'missing', 'exempt'];
    const currentStatus = currentManualTasks[taskName.trim()] || 'auto';
    const nextStatus = cycle[(cycle.indexOf(currentStatus) + 1) % cycle.length];
    const updatedTasks = { ...currentManualTasks };
    if (nextStatus === 'auto') updatedTasks[taskName.trim()] = null; else updatedTasks[taskName.trim()] = nextStatus;
    await setDoc(doc(db, `attendance_${dateKey}`, studentId), { manualTasks: updatedTasks }, { merge: true });
    setRefreshCounter(prev => prev + 1);
  };

  const getStatusDisplay = (status, type) => {
    if (type === 'att') {
      const config = { 'on-time': 'bg-emerald-100 text-emerald-800 border-emerald-200', 'late': 'bg-pink-100 text-pink-800 border-pink-200', 'sick': 'bg-purple-100 text-purple-800 border-purple-200', 'personal': 'bg-orange-100 text-orange-800 border-orange-200' };
      return <span className={`${config[status] || 'bg-slate-100 text-slate-500'} px-6 py-2 rounded-xl text-5xl font-black shadow-sm tracking-widest border-2`}>{ { 'on-time': '準時', 'late': '遲到', 'sick': '病假', 'personal': '事假' }[status] || '未簽到' }</span>;
    }
    const tConfig = { 'done': 'bg-blue-100 text-blue-800 border-blue-300', 'late': 'bg-amber-100 text-amber-800 border-amber-300', 'missing': 'bg-rose-100 text-rose-800 border-rose-300', 'exempt': 'bg-slate-200 text-slate-700 border-slate-400' };
    return <span className={`${tConfig[status] || 'bg-slate-100 text-slate-400'} px-4 py-2 rounded-xl border-2 font-bold`}>{ { 'done': '齊全', 'late': '遲交', 'missing': '缺交', 'exempt': '免交' }[status] || '未知' }</span>;
  };

  const submitCheckin = async (status = 'present') => {
    const dateKey = formatDate(viewDate);
    const nowTime = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    await setDoc(doc(db, `attendance_${dateKey}`, activeStudent.id), { name: activeStudent.name, status, completedTasks: selectedTasks, checkinTime: attendance[activeStudent.id]?.checkinTime || nowTime, lastActionTime: nowTime, timestamp: serverTimestamp() }, { merge: true });
    setActiveStudent(null);
  };

  const handleDeleteDate = async (dateStr) => {
    if (user && window.confirm(`確定要刪除 ${dateStr} 的紀錄嗎？`)) {
      const batch = writeBatch(db); batch.delete(doc(db, "announcements", dateStr));
      const attDocs = await getDocs(collection(db, `attendance_${dateStr}`)); attDocs.forEach(d => batch.delete(d.ref));
      await batch.commit(); if (dateStr === formatDate(viewDate)) { setDisplayItems([]); setAttendance({}); }
    }
  };

  const isPublished = recordedDates.includes(formatDate(viewDate));

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex flex-col font-sans select-none overflow-x-hidden">
      <header className="bg-white border-b-2 border-sky-100 shadow-sm sticky top-0 z-[100] print:hidden">
        <div className="px-8 py-4 flex items-center justify-between border-b border-sky-50">
          <div className="flex items-center gap-6">
            <Ship className="w-16 h-16 text-sky-600" />
            <div className="flex flex-col">
              <div className="flex items-baseline gap-4">
                <h1 className="text-6xl font-black text-sky-900 leading-none">五甲航海日誌</h1>
                <span className="text-lg font-bold text-slate-300">Ver {APP_VERSION}</span>
                <button onClick={() => user ? signOut(auth) : signInWithEmailAndPassword(auth, prompt("Email"), prompt("密碼"))} className={`px-4 py-2 rounded-xl text-xl font-bold flex items-center gap-2 ${user ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  {user ? <Unlock size={24}/> : <Lock size={24}/>} {user ? '教師模式' : '學生模式'}
                </button>
              </div>
              <button onClick={() => setIsCalendarOpen(true)} className="mt-2 flex items-center gap-2 text-sky-600 font-bold hover:text-sky-800 transition-all text-2xl group"><CalendarDays size={28} className="group-hover:scale-110" /> 開啟全月海圖</button>
            </div>
          </div>

          <div className="flex-1 max-w-2xl px-12 relative group text-center">
            <div className="flex justify-between items-end mb-2">
              <span className="text-2xl font-black text-sky-800">學海無涯 勤是岸</span>
              <span className="text-4xl font-black text-amber-600">{Math.round(shorelineStats.beachWidth)}%</span>
            </div>
            <div className="h-10 w-full bg-slate-100 rounded-full overflow-hidden flex border-4 border-white shadow-lg">
              <div style={{ width: `${shorelineStats.beachWidth}%` }} className="bg-[#FEF3C7] transition-all duration-1000 shadow-inner" />
              <div style={{ width: `${shorelineStats.shallowWidth}%` }} className="bg-[#2DD4BF] transition-all duration-700" />
              <div style={{ width: `${shorelineStats.deepWidth}%` }} className="bg-[#1E3A8A] transition-all duration-500 shadow-[inset_2px_0_5px_rgba(0,0,0,0.3)]" />
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-all absolute top-full left-1/2 -translate-x-1/2 mt-3 z-50 bg-white border-4 border-blue-500 p-6 rounded-[2rem] shadow-2xl min-w-[300px]">
                 <p className="text-blue-700 text-2xl font-black mb-3 flex items-center gap-2 border-b-2 border-blue-100 pb-2"><Waves size={24}/> 仍在深海的名單：</p>
                 <div className="flex flex-wrap gap-3">{shorelineStats.missingNames.length > 0 ? shorelineStats.missingNames.map(n => <span key={n} className="bg-blue-50 text-blue-700 px-4 py-1.5 rounded-xl font-bold text-xl border border-blue-100">{n}</span>) : <span className="text-emerald-600 font-bold text-2xl animate-bounce">全員安全上岸！</span>}</div>
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
              <span className="font-bold text-sky-800 text-2xl">導航月：</span>
              <select value={activeStatMonth} onChange={(e) => setActiveStatMonth(e.target.value)} className="bg-white border-2 border-sky-300 text-sky-700 rounded-xl px-2 py-1 font-black text-xl outline-none">
                {["1月", "2月", "3月", "4月", "5月", "6月"].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto max-w-[30vw] scrollbar-hide py-1">
              {recordedDates.filter(d => parseInt(d.split('-')[1]) === parseInt(activeStatMonth)).map(d => (
                <button key={d} onClick={(e) => { if(user && e.altKey) handleDeleteDate(d); else setViewDate(new Date(d)); }}
                  className={`px-6 py-2 rounded-2xl text-2xl font-black transition-all shrink-0 ${formatDate(viewDate) === d ? 'bg-sky-600 text-white shadow-lg' : 'bg-white text-sky-400 border border-sky-100'}`}>{d.split('-')[2]}</button>
              ))}
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <button onClick={handlePushToV20} className="px-8 py-3 bg-amber-500 text-white rounded-2xl font-black text-2xl shadow-lg hover:bg-amber-600 transition-all flex items-center gap-3 active:scale-95"><Anchor size={32}/> 定錨推送至 V20</button>
              <div className="w-px h-10 bg-slate-200 mx-2" />
              <button onClick={() => handleDeleteDate(formatDate(viewDate))} className="p-3 bg-rose-100 text-rose-600 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><Trash2 size={32}/></button>
              <div className="flex bg-white p-1.5 rounded-2xl items-center shadow-inner border border-sky-100">
                <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)))} className="p-2 hover:bg-sky-50 rounded-xl transition-all"><ChevronLeft size={36}/></button>
                <span className="text-3xl font-black px-6 text-sky-800">{formatDate(viewDate)}</span>
                <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)))} className="p-2 hover:bg-sky-50 rounded-xl transition-all"><ChevronRight size={36}/></button>
              </div>
              <button onClick={() => setDoc(doc(db, "announcements", formatDate(viewDate)), { date: formatDate(viewDate), items: displayItems }, {merge:true})} className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl hover:bg-emerald-500 transition-all"><Plus size={32}/></button>
            </div>
          )}
        </div>
      </header>

      {isCalendarOpen && (
        <div className="fixed inset-0 bg-sky-950/60 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <div className="bg-white rounded-[4rem] w-full max-w-4xl p-10 shadow-2xl relative border-[16px] border-sky-50 overflow-hidden">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-6xl font-black text-sky-900 flex items-center gap-5"><Waves size={60} className="text-sky-500" /> 航海日程圖：{viewDate.getMonth() + 1}月</h2>
              <button onClick={() => setIsCalendarOpen(false)} className="text-slate-300 hover:text-rose-500 transition-all p-2 bg-slate-50 rounded-full"><XCircle size={70}/></button>
            </div>
            <div className="grid grid-cols-7 gap-4 mb-10">
              {['日','一','二','三','四','五','六'].map(w => <div key={w} className="text-center text-3xl font-black text-slate-400 py-4 tracking-widest">{w}</div>)}
              {renderCalendarGrid()}
            </div>
            <div className="flex gap-6">
              <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} className="flex-1 py-6 bg-slate-100 rounded-[2rem] font-black text-3xl text-slate-600 hover:bg-slate-200 transition-all">上個月</button>
              <button onClick={() => { setViewDate(new Date()); setIsCalendarOpen(false); }} className="flex-1 py-6 bg-sky-600 rounded-[2rem] font-black text-3xl text-white hover:bg-sky-700 shadow-xl transition-all">回到今日</button>
              <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} className="flex-1 py-6 bg-slate-100 rounded-[2rem] font-black text-3xl text-slate-600 hover:bg-slate-200 transition-all">下個月</button>
            </div>
          </div>
        </div>
      )}

      <main className="flex flex-col lg:flex-row p-4 gap-2 print:hidden items-stretch pb-12">
        <div style={{ width: `${w1}%` }} className="bg-white rounded-[3rem] shadow-sm p-5 flex flex-col border border-sky-50 shrink-0">
          <h2 className="text-3xl font-black mb-6 text-sky-800 flex items-center gap-3 px-2 shrink-0"><UserCheck size={40}/> 航海員簽到</h2>
          <div className="grid grid-cols-2 gap-4 flex-1">
            {STUDENTS.map(s => {
              const d = attendance[s.id]; const attStat = getFinalAttStatus(s.id, d);
              let color = 'bg-slate-50 text-slate-300 border-slate-100'; let textStatus = '未簽到';
              if (!isPublished) color = 'bg-slate-100 text-slate-400 opacity-60';
              else if (attStat === 'on-time') { color = 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm'; textStatus = d?.checkinTime || '準時'; }
              else if (attStat === 'late') { color = 'bg-pink-50 text-pink-600 border-pink-200 shadow-sm'; textStatus = d?.checkinTime || '遲到'; }
              else if (attStat === 'sick') { color = 'bg-purple-50 text-purple-700 border-purple-100 shadow-sm'; textStatus = '病假'; }
              else if (attStat === 'personal') { color = 'bg-orange-50 text-orange-700 border-orange-100 shadow-sm'; textStatus = '事假'; }
              return (
                <button key={s.id} disabled={!isPublished} onClick={() => { setSelectedTasks(d?.completedTasks || {}); setActiveStudent(s); }} className={`min-h-[96px] rounded-[1.8rem] flex flex-col items-center justify-center transition-all border-b-8 active:border-b-0 ${color}`}>
                  <span className="text-5xl font-black">{maskName(s.name)}</span>
                  {d?.checkinTime && <span className={`text-2xl font-black mt-1 ${attStat === 'late' ? 'text-pink-700' : (attStat === 'on-time' ? 'text-emerald-500' : '')}`}>{textStatus}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-4 mx-1 cursor-col-resize flex items-center justify-center hover:bg-sky-200 rounded-full group transition-colors shrink-0" onMouseDown={(e) => { const startX = e.clientX; const startW = w1; const move = (ev) => setW1(Math.max(15, Math.min(startW + ((ev.clientX - startX) / window.innerWidth) * 100, 40))); const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); }}><GripVertical className="text-sky-300 group-hover:text-sky-600"/></div>

        <div style={{ width: `${w2}%` }} className="bg-white rounded-[3rem] shadow-sm p-5 flex flex-col border border-sky-50 shrink-0">
          <h2 className="text-3xl font-black mb-6 text-sky-800 flex items-center gap-3 px-2 shrink-0"><LayoutDashboard size={40}/> 今日任務進度</h2>
          <div className="flex flex-col gap-4 flex-1 justify-between">
            {STUDENTS.map(s => {
              const d = attendance[s.id]; const hw = d?.completedTasks || {};
              const comp = prevTasks.filter(t => getFinalTaskStatus(s.id, t.trim(), d) === 'done' || getFinalTaskStatus(s.id, t.trim(), d) === 'late').length;
              const total = prevTasks.length; const isFull = comp === total && total > 0;
              return (
                <div key={s.id} onClick={() => setViewOnlyStudent({ student: s, tasks: hw })} className={`min-h-[48px] flex items-center px-4 rounded-[1.2rem] border transition-all cursor-pointer ${isFull ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                  <span className="text-3xl font-black text-sky-900 w-28 truncate">{maskName(s.name)}</span>
                  <div className="flex-1 h-4 bg-blue-100/50 rounded-full mx-4 overflow-hidden shadow-inner"><div className={`h-full transition-all duration-700 ${isFull ? 'bg-blue-500' : 'bg-blue-400'}`} style={{ width: `${total > 0 ? (comp / total) * 100 : 0}%` }}></div></div>
                  <span className={`text-3xl font-black w-20 text-right ${isFull ? 'text-blue-700' : 'text-slate-500'}`}>{comp}/{total}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-4 mx-1 cursor-col-resize flex items-center justify-center hover:bg-sky-200 rounded-full group transition-colors shrink-0" onMouseDown={(e) => { const startX = e.clientX; const startW = w2; const move = (ev) => setW2(Math.max(15, Math.min(startW + ((ev.clientX - startX) / window.innerWidth) * 100, 40))); const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); }; document.addEventListener('mousemove', move); document.addEventListener('mouseup', up); }}><GripVertical className="text-sky-300 group-hover:text-sky-600"/></div>

        <div className="flex-1 bg-[#0C4A6E] rounded-[3rem] shadow-xl p-8 text-white flex flex-col shrink-0 min-w-0">
          <div className="flex justify-between items-center mb-6 border-b border-white/20 pb-4 shrink-0">
            <h2 className="text-4xl font-black flex items-center gap-4 text-sky-200 drop-shadow-md"><ScrollText size={48}/> 任務發布區</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl shadow-inner">
                <button onClick={() => setUseBiauKai(!useBiauKai)} className={`p-2 rounded-xl transition-all ${useBiauKai ? 'bg-sky-500 text-white' : 'hover:bg-white/20 text-sky-200'}`} title="切換標楷體"><Type size={24}/></button>
                <button onClick={() => setFontSize(f => Math.max(20, f-4))} className="p-2 hover:bg-white/20 rounded-xl transition-all"><Minus/></button>
                <button onClick={() => setFontSize(f => Math.min(100, f+4))} className="p-2 hover:bg-white/20 rounded-xl transition-all"><Plus/></button>
                <button onClick={() => setLineHeight(l => Math.max(0.7, l-0.1))} className="p-2 hover:bg-white/20 rounded-xl transition-all"><ArrowDown/></button>
                <button onClick={() => setLineHeight(l => Math.min(3.0, l+0.1))} className="p-2 hover:bg-white/20 rounded-xl transition-all"><ArrowUp/></button>
              </div>
              {user && <button onClick={() => isEditing ? (setIsEditing(false), setDoc(doc(db, "announcements", formatDate(viewDate)), { items: announcementText.split('\n').filter(Boolean).map(t=>t.trim()), date: formatDate(viewDate) }, {merge:true})) : setIsEditing(true)} className="bg-emerald-500 px-8 py-3 rounded-2xl font-black text-2xl shadow-lg text-white">{isEditing ? '儲存' : '編輯'}</button>}
            </div>
          </div>
          {isEditing && (
            <div className="flex flex-wrap gap-2 mb-4 pr-2 shrink-0">
              {QUICK_TAGS.map(t => <button key={t} onClick={() => setAnnouncementText(p => p ? p + '\n' + t : t)} className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-xl font-bold hover:bg-white/30 transition-all">{t}</button>)}
            </div>
          )}
          <div className="flex-1 bg-black/20 rounded-[2.5rem] p-8 shadow-inner">
            {isEditing ? (
              <textarea value={announcementText} onChange={e => setAnnouncementText(e.target.value)} style={{ fontFamily: useBiauKai ? '"BiauKai", "DFKai-SB", "標楷體", serif' : 'inherit' }} className={`flex-1 bg-transparent text-white outline-none leading-relaxed text-4xl w-full min-h-[400px] ${useBiauKai ? 'font-normal' : 'font-black'}`} />
            ) : (
              <div 
                style={{ 
                  fontFamily: useBiauKai ? '"BiauKai", "DFKai-SB", "標楷體", serif' : 'inherit',
                  fontSize: `${fontSize}px`, 
                  lineHeight: lineHeight 
                }} 
                className={useBiauKai ? 'font-normal tracking-wide' : 'font-black'}
              >
                {displayItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-8 border-b border-white/5 pb-2 mb-2 last:border-0 last:mb-0">
                    <span className="flex-shrink-0 w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-900 text-2xl shadow-lg border-4 border-yellow-200/80 font-black">{i+1}</span>
                    <span className="text-white pt-1 tracking-wide">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <section className="mx-4 mb-12 bg-white rounded-[3rem] p-8 shadow-2xl border-4 border-sky-100 flex flex-col print:hidden">
        <div className="flex justify-between items-center mb-6 px-2"><h3 className="text-4xl font-black text-sky-900 flex items-center gap-5"><Calendar size={48} className="text-sky-600"/> {activeStatMonth} 分析報表</h3></div>
        <div className="overflow-auto rounded-[2rem] border-2 border-sky-50"><table className="w-full text-center border-collapse"><thead className="text-white shadow-md"><tr className="text-2xl font-black"><th className="p-5 bg-sky-950 border-r border-sky-800 sticky left-0 w-48 text-left pl-10">姓名</th><th className="p-5 bg-sky-700 border-r border-sky-600">出席狀況</th><th className="p-5 bg-blue-600">任務繳交 (天數)</th></tr></thead><tbody className="divide-y divide-sky-100">{STUDENTS.map(s => { const sData = monthlyStats[s.id]; return (<tr key={s.id} className="hover:bg-sky-50/50 cursor-pointer group" onClick={() => sData && setViewOnlyStudent({ student: s, isHistory: true })}><td className="p-5 text-3xl font-black text-sky-900 border-r-2 border-sky-50 sticky left-0 bg-white text-left pl-10 group-hover:text-sky-600">{maskName(s.name)}</td><td className="p-5 border-r-2 border-sky-50"><div className="flex justify-center items-center gap-6 text-2xl font-black"><div className="text-emerald-600">準時: {sData ? sData.onTime : '--'}</div><div className="text-pink-500">遲到: {sData ? sData.late : '--'}</div></div></td><td className="p-5"><div className="flex justify-center items-center gap-10 text-2xl font-black"><div className="text-blue-600">齊全: {sData ? sData.fullDoneDays : '--'}</div><div className="text-rose-500">缺交: {sData ? sData.missingDays : '--'}</div></div></td></tr>); })}</tbody></table></div>
      </section>

      {(activeStudent || viewOnlyStudent) && (() => {
        const targetId = activeStudent ? activeStudent.id : viewOnlyStudent.student.id;
        const liveMonthData = monthlyStats[targetId];
        return (
          <div className="fixed inset-0 bg-sky-900/95 backdrop-blur-xl z-[300] flex items-center justify-center p-8">
            <div className="bg-white rounded-[4rem] w-full max-w-[90vw] p-10 shadow-2xl relative flex flex-col max-h-[90vh] border-[12px] border-sky-100/50">
              <div className="flex justify-between items-center mb-6 border-b-4 border-sky-50 pb-6 shrink-0"><h3 className="text-6xl font-black text-sky-900">{maskName(activeStudent?.name || viewOnlyStudent?.student.name)} <span className="text-2xl text-sky-500 font-bold bg-sky-50 px-4 py-2 rounded-full">{viewOnlyStudent?.isHistory ? `${activeStatMonth} 學習歷程` : `任務確認 - ${formatDate(viewDate)}`}</span></h3><button onClick={() => { setActiveStudent(null); setViewOnlyStudent(null); }} className="text-slate-300 hover:text-red-500 transition-all"><XCircle size={64}/></button></div>
              <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                {viewOnlyStudent?.isHistory ? (
                  <div className="space-y-3">{liveMonthData && Object.entries(liveMonthData.dailyRecords).sort((a,b)=>b[0].localeCompare(a[0])).map(([date, rec]) => (<div key={date} className="p-4 bg-slate-50 rounded-3xl border-2 border-slate-100 flex flex-col gap-3 shadow-sm"><div className="flex items-center justify-between border-b-2 border-slate-200 pb-2"><span className="text-4xl font-black text-sky-800">{date}</span>{getStatusDisplay(rec.att, 'att')}</div><div className="flex gap-2 flex-wrap pt-1">{rec.allDone && <span className="text-3xl font-black text-blue-600 flex items-center gap-2"><CheckCircle2 size={32}/> 任務齊全</span>}{rec.missingList.map(m => <span key={m} className="px-4 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-2xl font-bold shadow-sm">{m} (缺交)</span>)}</div></div>))}</div>
                ) : viewOnlyStudent && user ? (
                  <div className="flex flex-col gap-6">
                    <div className="bg-slate-50 rounded-[2rem] p-6 border-2 border-slate-200 flex items-center gap-6"><span className="text-4xl font-black text-slate-700">出席狀態：</span><button onClick={() => cycleManualAtt(targetId)} className="flex items-center gap-3 transition-transform active:scale-95 hover:opacity-80">{getStatusDisplay(getFinalAttStatus(targetId, attendance[targetId]), 'att')}{attendance[targetId]?.manualAtt && <span className="text-xl font-bold text-indigo-500 flex items-center gap-1 bg-indigo-50 px-3 py-1 rounded-full"><Edit3 size={20}/> 手動修改</span>}</button></div>
                    <div className="grid grid-cols-3 gap-4">{prevTasks.map((t, idx) => { const cleanT = t.trim(); const d = attendance[targetId]; const fStat = getFinalTaskStatus(targetId, cleanT, d); return (<div key={idx} className="bg-white border-4 border-slate-100 rounded-[2rem] p-6 flex justify-between items-center shadow-sm hover:border-sky-200 transition-colors"><span className="text-4xl font-black text-slate-800 truncate pr-4">{cleanT}</span><button onClick={() => cycleManualTask(targetId, cleanT)} className="flex items-center gap-3 shrink-0 transition-transform active:scale-95 hover:opacity-80">{getStatusDisplay(fStat, 'task')}{!!d?.manualTasks?.[cleanT] && <span className="text-lg text-indigo-500"><Edit3 size={18}/></span>}</button></div>)})}</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-6">
                    {activeStudent ? prevTasks.map((t, idx) => (<label key={idx} className={`p-6 rounded-[2rem] border-4 flex items-center gap-6 transition-all active:scale-95 cursor-pointer shadow-sm ${selectedTasks[t.trim()] ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-inner' : 'bg-white border-slate-300 text-slate-700'}`}><input type="checkbox" checked={!!selectedTasks[t.trim()]} onChange={(e) => setSelectedTasks({...selectedTasks, [t.trim()]: e.target.checked})} className="w-10 h-10 accent-blue-600" /><span className="text-4xl font-black leading-tight">{t.trim()}</span></label>)) : (
                      <div className="col-span-3 flex flex-col items-center justify-center py-10 w-full h-full">
                        {(() => { const d = attendance[targetId]; const missingTasks = prevTasks.filter(t => getFinalTaskStatus(targetId, t, d) === 'missing'); return missingTasks.length === 0 && prevTasks.length > 0 ? (<div className="flex flex-col items-center gap-6 animate-fade-in my-auto"><Smile size={200} className="text-blue-500 drop-shadow-xl animate-bounce" /><p className="text-6xl font-black text-blue-600 tracking-wider">今日任務已繳交</p></div>) : (<div className="grid grid-cols-3 gap-6 w-full px-4"><div className="col-span-3 border-b-4 border-red-100 pb-4 mb-4 flex items-center gap-4"><XOctagon size={48} className="text-red-600" /><p className="text-5xl font-black text-red-600">目前尚有缺交任務：</p></div>{missingTasks.map((t, idx) => (<div key={idx} className="p-8 bg-red-50 border-[3px] border-red-500 rounded-[2.5rem] flex items-center gap-6 shadow-sm"><span className="text-4xl font-black text-red-700">{t.trim()}</span></div>))}</div>); })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {activeStudent && (<div className="grid grid-cols-3 gap-6 shrink-0 h-28 mt-8 border-t-4 border-slate-50 pt-8"><button onClick={() => submitCheckin('present')} className="bg-sky-500 text-white rounded-[2rem] text-4xl font-black shadow-xl hover:bg-sky-600 active:scale-95">確認打卡</button><button onClick={() => submitCheckin('sick')} className="bg-purple-400 text-white rounded-[2rem] text-4xl font-black hover:bg-purple-500 shadow-md active:scale-95">病假</button><button onClick={() => submitCheckin('personal')} className="bg-orange-400 text-white rounded-[2rem] text-4xl font-black hover:bg-orange-500 shadow-md active:scale-95">事假</button></div>)}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
export default App;
