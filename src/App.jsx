import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, orderBy, limit, serverTimestamp, getDocs } from 'firebase/firestore';
import { Ship, ScrollText, ChevronLeft, ChevronRight, XCircle, Clock, UserCheck, Plus, Minus, Trash2, LayoutDashboard, Calendar, Trophy, XOctagon, CheckCircle2, Ghost, Smile, Lock, Unlock, ArrowsUpFromLine, ArrowsDownFromLine, Printer } from 'lucide-react';

const APP_VERSION = "v14.5.260222_Core_Stability";
const firebaseConfig = { apiKey: "AIzaSyArwz6gPeW9lNq_8LOfnKYwZmkRN-Wgtb8", authDomain: "class-5a-app.firebaseapp.com", projectId: "class-5a-app", storageBucket: "class-5a-app.firebasestorage.app", messagingSenderId: "828328241350", appId: "1:828328241350:web:5d39d529209f87a2540fc7" };
const STUDENTS = [{ id: '1', name: '陳昕佑' }, { id: '2', name: '徐偉綸' }, { id: '3', name: '蕭淵群' }, { id: '4', name: '吳秉晏' }, { id: '5', name: '呂秉蔚' }, { id: '6', name: '吳家昇' }, { id: '7', name: '翁芷儀' }, { id: '8', name: '鄭筱妍' }, { id: '9', name: '周筱涵' }, { id: '10', name: '李婕妤' }];
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
  const [monthlyStats, setMonthlyStats] = useState({});

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

  // 主視窗數據監聽
  useEffect(() => {
    if (!db) return;
    const dateKey = formatDate(viewDate);
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

  // 每月統計輕量化邏輯
  useEffect(() => {
    if (!db) return;
    const fetchMonth = async () => {
      const monthPrefix = `2026-${activeStatMonth.replace('月', '').padStart(2, '0')}`;
      const targetDates = recordedDates.filter(d => d.startsWith(monthPrefix));
      const stats = {};
      for (const dKey of targetDates) {
        const attDocs = await getDocs(collection(db, `attendance_${dKey}`));
        attDocs.forEach(doc => {
          if (!stats[doc.id]) stats[doc.id] = { onTime: 0, late: 0, fullDone: 0 };
          const d = doc.data();
          const status = getAttStatus(doc.id, d.checkinTime);
          if (status === 'on-time') stats[doc.id].onTime++;
          else if (status === 'late') stats[doc.id].late++;
        });
      }
      setMonthlyStats(stats);
    };
    fetchMonth();
  }, [db, activeStatMonth, recordedDates, attendance]);

  const getAttStatus = (id, time) => {
    if (!time) return 'none';
    const [h, m, s] = time.split(':').map(Number);
    const totalS = h * 3600 + m * 60 + (s || 0);
    const isSpecial = SPECIAL_IDS.includes(id);
    if (isSpecial) return totalS <= 8 * 3600 + 10 * 60 ? 'on-time' : 'late';
    return totalS <= 7 * 3600 + 39 * 60 + 59 ? 'on-time' : 'late';
  };

  const submitCheckin = async (status = 'present') => {
    const dateKey = formatDate(viewDate);
    const nowTime = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    await setDoc(doc(db, `attendance_${dateKey}`, activeStudent.id), {
      name: activeStudent.name, status, completedTasks: selectedTasks, checkinTime: attendance[activeStudent.id]?.checkinTime || nowTime, lastActionTime: nowTime, timestamp: serverTimestamp()
    }, { merge: true });
    setActiveStudent(null);
  };

  const isPublished = recordedDates.includes(formatDate(viewDate));

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex flex-col font-sans select-none overflow-x-hidden">
      <header className="bg-white border-b-2 border-sky-100 shadow-sm sticky top-0 z-[100]">
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
            <span className="text-8xl font-mono font-black text-blue-700">{currentTime.toLocaleTimeString('zh-TW', { hour12: false })}</span>
          </div>
        </div>

        <div className="px-8 py-3 flex items-center justify-between bg-sky-50/40">
          <div className="flex items-center gap-4">
            <select value={activeStatMonth} onChange={(e) => setActiveStatMonth(e.target.value)} className="bg-white border-2 border-sky-200 text-sky-700 rounded-2xl px-5 py-2.5 font-black text-2xl outline-none">
              {["2月", "3月", "4月", "5月", "6月", "7月"].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <div className="flex items-center gap-2 overflow-x-auto max-w-[50vw] scrollbar-hide py-1">
              {recordedDates.filter(d => parseInt(d.split('-')[1]) === parseInt(activeStatMonth)).map(d => (
                <button key={d} onClick={() => setViewDate(new Date(d))} className={`px-6 py-2 rounded-2xl text-2xl font-black transition-all shrink-0 ${formatDate(viewDate) === d ? 'bg-sky-600 text-white shadow-lg' : 'bg-white text-sky-400 border border-sky-100'}`}>
                  {d.split('-')[2]}
                </button>
              ))}
            </div>
          </div>
          {user && (
            <div className="flex bg-white p-1.5 rounded-2xl items-center shadow-inner border border-sky-100">
              <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)))} className="p-2"><ChevronLeft size={36}/></button>
              <span className="text-3xl font-black px-6 text-sky-800">{formatDate(viewDate)}</span>
              <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)))} className="p-2"><ChevronRight size={36}/></button>
              <button onClick={() => setDoc(doc(db, "announcements", formatDate(viewDate)), { date: formatDate(viewDate), items: displayItems }, {merge:true})} className="ml-4 p-2 bg-emerald-100 text-emerald-600 rounded-xl"><Plus/></button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex p-4 gap-4 overflow-hidden">
        {/* 簽到區 - 間距優化 */}
        <div className="w-[25%] bg-white rounded-[3rem] p-4 flex flex-col border border-sky-50 overflow-hidden shadow-sm">
          <h2 className="text-3xl font-black mb-4 text-sky-800 flex items-center gap-3"><UserCheck size={40}/> 航海員簽到</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 flex-1 overflow-y-auto pr-1">
            {STUDENTS.map(s => {
              const d = attendance[s.id];
              const status = getAttStatus(s.id, d?.checkinTime);
              const color = !isPublished ? 'bg-slate-100 text-slate-300' : d?.status === 'present' ? (status === 'late' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200') : d?.status ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-300';
              return (
                <button key={s.id} disabled={!isPublished} onClick={() => { setSelectedTasks(d?.completedTasks || {}); setActiveStudent(s); }} className={`h-24 rounded-[1.8rem] flex flex-col items-center justify-center transition-all border-b-8 active:border-b-0 ${color}`}>
                  <span className="text-5xl font-black">{maskName(s.name)}</span>
                  {d?.checkinTime && <span className={`text-2xl font-black ${status === 'late' ? 'text-red-500' : 'text-emerald-500'}`}>{d.checkinTime}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 進度區 */}
        <div className="w-[25%] bg-white rounded-[3rem] p-4 flex flex-col border border-sky-50 overflow-hidden shadow-sm">
          <h2 className="text-3xl font-black mb-4 text-sky-800 flex items-center gap-3"><LayoutDashboard size={40}/> 今日任務進度</h2>
          <div className="space-y-3 pr-1 overflow-y-auto">
            {STUDENTS.map(s => {
              const hw = attendance[s.id]?.completedTasks || {};
              const comp = Object.values(hw).filter(v => v).length;
              const total = prevTasks.length;
              return (
                <div key={s.id} onClick={() => setViewOnlyStudent({ student: s, tasks: hw })} className="flex items-center p-3 bg-sky-50/30 rounded-[1.5rem] border border-sky-100 cursor-pointer">
                  <span className="text-3xl font-black text-sky-900 w-32 truncate">{maskName(s.name)}</span>
                  <div className="flex-1 h-5 bg-slate-100 rounded-full mx-4 overflow-hidden"><div className="h-full bg-sky-500 transition-all" style={{ width: `${total > 0 ? (comp / total) * 100 : 0}%` }}></div></div>
                  <span className="text-3xl font-black text-sky-600 w-20 text-right">{comp}/{total}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 任務區 */}
        <div className="flex-1 bg-[#0C4A6E] rounded-[3rem] p-8 text-white flex flex-col overflow-hidden shadow-xl">
          <div className="flex justify-between items-center mb-4 border-b border-white/20 pb-4">
            <h2 className="text-4xl font-black text-sky-300 flex items-center gap-4"><ScrollText size={48}/> 任務發布區</h2>
            <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl">
              <button onClick={() => setFontSize(f => Math.max(20, f-4))} className="p-2"><Minus/></button>
              <button onClick={() => setFontSize(f => Math.min(100, f+4))} className="p-2"><Plus/></button>
              <div className="w-px h-6 bg-white/20 mx-2" />
              <button onClick={() => setLineHeight(l => Math.max(0.7, l-0.1))} className="p-2"><ArrowsDownFromLine size={24}/></button>
              <button onClick={() => setLineHeight(l => Math.min(3.0, l+0.1))} className="p-2"><ArrowsUpFromLine size={24}/></button>
            </div>
          </div>
          <div className="flex-1 bg-black/20 rounded-[2.5rem] p-8 overflow-y-auto">
            <div className="font-black" style={{ fontSize: `${fontSize}px`, lineHeight: lineHeight }}>
              {displayItems.map((item, i) => (
                <div key={i} className="flex items-start gap-8 border-b border-white/5 pb-1">
                  <span className="flex-shrink-0 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white text-2xl">{i+1}</span>
                  <span className="text-white pt-1">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* 每月報表 - 自動統計 */}
      <section className="mx-4 mb-10 bg-white rounded-[3rem] p-6 shadow-2xl border-4 border-sky-100 flex flex-col">
        <h3 className="text-5xl font-black text-sky-900 mb-4 px-2 flex items-center gap-5"><Calendar size={56} className="text-sky-600"/> 每月分析報表</h3>
        <div className="overflow-auto rounded-[2rem] border-2 border-sky-50">
          <table className="w-full text-center table-fixed">
            <thead className="bg-sky-700 text-white text-3xl font-black">
              <tr><th className="p-6 w-80 text-left pl-12">姓名</th><th className="p-6">出席狀況</th><th className="p-6">作業齊全天數</th></tr>
            </thead>
            <tbody className="divide-y divide-sky-100">
              {STUDENTS.map(s => (
                <tr key={s.id} className="hover:bg-sky-50 transition-colors">
                  <td className="p-6 text-5xl font-black text-sky-900 text-left pl-12">{maskName(s.name)}</td>
                  <td className="p-6 flex justify-center gap-10 text-4xl font-black">
                    <div className="text-emerald-600">準時: {monthlyStats[s.id]?.onTime || 0}</div>
                    <div className="text-red-500">遲到: {monthlyStats[s.id]?.late || 0}</div>
                  </td>
                  <td className="p-6 text-sky-600 text-4xl font-black"><Trophy className="inline mr-3"/>{monthlyStats[s.id]?.fullDone || 0} 天</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 彈窗系統 */}
      {(activeStudent || viewOnlyStudent) && (
        <div className="fixed inset-0 bg-sky-900/95 backdrop-blur-xl z-[300] flex items-center justify-center p-8">
          <div className="bg-white rounded-[4rem] w-full max-w-[95vw] p-12 shadow-2xl flex flex-col max-h-[92vh] border-[12px] border-sky-100/50">
            <div className="flex justify-between items-center mb-8 border-b-4 border-sky-50 pb-8">
              <h3 className="text-7xl font-black text-sky-900 leading-none">{maskName(activeStudent?.name || viewOnlyStudent?.student.name)} <span className="text-2xl text-sky-300 ml-8 font-bold">任務確認 - {formatDate(viewDate)}</span></h3>
              <button onClick={() => { setActiveStudent(null); setViewOnlyStudent(null); }} className="text-slate-300 hover:text-red-500 transition-all hover:rotate-90"><XCircle size={84}/></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-3 gap-8">
                {activeStudent ? prevTasks.map((t, idx) => (
                  <label key={idx} className={`p-8 rounded-[2.5rem] border-8 flex items-center gap-8 shadow-lg ${selectedTasks[t] ? 'bg-sky-50 border-sky-500' : 'bg-slate-50 border-slate-200'}`}>
                    <input type="checkbox" checked={!!selectedTasks[t]} onChange={(e) => setSelectedTasks({...selectedTasks, [t]: e.target.checked})} className="w-12 h-12" />
                    <span className="text-5xl font-black text-sky-900 leading-tight">{t}</span>
                  </label>
                )) : (
                  <div className="col-span-3 flex flex-col items-center justify-center py-12">
                    {prevTasks.every(t => viewOnlyStudent.tasks[t]) ? <Smile size={220} className="text-emerald-500 animate-bounce" /> : <p className="text-5xl font-black text-red-500">尚有缺交任務</p>}
                  </div>
                )}
              </div>
            </div>
            {activeStudent && (
              <div className="grid grid-cols-3 gap-8 mt-8">
                <button onClick={() => submitCheckin('present')} className="bg-sky-600 text-white rounded-[2.5rem] py-8 text-5xl font-black shadow-2xl">確認打卡</button>
                <button onClick={() => submitCheckin('sick')} className="bg-red-100 text-red-600 rounded-[2.5rem] text-5xl font-black">病假</button>
                <button onClick={() => submitCheckin('personal')} className="bg-orange-100 text-orange-600 rounded-[2.5rem] text-5xl font-black">事假</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
