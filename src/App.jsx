import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, orderBy, limit, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore';
import { Ship, ScrollText, ChevronLeft, ChevronRight, XCircle, Clock, UserCheck, Plus, Minus, Trash2, LayoutDashboard, Calendar, Trophy, AlertTriangle, XOctagon, CheckCircle2, Ghost, Smile, Lock, Unlock, ArrowsUpFromLine, ArrowsDownFromLine, Printer } from 'lucide-react';

const APP_VERSION = "v14.5.260222_Final_Stable";

const firebaseConfig = {
  apiKey: "AIzaSyArwz6gPeW9lNq_8LOfnKYwZmkRN-Wgtb8",
  authDomain: "class-5a-app.firebaseapp.com",
  projectId: "class-5a-app",
  storageBucket: "class-5a-app.firebasestorage.app",
  messagingSenderId: "828328241350",
  appId: "1:828328241350:web:5d39d529209f87a2540fc7"
};

const STUDENTS = [
  { id: '1', name: '陳昕佑' }, { id: '2', name: '徐偉綸' }, { id: '3', name: '蕭淵群' }, 
  { id: '4', name: '吳秉晏' }, { id: '5', name: '呂秉蔚' }, { id: '6', name: '吳家昇' },
  { id: '7', name: '翁芷儀' }, { id: '8', name: '鄭筱妍' }, { id: '9', name: '周筱涵' }, { id: '10', name: '李婕妤' }
];

const SPECIAL_IDS = ['5', '7', '8'];
const QUICK_TAGS = ["預習數課", "數習", "數八", "背成+小+寫", "國甲", "國乙", "國丙", "閱讀A", "閱讀B", "國預習單", "朗讀", "解釋單", "國練卷", "符號本", "帶學用品", "訂正功課"];

const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const maskName = (name) => name ? name[0] + "O" + (name[2] || "") : "";

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
  const [recordedDates, setRecordedDates] = useState([]);
  const [activeStatMonth, setActiveStatMonth] = useState(`${new Date().getMonth() + 1}月`);
  const [monthlyData, setMonthlyData] = useState({});

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

    const fetchPrev = async () => {
      const q = query(collection(db, "announcements"), where("date", "<", dateKey), orderBy("date", "desc"), limit(1));
      const snap = await getDocs(q);
      setPrevTasks(!snap.empty ? snap.docs[0].data().items : []);
    };
    fetchPrev();
  }, [db, viewDate, isEditing]);

  // 月份數據統計引擎
  useEffect(() => {
    if (!db) return;
    const fetchMonthlyStats = async () => {
      const monthPrefix = `2026-${activeStatMonth.replace('月', '').padStart(2, '0')}`;
      const targetDates = recordedDates.filter(d => d.startsWith(monthPrefix));
      const stats = {};

      for (const dKey of targetDates) {
        const annDoc = await getDocs(query(collection(db, "announcements"), where("date", "==", dKey)));
        const dailyTasks = !annDoc.empty ? annDoc.docs[0].data().items : [];
        const attDocs = await getDocs(collection(db, `attendance_${dKey}`));
        
        attDocs.forEach(doc => {
          if (!stats[doc.id]) stats[doc.id] = { attendance: [], taskHistory: {} };
          const d = doc.data();
          stats[doc.id].attendance.push({ date: dKey, time: d.checkinTime, status: d.status });
          stats[doc.id].taskHistory[dKey] = {
            done: d.completedTasks || {},
            total: dailyTasks,
            lastAction: d.lastActionTime
          };
        });
      }
      setMonthlyData(stats);
    };
    fetchMonthlyStats();
  }, [db, activeStatMonth, recordedDates, attendance]);

  const getAttStatus = (id, time) => {
    if (!time) return 'absent';
    const [h, m, s] = time.split(':').map(Number);
    const totalS = h * 3600 + m * 60 + (s || 0);
    const isSpecial = SPECIAL_IDS.includes(id);
    if (isSpecial) return totalS <= 8 * 3600 + 10 * 60 ? 'on-time' : 'late';
    return totalS <= 7 * 3600 + 39 * 60 + 59 ? 'on-time' : 'late';
  };

  const isTaskLate = (id, actionTime) => {
    if (!actionTime) return false;
    const [h, m, s] = actionTime.split(':').map(Number);
    const totalS = h * 3600 + m * 60 + (s || 0);
    const isSpecial = SPECIAL_IDS.includes(id);
    if (isSpecial) return totalS > 8 * 3600 + 15 * 60;
    return totalS >= 7 * 3600 + 40 * 1;
  };

  const submitCheckin = async (status = 'present') => {
    const dateKey = formatDate(viewDate);
    const nowTime = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    await setDoc(doc(db, `attendance_${dateKey}`, activeStudent.id), {
      name: activeStudent.name,
      status,
      completedTasks: selectedTasks,
      checkinTime: attendance[activeStudent.id]?.checkinTime || nowTime,
      lastActionTime: nowTime,
      timestamp: serverTimestamp()
    }, { merge: true });
    setActiveStudent(null);
  };

  const isDatePublished = recordedDates.includes(formatDate(viewDate));

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex flex-col font-sans select-none overflow-x-hidden print:bg-white">
      {/* 頂部 Header */}
      <header className="bg-white border-b-2 border-sky-100 shadow-sm sticky top-0 z-[100] print:hidden">
        <div className="px-8 py-4 flex items-center justify-between border-b border-sky-50">
          <div className="flex items-center gap-6">
            <Ship className="w-16 h-16 text-sky-600" />
            <div className="flex items-baseline gap-4">
              <h1 className="text-6xl font-black text-sky-900 leading-none">五甲航海日誌</h1>
              <span className="text-lg font-bold text-slate-300">Ver {APP_VERSION}</span>
              <button onClick={() => user ? signOut(auth) : signInWithEmailAndPassword(auth, prompt("Email"), prompt("密碼"))} 
                className={`ml-4 px-4 py-2 rounded-xl text-xl font-bold flex items-center gap-2 ${user ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
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
            <select value={activeStatMonth} onChange={(e) => setActiveStatMonth(e.target.value)} className="bg-white border-2 border-sky-200 text-sky-700 rounded-2xl px-5 py-2.5 font-black text-2xl outline-none shadow-sm">
              {["2月", "3月", "4月", "5月", "6月", "7月"].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <div className="flex items-center gap-2 overflow-x-auto max-w-[50vw] scrollbar-hide py-1">
              {recordedDates.filter(d => parseInt(d.split('-')[1]) === parseInt(activeStatMonth)).map(d => (
                <button key={d} onClick={() => setViewDate(new Date(d))} className={`px-6 py-2 rounded-2xl text-2xl font-black transition-all shrink-0 ${formatDate(viewDate) === d ? 'bg-sky-600 text-white shadow-lg scale-105' : 'bg-white text-sky-400 border border-sky-100 hover:bg-sky-50'}`}>
                  {d.split('-')[2]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="flex bg-white p-1.5 rounded-2xl items-center shadow-inner border border-sky-100">
                <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)))} className="p-2 hover:bg-sky-50 rounded-xl transition-all"><ChevronLeft size={36}/></button>
                <span className="text-3xl font-black px-6 text-sky-800">{formatDate(viewDate)}</span>
                <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)))} className="p-2 hover:bg-sky-50 rounded-xl transition-all"><ChevronRight size={36}/></button>
              </div>
            )}
            {user && <button onClick={() => setDoc(doc(db, "announcements", formatDate(viewDate)), { date: formatDate(viewDate), items: displayItems }, {merge:true})} className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"><Plus size={32}/></button>}
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-4 gap-0 print:hidden">
        {/* 簽到區 - 上下留白加大 */}
        <div className="w-[25%] bg-white rounded-[3rem] shadow-sm p-4 flex flex-col border border-sky-50 overflow-hidden">
          <h2 className="text-3xl font-black mb-4 text-sky-800 flex items-center gap-3 px-2"><UserCheck size={40}/> 航海員簽到</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {STUDENTS.map(s => {
              const d = attendance[s.id];
              const attStat = getAttStatus(s.id, d?.checkinTime);
              const color = !isDatePublished ? 'bg-slate-200 text-slate-400 opacity-50' : d?.status === 'present' ? (attStat === 'late' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm') : d?.status ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-slate-50 text-slate-300 border-slate-100';
              return (
                <button key={s.id} disabled={!isDatePublished} onClick={() => { setSelectedTasks(d?.completedTasks || {}); setActiveStudent(s); }} className={`h-24 rounded-[1.8rem] flex flex-col items-center justify-center transition-all border-b-8 active:border-b-0 active:translate-y-2 ${color}`}>
                  <span className="text-5xl font-black">{maskName(s.name)}</span>
                  {d?.checkinTime && <span className={`text-2xl font-black ${attStat === 'late' ? 'text-red-500' : 'text-emerald-500'}`}>{d.checkinTime}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 進度區 */}
        <div className="w-[25%] bg-white rounded-[3rem] shadow-sm p-4 flex flex-col border border-sky-50 overflow-hidden mx-4">
          <h2 className="text-3xl font-black mb-4 text-sky-800 flex items-center gap-3 px-2"><LayoutDashboard size={40}/> 今日任務進度</h2>
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3">
            {STUDENTS.map(s => {
              const hw = attendance[s.id]?.completedTasks || {};
              const comp = Object.values(hw).filter(v => v).length;
              const total = prevTasks.length;
              const isFull = comp === total && total > 0;
              return (
                <div key={s.id} onClick={() => setViewOnlyStudent({ student: s, tasks: hw })} className={`flex items-center p-3 rounded-[1.5rem] border transition-all cursor-pointer ${isFull ? 'bg-emerald-50 border-emerald-200' : 'bg-sky-50/30 border-sky-100 hover:bg-sky-100'}`}>
                  <span className="text-3xl font-black text-sky-900 w-32 truncate">{maskName(s.name)}</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded-full mx-4 overflow-hidden border border-slate-200 shadow-inner">
                    <div className="h-full bg-sky-500 transition-all duration-700" style={{ width: `${total > 0 ? (comp / total) * 100 : 0}%` }}></div>
                  </div>
                  <span className="text-3xl font-black text-sky-600 w-24 text-right">{comp}/{total}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 任務發布區 - 緊湊排列與行高控制 */}
        <div className="flex-1 bg-[#0C4A6E] rounded-[3rem] shadow-xl p-8 text-white flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-4 border-b border-white/20 pb-4">
            <h2 className="text-4xl font-black flex items-center gap-4 text-sky-300"><ScrollText size={48}/> 任務發布區</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl">
                <button onClick={() => setFontSize(f => Math.max(20, f-4))} className="p-2 hover:bg-white/20 rounded-xl"><Minus/></button>
                <button onClick={() => setFontSize(f => Math.min(100, f+4))} className="p-2 hover:bg-white/20 rounded-xl"><Plus/></button>
                <div className="w-px h-6 bg-white/20 mx-2" />
                <button onClick={() => setLineHeight(l => Math.max(0.7, l-0.1))} className="p-2 hover:bg-white/20 rounded-xl"><ArrowsDownFromLine size={24}/></button>
                <button onClick={() => setLineHeight(l => Math.min(3.0, l+0.1))} className="p-2 hover:bg-white/20 rounded-xl"><ArrowsUpFromLine size={24}/></button>
              </div>
              {user && <button onClick={() => isEditing ? (setIsEditing(false), setDoc(doc(db, "announcements", formatDate(viewDate)), { items: announcementText.split('\n'), date: formatDate(viewDate) }, {merge:true})) : setIsEditing(true)} className="bg-emerald-500 px-8 py-3 rounded-2xl font-black text-2xl shadow-lg transition-transform active:scale-95">編輯</button>}
            </div>
          </div>
          {isEditing && (
            <div className="flex flex-wrap gap-2 mb-4 animate-fade-in max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
              {QUICK_TAGS.map(t => <button key={t} onClick={() => setAnnouncementText(p => p ? p + '\n' + t : t)} className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-xl font-bold hover:bg-white/30 transition-all">{t}</button>)}
            </div>
          )}
          <div className="flex-1 bg-black/20 rounded-[2.5rem] p-8 overflow-y-auto custom-scrollbar border border-white/5 shadow-inner">
            {isEditing ? (
              <textarea value={announcementText} onChange={e => setAnnouncementText(e.target.value)} className="flex-1 bg-transparent text-white font-black outline-none leading-relaxed text-4xl w-full h-full" />
            ) : (
              <div className="font-black" style={{ fontSize: `${fontSize}px`, lineHeight: lineHeight }}>
                {displayItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-8 border-b border-white/5 pb-1 last:border-0">
                    <span className="flex-shrink-0 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg border-4 border-orange-200/50">{i+1}</span>
                    <span className="text-white drop-shadow-sm pt-1">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 每月分析報表 - 空間壓縮 */}
      <section className="mx-4 mb-10 bg-white rounded-[3rem] p-6 shadow-2xl border-4 border-sky-100 max-h-[75vh] overflow-hidden flex flex-col shrink-0 print:hidden">
        <div className="flex justify-between items-center mb-2 px-2">
          <h3 className="text-5xl font-black text-sky-900 flex items-center gap-5"><Calendar size={56} className="text-sky-600"/> 每月分析報表</h3>
          <div className="flex gap-4 items-center">
            {user && <button onClick={() => window.print()} className="flex items-center gap-3 bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-2xl hover:bg-indigo-500 shadow-xl transition-all"><Printer size={32}/> 產生本月報表</button>}
            <div className="flex gap-2 bg-sky-50 p-1.5 rounded-3xl">
              {["2月", "3月", "4月", "5月", "6月", "7月"].map(m => <button key={m} onClick={() => setActiveStatMonth(m)} className={`px-12 py-2.5 rounded-2xl text-2xl font-black transition-all ${activeStatMonth === m ? 'bg-sky-600 text-white shadow-xl scale-105' : 'text-slate-400 hover:bg-white'}`}>{m}</button>)}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto rounded-[2rem] border-2 border-sky-50 relative custom-scrollbar mt-2">
          <table className="w-full text-center table-fixed border-collapse">
            <thead className="sticky top-0 z-40 bg-sky-700 text-white shadow-md">
              <tr className="text-3xl font-black"><th className="p-6 bg-sky-800 border-r border-sky-600 sticky left-0 z-50 w-80 text-left pl-12">姓名</th><th className="p-6 bg-cyan-600 border-r border-sky-500">出席狀況</th><th className="p-6 bg-indigo-600">作業繳交狀況</th></tr>
            </thead>
            <tbody className="divide-y divide-sky-100">
              {STUDENTS.map(s => {
                const sData = monthlyData[s.id] || { attendance: [], taskHistory: {} };
                const onTime = sData.attendance.filter(a => getAttStatus(s.id, a.time) === 'on-time').length;
                const late = sData.attendance.filter(a => getAttStatus(s.id, a.time) === 'late').length;
                const fullCount = Object.values(sData.taskHistory).filter(t => t.total.length > 0 && t.total.every(tk => t.done[tk])).length;
                return (
                  <tr key={s.id} className="hover:bg-sky-50/50 transition-colors cursor-pointer" onClick={() => setViewOnlyStudent({ student: s, fullHistory: sData })}>
                    <td className="p-6 text-5xl font-black text-sky-900 border-r-2 border-sky-50 sticky left-0 z-10 bg-white whitespace-nowrap text-left pl-12">{maskName(s.name)}</td>
                    <td className="p-6 border-r-2 border-sky-50">
                      <div className="flex justify-center items-center gap-10 text-4xl font-black">
                        <div className="flex items-center gap-3 text-emerald-600"><CheckCircle2 size={48}/> 準時: {onTime}</div>
                        <div className="flex items-center gap-3 text-red-500"><Clock size={48}/> 遲到: {late}</div>
                      </div>
                    </td>
                    <td className="p-6 text-sky-600 text-4xl font-black"><Trophy size={48} className="inline mr-3"/> 齊全: {fullCount} 天</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Popups系統 */}
      {(activeStudent || viewOnlyStudent) && (
        <div className="fixed inset-0 bg-sky-900/95 backdrop-blur-xl z-[300] flex items-center justify-center p-8 print:hidden">
          <div className="bg-white rounded-[4rem] w-full max-w-[95vw] p-12 shadow-2xl relative flex flex-col max-h-[92vh] border-[12px] border-sky-100/50">
            <div className="flex justify-between items-center mb-8 border-b-4 border-sky-50 pb-8">
              <h3 className="text-7xl font-black text-sky-900 leading-none">
                {maskName(activeStudent?.name || viewOnlyStudent?.student.name)} 
                <span className="text-2xl text-sky-300 ml-8 font-bold">{viewOnlyStudent?.fullHistory ? '個人每月學習歷程' : `任務確認 - ${formatDate(viewDate)}`}</span>
              </h3>
              <button onClick={() => { setActiveStudent(null); setViewOnlyStudent(null); }} className="text-slate-300 hover:text-red-500 transform transition-all hover:rotate-90"><XCircle size={84}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar mb-8">
              {viewOnlyStudent?.fullHistory ? (
                <div className="space-y-6">
                  {Object.entries(viewOnlyStudent.fullHistory.taskHistory).sort((a,b) => b[0].localeCompare(a[0])).map(([date, tData]) => {
                    const att = viewOnlyStudent.fullHistory.attendance.find(a => a.date === date);
                    const isAttOnTime = getAttStatus(viewOnlyStudent.student.id, att?.time) === 'on-time';
                    const missing = tData.total.filter(tk => !tData.done[tk]);
                    const lateTasks = tData.total.filter(tk => tData.done[tk] && isTaskLate(viewOnlyStudent.student.id, tData.lastAction));
                    return (
                      <div key={date} className="p-8 bg-sky-50/50 rounded-[3rem] border-2 border-sky-100 flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                          <span className="text-4xl font-black text-sky-800">{date}</span>
                          <span className={`text-4xl font-black ${isAttOnTime ? 'text-emerald-500' : 'text-red-500'}`}>
                            {att?.time || '未簽到'} ({isAttOnTime ? '準時' : '遲到'})
                          </span>
                        </div>
                        <div className="flex gap-4 flex-wrap">
                          {missing.length === 0 && lateTasks.length === 0 && <span className="text-3xl font-black text-sky-600">✓ 今日交齊</span>}
                          {missing.map(m => <span key={m} className="px-6 py-2 bg-rose-50 text-rose-500 border-2 border-rose-100 rounded-2xl text-2xl font-black">{m} (缺交)</span>)}
                          {lateTasks.map(l => <span key={l} className="px-6 py-2 bg-orange-50 text-orange-500 border-2 border-orange-100 rounded-2xl text-2xl font-black">{l} (遲交)</span>)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-8">
                  {activeStudent ? prevTasks.map((t, idx) => (
                    <label key={idx} className={`p-8 rounded-[2.5rem] border-8 flex items-center gap-8 transition-all active:scale-95 cursor-pointer shadow-lg ${selectedTasks[t] ? 'bg-sky-50 border-sky-500' : 'bg-slate-50 border-slate-200'}`}>
                      <input type="checkbox" checked={!!selectedTasks[t]} onChange={(e) => setSelectedTasks({...selectedTasks, [t]: e.target.checked})} className="w-12 h-12 accent-sky-600" />
                      <span className="text-5xl font-black text-sky-900 leading-tight">{t}</span>
                    </label>
                  )) : (
                    <div className="col-span-3 flex flex-col items-center justify-center gap-12 py-12">
                      {prevTasks.length > 0 && prevTasks.every(t => viewOnlyStudent.tasks[t]) ? (
                        <div className="flex flex-col items-center gap-8"><Smile size={220} className="text-emerald-500 animate-bounce" /><p className="text-8xl font-black text-emerald-600">今日任務已繳交 😊</p></div>
                      ) : (
                        <div className="grid grid-cols-3 gap-6 w-full px-6">
                          <p className="col-span-3 text-5xl font-black text-red-500 mb-4">目前尚有缺交任務：</p>
                          {prevTasks.filter(t => !viewOnlyStudent.tasks[t]).map((t, idx) => (
                            <div key={idx} className="p-10 bg-red-50 border-8 border-red-100 rounded-[3rem] flex items-center gap-8"><XOctagon size={64} className="text-red-500" /><span className="text-6xl font-black text-red-700">{t}</span></div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {activeStudent && (
              <div className="grid grid-cols-3 gap-8 shrink-0 h-32">
                <button onClick={() => submitCheckin('present')} className="bg-sky-600 text-white rounded-[2.5rem] text-5xl font-black shadow-2xl hover:bg-sky-500 transition-all">確認打卡</button>
                <button onClick={() => submitCheckin('sick')} className="bg-red-100 text-red-600 rounded-[2.5rem] text-5xl font-black">病假</button>
                <button onClick={() => submitCheckin('personal')} className="bg-orange-100 text-orange-600 rounded-[2.5rem] text-5xl font-black">事假</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 列印用區域 (A4 兩欄式) */}
      <div className="hidden print:block p-8">
        <h1 className="text-center text-4xl font-bold mb-10">五年甲班 {activeStatMonth} 學生表現統計表</h1>
        <div className="grid grid-cols-2 gap-8">
          {STUDENTS.map(s => {
            const sd = monthlyData[s.id] || { attendance: [], taskHistory: {} };
            const ot = sd.attendance.filter(a => getAttStatus(s.id, a.time) === 'on-time').length;
            const lt = sd.attendance.filter(a => getAttStatus(s.id, a.time) === 'late').length;
            const ab = sd.attendance.filter(a => a.status !== 'present').length;
            const ft = Object.values(sd.taskHistory).filter(t => t.total.length > 0 && t.total.every(tk => t.done[tk])).length;
            
            const issues = [];
            Object.entries(sd.taskHistory).forEach(([date, t]) => {
              t.total.forEach(tk => {
                const dayStr = date.split('-').slice(1).join('/');
                if (!t.done[tk]) issues.push(`${dayStr}：${tk} (缺交)`);
                else if (isTaskLate(s.id, t.lastAction)) issues.push(`${dayStr}：${tk} (遲交)`);
              });
            });

            return (
              <div key={s.id} className="border-2 border-slate-400 p-6 rounded-xl break-inside-avoid">
                <h3 className="text-2xl font-bold border-b-2 pb-2 mb-4">五年甲班 {s.name} {activeStatMonth} 生活與學習表現</h3>
                <div className="space-y-1 mb-4 text-lg">
                  <p>● 出席紀錄：準時 {ot} 天、遲到 {lt} 天、假別 {ab} 天。</p>
                  <p>● 作業繳交紀錄：準時繳交 {ft} 天。</p>
                </div>
                <div className="text-sm">
                  <p className="font-bold mb-1">● 需補交/補正任務：</p>
                  <div className="pl-4 space-y-1">
                    {issues.length > 0 ? issues.map((iss, i) => <p key={i}>· {iss}</p>) : <p className="text-slate-400">目前各項任務皆已齊全</p>}
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
