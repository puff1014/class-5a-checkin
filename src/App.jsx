import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, orderBy, limit, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore';
import { Ship, ScrollText, ChevronLeft, ChevronRight, XCircle, Clock, UserCheck, Plus, Minus, Trash2, LayoutDashboard, Calendar, Trophy, XOctagon, CheckCircle2, Smile, Lock, Unlock, ArrowUp, ArrowDown, Printer, UserMinus, Type, GripVertical, Edit3, AlertTriangle, History } from 'lucide-react';

const APP_VERSION = "V19.0.260223_Ocean_Final";
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
  const [displayItems, setDisplayItems] = useState([]);
  const [announcementText, setAnnouncementText] = useState("");
  const [attendance, setAttendance] = useState({});
  const [activeStudent, setActiveStudent] = useState(null);
  const [viewOnlyStudent, setViewOnlyStudent] = useState(null);
  const [prevTasks, setPrevTasks] = useState([]); // 用於存放「最近一次發布的任務」
  const [selectedTasks, setSelectedTasks] = useState({});
  const [fontSize, setFontSize] = useState(48);
  const [lineHeight, setLineHeight] = useState(1.1);
  const [useBiauKai, setUseBiauKai] = useState(false);
  const [recordedDates, setRecordedDates] = useState([]);
  const [activeStatMonth, setActiveStatMonth] = useState(`${new Date().getMonth() + 1}月`);
  const [monthlyStats, setMonthlyStats] = useState({});
  
  const [w1, setW1] = useState(25);
  const [w2, setW2] = useState(25);

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

    // 抓取最近一次有發布任務的紀錄
    const fetchPrev = async () => {
      const q = query(collection(db, "announcements"), where("date", "<=", dateKey), orderBy("date", "desc"), limit(5));
      const snap = await getDocs(q);
      const validDoc = snap.docs.find(d => d.data().items && d.data().items.length > 0);
      setPrevTasks(validDoc ? validDoc.data().items : []);
    };
    fetchPrev();
  }, [db, viewDate, isEditing]);

  // 此處保留 V18 的核心計算邏輯 (略)，但在 V19 確保 getFinalTaskStatus 引用的是正確的基準
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

  // 修正：任務狀況抓取邏輯
  const getFinalTaskStatus = (id, originalTaskName, attData) => {
    const cleanName = originalTaskName.trim();
    if (attData?.manualTasks?.[cleanName]) return attData.manualTasks[cleanName];
    const hw = attData?.completedTasks || {};
    // 比對學生勾選紀錄中是否存在該任務
    if (!hw[originalTaskName] && !hw[cleanName]) return 'missing';
    if (isAutoTaskLate(id, attData.lastActionTime)) return 'late';
    return 'done';
  };

  // 背景靜默計算每月報表 (V19 對齊打卡任務基準)
  useEffect(() => {
    if (!db || recordedDates.length === 0) return;
    let isMounted = true;
    const fetchMonth = async () => {
      const monthStr = activeStatMonth.replace('月', '').padStart(2, '0');
      const targetDates = recordedDates.filter(d => d.split('-')[1] === monthStr);
      const stats = {};
      STUDENTS.forEach(s => stats[s.id] = { onTime: 0, late: 0, sick: 0, personal: 0, fullDoneDays: 0, lateDays: 0, missingDays: 0, issues: [], dailyRecords: {} });

      for (const dKey of targetDates) {
        const isCurrentView = dKey === formatDate(viewDate);
        let attMap = {};
        let dailyTasks = [];

        // 報表抓取邏輯統一：尋找當天或最近一次的任務發布
        const annSnap = await getDocs(query(collection(db, "announcements"), where("date", "<=", dKey), orderBy("date", "desc"), limit(1)));
        dailyTasks = !annSnap.empty ? annSnap.docs[0].data().items : [];

        if (isCurrentView) {
          attMap = attendance;
        } else {
          const attSnap = await getDocs(collection(db, `attendance_${dKey}`));
          attSnap.forEach(doc => { attMap[doc.id] = doc.data(); });
        }

        STUDENTS.forEach(student => {
          const sid = student.id;
          const d = attMap[sid];
          if (!d) {
             stats[sid].dailyRecords[dKey] = { att: 'absent', missingList: [], lateList: [], allDone: false };
             if (dailyTasks.length > 0) {
               stats[sid].missingDays++;
               dailyTasks.forEach(t => stats[sid].dailyRecords[dKey].missingList.push(t.trim()));
             }
             return;
          }
          const finalAtt = getFinalAttStatus(sid, d);
          if (finalAtt === 'on-time') stats[sid].onTime++;
          else if (finalAtt === 'late') stats[sid].late++;
          else if (finalAtt === 'sick') stats[sid].sick++;
          else if (finalAtt === 'personal') stats[sid].personal++;

          stats[sid].dailyRecords[dKey] = { att: finalAtt, missingList: [], lateList: [], allDone: false };
          if (dailyTasks.length > 0) {
            let missingCount = 0;
            let lateCount = 0;
            dailyTasks.forEach(t => {
              const cleanTask = t.trim();
              const finalTask = getFinalTaskStatus(sid, cleanTask, d);
              if (finalTask === 'missing') {
                missingCount++;
                stats[sid].dailyRecords[dKey].missingList.push(cleanTask);
              } else if (finalTask === 'late') {
                lateCount++;
                stats[sid].dailyRecords[dKey].lateList.push(cleanTask);
              }
            });
            if (missingCount > 0) stats[sid].missingDays++;
            else if (lateCount > 0) stats[sid].lateDays++;
            else { stats[sid].fullDoneDays++; stats[sid].dailyRecords[dKey].allDone = true; }
          }
        });
      }
      if (isMounted) setMonthlyStats(stats);
    };
    fetchMonth();
    return () => { isMounted = false; };
  }, [db, activeStatMonth, recordedDates, attendance, viewDate]);

  const cycleManualAtt = async (studentId) => {
    if (!user) return;
    const dateKey = formatDate(viewDate);
    const d = attendance[studentId] || {};
    const current = d.manualAtt || 'auto';
    const cycle = ['auto', 'on-time', 'late', 'sick', 'personal'];
    const next = cycle[(cycle.indexOf(current) + 1) % cycle.length];
    await setDoc(doc(db, `attendance_${dateKey}`, studentId), { manualAtt: next === 'auto' ? null : next }, { merge: true });
  };

  const cycleManualTask = async (studentId, taskName) => {
    if (!user) return;
    const dateKey = formatDate(viewDate);
    const cleanT = taskName.trim();
    const d = attendance[studentId] || {};
    const currentManualTasks = d.manualTasks || {};
    const currentStatus = currentManualTasks[cleanT] || 'auto';
    const cycle = ['auto', 'done', 'late', 'missing', 'exempt'];
    const nextStatus = cycle[(cycle.indexOf(currentStatus) + 1) % cycle.length];
    const updatedTasks = { ...currentManualTasks };
    if (nextStatus === 'auto') delete updatedTasks[cleanT]; else updatedTasks[cleanT] = nextStatus;
    await setDoc(doc(db, `attendance_${dateKey}`, studentId), { manualTasks: updatedTasks }, { merge: true });
  };

  const getStatusDisplay = (status, type) => {
    if (type === 'att') {
      switch(status) {
        case 'on-time': return <span className="bg-emerald-100 text-emerald-800 px-6 py-2 rounded-xl text-4xl font-black">準時</span>;
        case 'late': return <span className="bg-pink-100 text-pink-800 px-6 py-2 rounded-xl text-4xl font-black">遲到</span>;
        case 'sick': return <span className="bg-purple-100 text-purple-800 px-6 py-2 rounded-xl text-4xl font-black">病假</span>;
        case 'personal': return <span className="bg-orange-100 text-orange-800 px-6 py-2 rounded-xl text-4xl font-black">事假</span>;
        default: return <span className="bg-slate-100 text-slate-500 px-6 py-2 rounded-xl text-4xl font-black">未簽到</span>;
      }
    } else {
      switch(status) {
        case 'done': return <span className="bg-sky-100 text-sky-800 px-4 py-2 rounded-xl border border-sky-300 font-bold">齊全</span>;
        case 'late': return <span className="bg-amber-100 text-amber-800 px-4 py-2 rounded-xl border border-amber-300 font-bold">遲交</span>;
        case 'missing': return <span className="bg-rose-100 text-rose-800 px-4 py-2 rounded-xl border border-rose-300 font-bold">缺交</span>;
        case 'exempt': return <span className="bg-slate-200 text-slate-700 px-4 py-2 rounded-xl border border-slate-400 font-bold">免交</span>;
        default: return <span className="bg-slate-100 text-slate-400 px-4 py-2 rounded-xl">未知</span>;
      }
    }
  };

  const submitCheckin = async (status = 'present') => {
    const dateKey = formatDate(viewDate);
    const nowTime = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    await setDoc(doc(db, `attendance_${dateKey}`, activeStudent.id), {
      name: activeStudent.name, status, completedTasks: selectedTasks, checkinTime: attendance[activeStudent.id]?.checkinTime || nowTime, lastActionTime: nowTime, timestamp: serverTimestamp()
    }, { merge: true });
    setActiveStudent(null);
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex flex-col font-sans select-none overflow-x-hidden">
      <header className="bg-white border-b-2 border-sky-100 shadow-sm sticky top-0 z-[100] print:hidden">
        <div className="px-8 py-4 flex items-center justify-between border-b border-sky-50">
          <div className="flex items-center gap-6">
            <Ship className="w-16 h-16 text-sky-600" />
            <div className="flex items-baseline gap-4">
              <h1 className="text-6xl font-black text-sky-900">五甲航海日誌</h1>
              <span className="text-lg font-bold text-slate-300">Ver {APP_VERSION}</span>
              <button onClick={() => user ? signOut(auth) : signInWithEmailAndPassword(auth, prompt("Email"), prompt("密碼"))} className={`ml-4 px-4 py-2 rounded-xl text-xl font-bold flex items-center gap-2 ${user ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                {user ? <Unlock size={24}/> : <Lock size={24}/>} {user ? '教師模式' : '學生模式'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-10">
            <span className="text-4xl font-bold text-slate-500">{currentTime.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })}</span>
            <span className="text-8xl font-mono font-black text-blue-700 drop-shadow-md">{currentTime.toLocaleTimeString('zh-TW', { hour12: false })}</span>
          </div>
        </div>

        <div className="px-8 py-3 flex items-center justify-between bg-sky-50/40">
          <div className="flex items-center gap-4">
            <span className="font-bold text-sky-700 text-2xl mr-2">航行日：</span>
            {/* V19 新增月份選單 */}
            <select value={activeStatMonth} onChange={(e) => setActiveStatMonth(e.target.value)} className="bg-white border-2 border-sky-200 text-sky-700 rounded-xl px-4 py-1.5 font-black text-xl outline-none shadow-sm cursor-pointer hover:bg-sky-50 transition-colors">
              {["1月", "2月", "3月", "4月", "5月", "6月"].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <div className="flex items-center gap-2 overflow-x-auto max-w-[40vw] scrollbar-hide py-1">
              {recordedDates.filter(d => parseInt(d.split('-')[1]) === parseInt(activeStatMonth)).map(d => (
                <button key={d} onClick={() => setViewDate(new Date(d))}
                  className={`px-6 py-2 rounded-2xl text-2xl font-black transition-all shrink-0 ${formatDate(viewDate) === d ? 'bg-sky-600 text-white shadow-lg scale-105' : 'bg-white text-sky-400 border border-sky-100 hover:bg-sky-50'}`}>
                  {d.split('-')[2]}
                </button>
              ))}
            </div>
          </div>
          
          {user && (
            <div className="flex items-center gap-3">
              <button onClick={() => window.confirm("確定刪除？") && setDoc(doc(db, "announcements", formatDate(viewDate)), { items: [] }, {merge:true})} className="p-3 bg-rose-100 text-rose-600 rounded-2xl"><Trash2 size={32}/></button>
              <div className="flex bg-white p-1.5 rounded-2xl items-center shadow-inner border border-sky-100">
                <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)))} className="p-2"><ChevronLeft size={36}/></button>
                <span className="text-3xl font-black px-6 text-sky-800">{formatDate(viewDate)}</span>
                <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)))} className="p-2"><ChevronRight size={36}/></button>
              </div>
              <button onClick={() => setDoc(doc(db, "announcements", formatDate(viewDate)), { date: formatDate(viewDate), items: displayItems }, {merge:true})} className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><Plus size={32}/></button>
            </div>
          )}
        </div>
      </header>

      <main className="flex flex-col lg:flex-row p-4 gap-2 print:hidden items-stretch pb-12">
        <div style={{ width: `${w1}%` }} className="bg-white rounded-[3rem] shadow-sm p-5 flex flex-col border border-sky-50 shrink-0">
          <h2 className="text-3xl font-black mb-6 text-sky-800 flex items-center gap-3 px-2 shrink-0"><UserCheck size={40}/> 航海員簽到</h2>
          <div className="grid grid-cols-2 gap-4 flex-1">
            {STUDENTS.map(s => {
              const d = attendance[s.id];
              const attStat = getFinalAttStatus(s.id, d);
              return (
                <button key={s.id} onClick={() => { setSelectedTasks(d?.completedTasks || {}); setActiveStudent(s); }} className={`h-24 rounded-[1.8rem] flex flex-col items-center justify-center transition-all border-b-8 active:border-b-0 ${attStat === 'absent' ? 'bg-slate-50 text-slate-300' : 'bg-sky-50 text-sky-600 border-sky-200'}`}>
                  <span className="text-5xl font-black">{maskName(s.name)}</span>
                  {d?.checkinTime && <span className="text-2xl font-black mt-1">{d.checkinTime}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-4 mx-1 cursor-col-resize flex items-center justify-center hover:bg-sky-200 rounded-full transition-colors group shrink-0"
          onMouseDown={(e) => {
            const startX = e.clientX; const startW = w1;
            const move = (ev) => setW1(Math.max(15, Math.min(startW + ((ev.clientX - startX) / window.innerWidth) * 100, 40)));
            const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
            document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
          }}><GripVertical className="text-sky-300 group-hover:text-sky-600"/></div>

        <div style={{ width: `${w2}%` }} className="bg-white rounded-[3rem] shadow-sm p-5 flex flex-col border border-sky-100 shrink-0">
          <h2 className="text-3xl font-black mb-6 text-sky-700 flex items-center gap-3 px-2 shrink-0"><LayoutDashboard size={40}/> 今日任務進度</h2>
          <div className="flex flex-col gap-4 flex-1 justify-between">
            {STUDENTS.map(s => {
              const d = attendance[s.id];
              const comp = displayItems.filter(t => getFinalTaskStatus(s.id, t.trim(), d) === 'done' || getFinalTaskStatus(s.id, t.trim(), d) === 'late').length;
              const total = displayItems.length;
              return (
                <div key={s.id} onClick={() => setViewOnlyStudent({ student: s, tasks: d?.completedTasks || {} })} className="h-12 flex items-center px-4 rounded-[1.2rem] border-2 border-sky-50 hover:border-sky-200 cursor-pointer">
                  <span className="text-3xl font-black text-sky-900 w-28 truncate">{maskName(s.name)}</span>
                  <div className="flex-1 h-5 bg-sky-100/50 rounded-full mx-4 overflow-hidden border border-sky-100/30">
                    <div className="h-full bg-gradient-to-r from-sky-400 to-blue-500 rounded-full transition-all" style={{ width: `${total > 0 ? (comp / total) * 100 : 0}%` }}></div>
                  </div>
                  <span className="text-3xl font-black w-20 text-right text-blue-600">{comp}/{total}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="w-4 mx-1 cursor-col-resize flex items-center justify-center hover:bg-sky-200 rounded-full transition-colors group shrink-0"
          onMouseDown={(e) => {
            const startX = e.clientX; const startW = w2;
            const move = (ev) => setW2(Math.max(15, Math.min(startW + ((ev.clientX - startX) / window.innerWidth) * 100, 40)));
            const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
            document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
          }}><GripVertical className="text-sky-300 group-hover:text-sky-600"/></div>

        <div className="flex-1 bg-[#0C4A6E] rounded-[3rem] shadow-xl p-8 text-white flex flex-col shrink-0 min-w-0">
          <div className="flex justify-between items-center mb-6 border-b border-white/20 pb-4 shrink-0">
            <h2 className="text-4xl font-black flex items-center gap-4 text-sky-200"><ScrollText size={48}/> 任務發布區</h2>
            {user && <button onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)} className="bg-emerald-500 px-8 py-3 rounded-2xl font-black text-2xl text-white">{isEditing ? '儲存' : '編輯'}</button>}
          </div>
          <div className="flex-1 bg-black/20 rounded-[2.5rem] p-8">
            {isEditing ? (
              <textarea value={announcementText} onChange={e => setAnnouncementText(e.target.value)} className="w-full h-full bg-transparent text-white outline-none text-4xl font-black leading-relaxed" />
            ) : (
              <div className="space-y-4">
                {displayItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-8 border-b border-white/5 pb-2 text-4xl font-black">
                    <span className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-900 text-2xl">{i+1}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 彈窗：打卡任務 (V19 三欄呈現 + 自動抓取前日任務) */}
      {activeStudent && (
        <div className="fixed inset-0 bg-sky-900/95 backdrop-blur-xl z-[300] flex items-center justify-center p-8">
          <div className="bg-white rounded-[4rem] w-full max-w-[90vw] p-10 shadow-2xl relative flex flex-col max-h-[90vh] border-[12px] border-sky-100/50">
            <div className="flex justify-between items-center mb-6 border-b-4 pb-6">
              <h3 className="text-6xl font-black text-sky-900">{maskName(activeStudent.name)} <span className="text-2xl text-sky-500">打卡簽到</span></h3>
              <button onClick={() => setActiveStudent(null)} className="text-slate-300 hover:text-red-500"><XCircle size={64}/></button>
            </div>
            <div className="flex-1 overflow-y-auto pr-4">
              <p className="text-2xl text-slate-400 mb-6 font-bold flex items-center gap-2">● 請勾選已完成的任務 (基準日：最近任務日)</p>
              {/* 三欄呈現關鍵點：grid-cols-3 */}
              <div className="grid grid-cols-3 gap-6">
                {prevTasks.map((t, idx) => {
                  const cleanT = t.trim();
                  return (
                    <label key={idx} className={`p-6 rounded-[2rem] border-4 flex items-center gap-6 cursor-pointer transition-all ${selectedTasks[cleanT] ? 'bg-cyan-50 border-cyan-500' : 'bg-white border-slate-200'}`}>
                      <input type="checkbox" checked={!!selectedTasks[cleanT]} onChange={(e) => setSelectedTasks({...selectedTasks, [cleanT]: e.target.checked})} className="w-10 h-10 accent-cyan-600" />
                      <span className="text-4xl font-black">{cleanT}</span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 mt-8 h-28">
              <button onClick={() => submitCheckin('present')} className="bg-sky-500 text-white rounded-[2rem] text-4xl font-black">確認打卡</button>
              <button onClick={() => submitCheckin('sick')} className="bg-purple-400 text-white rounded-[2rem] text-4xl font-black">病假</button>
              <button onClick={() => submitCheckin('personal')} className="bg-orange-400 text-white rounded-[2rem] text-4xl font-black">事假</button>
            </div>
          </div>
        </div>
      )}
      
      {/* 歷史視窗 (邏輯對齊) 略 */}
    </div>
  );
};

export default App;
