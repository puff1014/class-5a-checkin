import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, orderBy, limit, serverTimestamp, getDocs } from 'firebase/firestore';
import { Ship, ScrollText, ChevronLeft, ChevronRight, XCircle, Clock, UserCheck, Plus, Minus, Trash2, LayoutDashboard, Calendar, Trophy, XOctagon, CheckCircle2, Ghost, Smile, Lock, Unlock } from 'lucide-react';

const APP_VERSION = "v14.5.1_Emergency_Fix";
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

  const getAttStatus = (id, time) => {
    if (!time) return 'none';
    const [h, m] = time.split(':').map(Number);
    const totalM = h * 60 + m;
    return SPECIAL_IDS.includes(id) ? (totalM <= 490 ? 'on-time' : 'late') : (totalM <= 459 ? 'on-time' : 'late');
  };

  const submitCheckin = async (status = 'present') => {
    const dateKey = formatDate(viewDate);
    const nowTime = new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' });
    await setDoc(doc(db, `attendance_${dateKey}`, activeStudent.id), {
      name: activeStudent.name, status, completedTasks: selectedTasks, checkinTime: attendance[activeStudent.id]?.checkinTime || nowTime, lastActionTime: nowTime, timestamp: serverTimestamp()
    }, { merge: true });
    setActiveStudent(null);
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex flex-col font-sans select-none overflow-x-hidden">
      <header className="bg-white border-b-2 border-sky-100 shadow-sm sticky top-0 z-[100]">
        <div className="px-8 py-4 flex items-center justify-between border-b border-sky-50">
          <div className="flex items-center gap-6">
            <Ship className="w-16 h-16 text-sky-600" />
            <div className="flex items-baseline gap-4">
              <h1 className="text-6xl font-black text-sky-900 leading-none">五甲航海日誌</h1>
              <span className="text-lg font-bold text-slate-300">Ver {APP_VERSION}</span>
              <button onClick={() => user ? signOut(auth) : signInWithEmailAndPassword(auth, prompt("Email"), prompt("密碼"))} className={`ml-4 px-4 py-2 rounded-xl text-xl font-bold ${user ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                {user ? '教師模式' : '學生模式'}
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
            <select value={activeStatMonth} onChange={(e) => setActiveStatMonth(e.target.value)} className="bg-white border-2 border-sky-200 text-sky-700 rounded-2xl px-5 py-2.5 font-black text-2xl">
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
            <div className="flex items-center gap-3">
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

      <main className="flex-1 flex overflow-hidden p-4 gap-0">
        <div className="w-[25%] bg-white rounded-[3rem] shadow-sm p-4 flex flex-col border border-sky-50 overflow-hidden z-30">
          <h2 className="text-3xl font-black mb-4 text-sky-800 flex items-center gap-3 px-2"><UserCheck size={40}/> 航海員簽到</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 flex-1 overflow-y-auto pr-1">
            {STUDENTS.map(s => {
              const d = attendance[s.id];
              const attStat = getAttStatus(s.id, d?.checkinTime);
              const color = !recordedDates.includes(formatDate(viewDate)) ? 'bg-slate-200 text-slate-400' : d?.status === 'present' ? (attStat === 'late' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200') : d?.status ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-300';
              return (
                <button key={s.id} onClick={() => { setSelectedTasks(d?.completedTasks || {}); setActiveStudent(s); }} className={`h-24 rounded-[1.8rem] flex flex-col items-center justify-center border-b-8 active:border-b-0 ${color}`}>
                  <span className="text-5xl font-black">{maskName(s.name)}</span>
                  {d?.checkinTime && <span className={`text-2xl font-black ${attStat === 'late' ? 'text-red-500' : 'text-emerald-500'}`}>{d.checkinTime}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-[25%] bg-white rounded-[3rem] shadow-sm p-4 flex flex-col border border-sky-50 overflow-hidden mx-4 z-20">
          <h2 className="text-3xl font-black mb-4 text-sky-800 flex items-center gap-3 px-2"><LayoutDashboard size={40}/> 今日任務進度</h2>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {STUDENTS.map(s => {
              const hw = attendance[s.id]?.completedTasks || {};
              const comp = Object.values(hw).filter(v => v).length;
              const total = prevTasks.length;
              return (
                <div key={s.id} onClick={() => setViewOnlyStudent({ student: s, tasks: hw })} className="flex items-center p-3 bg-sky-50/30 rounded-[1.5rem] border border-sky-100 cursor-pointer">
                  <span className="text-3xl font-black text-sky-900 w-32 truncate">{maskName(s.name)}</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded-full mx-4 overflow-hidden border border-slate-200"><div className="h-full bg-sky-500 transition-all" style={{ width: `${total > 0 ? (comp / total) * 100 : 0}%` }}></div></div>
                  <span className="text-3xl font-black text-sky-600 w-20 text-right">{comp}/{total}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 bg-[#0C4A6E] rounded-[3rem] shadow-xl p-8 text-white flex flex-col overflow-hidden z-10">
          <div className="flex justify-between items-center mb-4 border-b border-white/20 pb-4">
            <h2 className="text-4xl font-black flex items-center gap-4 text-sky-300"><ScrollText size={48}/> 任務發布區</h2>
            <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl">
              <button onClick={() => setFontSize(f => Math.max(20, f-4))} className="p-2"><Minus/></button>
              <button onClick={() => setFontSize(f => Math.min(100, f+4))} className="p-2"><Plus/></button>
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

      <section className="mx-4 mb-10 bg-white rounded-[3rem] p-6 shadow-2xl border-4 border-sky-100 flex flex-col shrink-0">
        <h3 className="text-5xl font-black text-sky-900 mb-2 px-2 flex items-center gap-5"><Calendar size={56}/> 每月分析報表</h3>
        <div className="overflow-auto rounded-[2rem] border-2 border-sky-50">
          <table className="w-full text-center table-fixed border-collapse">
            <thead className="sticky top-0 z-40 bg-sky-700 text-white"><tr className="text-3xl font-black"><th className="p-6 w-80 text-left pl-12">姓名</th><th className="p-6">出席狀況</th><th className="p-6">作業齊全天數</th></tr></thead>
            <tbody className="divide-y divide-sky-100">
              {STUDENTS.map(s => (
                <tr key={s.id} className="hover:bg-sky-50/50"><td className="p-6 text-5xl font-black text-sky-900 text-left pl-12">{maskName(s.name)}</td><td className="p-6 text-4xl font-black">--</td><td className="p-6 text-4xl font-black">--</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {(activeStudent || viewOnlyStudent) && (
        <div className="fixed inset-0 bg-sky-900/95 backdrop-blur-xl z-[300] flex items-center justify-center p-8">
          <div className="bg-white rounded-[4rem] w-full max-w-[95vw] p-10 shadow-2xl flex flex-col max-h-[90vh] border-[12px] border-sky-100/50 relative">
            <div className="flex justify-between items-center mb-6 border-b-4 border-sky-50 pb-6">
              <h3 className="text-7xl font-black text-sky-900 leading-none">{maskName(activeStudent?.name || viewOnlyStudent?.student.name)} <span className="text-2xl text-sky-300 ml-6 font-bold">任務確認 - {formatDate(viewDate)}</span></h3>
              <button onClick={() => { setActiveStudent(null); setViewOnlyStudent(null); }} className="text-slate-300 hover:text-red-500 transition-all"><XCircle size={72}/></button>
            </div>
            <div className="flex-1 overflow-y-auto pr-4">
              <div className="grid grid-cols-3 gap-6">
                {activeStudent ? prevTasks.map((t, idx) => (
                  <label key={idx} className={`p-6 rounded-[2rem] border-4 flex items-center gap-6 shadow-md ${selectedTasks[t] ? 'bg-sky-50 border-sky-500' : 'bg-slate-50 border-slate-100'}`}>
                    <input type="checkbox" checked={!!selectedTasks[t]} onChange={(e) => setSelectedTasks({...selectedTasks, [t]: e.target.checked})} className="w-10 h-10" />
                    <span className="text-4xl font-black text-sky-900 leading-tight">{t}</span>
                  </label>
                )) : (
                  <div className="col-span-3 flex flex-col items-center py-10">
                    {prevTasks.length > 0 && prevTasks.every(t => viewOnlyStudent.tasks[t]) ? <Smile size={180} className="text-emerald-500 animate-bounce" /> : <p className="text-5xl font-black text-red-500">尚有缺交任務</p>}
                  </div>
                )}
              </div>
            </div>
            {activeStudent && (
              <div className="grid grid-cols-3 gap-6 shrink-0 h-28 mt-8">
                <button onClick={() => submitCheckin('present')} className="bg-sky-600 text-white rounded-[2rem] text-4xl font-black">確認打卡</button>
                <button onClick={() => submitCheckin('sick')} className="bg-red-100 text-red-600 rounded-[2rem] text-4xl font-black">病假</button>
                <button onClick={() => submitCheckin('personal')} className="bg-orange-100 text-orange-600 rounded-[2rem] text-4xl font-black">事假</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
