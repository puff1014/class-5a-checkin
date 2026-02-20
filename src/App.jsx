import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, orderBy, limit, serverTimestamp, getDocs, increment, deleteDoc, writeBatch } from 'firebase/firestore';
import { Ship, ScrollText, Check, Edit3, ChevronLeft, ChevronRight, XCircle, Clock, UserCheck, Plus, Minus, Trash2, LayoutDashboard, Calendar, CalendarDays, Timer, CheckCircle2, AlertTriangle, XOctagon } from 'lucide-react';

const APP_VERSION = "v9.0.260221_Final_Design";

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

const PRESET_HOMEWORK = ["預習數課", "數習", "數八", "背成+小+寫"];
const PRESET_TAGS = ["帶學用品：", "訂正作業："];

const maskName = (name) => name ? name[0] + "O" + (name[2] || "") : "";
const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

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
  const [fontSize, setFontSize] = useState(32);
  const [recordedDates, setRecordedDates] = useState([]);
  const [width1, setWidth1] = useState(25);
  const [width2, setWidth2] = useState(25);
  const [activeStatMonth, setActiveStatMonth] = useState("2月");

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
  }, [db, viewDate, isEditing]);

  const submitCheckin = async (status = 'present') => {
    const dateKey = formatDate(viewDate);
    const hwCount = Object.values(selectedTasks).filter(v => v).length;
    const oldHwCount = Object.values(attendance[activeStudent.id]?.completedTasks || {}).filter(v => v).length;
    const diff = (hwCount - oldHwCount) * 2;
    try {
      await setDoc(doc(db, `attendance_${dateKey}`, activeStudent.id), {
        name: activeStudent.name, status, completedTasks: selectedTasks, timestamp: serverTimestamp()
      }, { merge: true });
      if (diff !== 0) {
        setDoc(doc(db, `/artifacts/class-5a-app/public/data/student_bank/${activeStudent.id}`), { bronze: increment(diff) }, { merge: true }).catch(() => {});
      }
      setActiveStudent(null);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex flex-col font-sans select-none overflow-x-hidden">
      {/* 頂部：橫排時鐘與版本 */}
      <header className="bg-white border-b-2 border-sky-100 px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-[100]">
        <div className="flex items-center gap-4">
          <button onClick={() => user ? signOut(auth) : signInWithEmailAndPassword(auth, prompt("Email"), prompt("密碼"))}>
            <Ship className={`w-12 h-12 ${user ? 'text-emerald-500' : 'text-sky-600'}`} />
          </button>
          <div className="flex items-baseline gap-4 border-l-2 border-sky-100 pl-4">
            <span className="text-xl font-bold text-sky-900">{currentTime.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</span>
            <span className="text-4xl font-mono font-black text-sky-600">{currentTime.toLocaleTimeString('zh-TW', { hour12: false })}</span>
            <span className="text-xs font-bold text-slate-300 ml-4">Ver {APP_VERSION}</span>
          </div>
        </div>
        
        {/* 月份與日期分頁 */}
        <div className="flex-1 flex justify-center items-center gap-2 overflow-x-auto px-4 max-w-[40%] scrollbar-hide">
          <select value={activeStatMonth} onChange={(e) => setActiveStatMonth(e.target.value)} className="bg-blue-50 text-blue-600 border-none rounded-lg px-2 py-1 font-bold text-sm outline-none">
            {["2月", "3月", "4月", "5月", "6月", "7月"].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="h-4 w-px bg-slate-200 mx-1"></div>
          {recordedDates.map(d => (
            <button key={d} onClick={() => setViewDate(new Date(d))} 
              className={`px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${formatDate(viewDate) === d ? 'bg-sky-600 text-white shadow-sm scale-110' : 'bg-sky-50 text-sky-400 hover:bg-sky-100'}`}>
              {d.split('-').slice(1).join('/')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {user && <button onClick={() => window.confirm("確定要刪除今日紀錄？") && deleteDoc(doc(db, "announcements", formatDate(viewDate)))} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={20}/></button>}
          <div className="flex bg-slate-100 p-1 rounded-xl items-center shadow-inner">
            <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)))} className="p-1.5 hover:bg-white rounded-lg"><ChevronLeft size={24}/></button>
            <span className="text-sm font-black px-3">{formatDate(viewDate)}</span>
            <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)))} className="p-1.5 hover:bg-white rounded-lg"><ChevronRight size={24}/></button>
          </div>
          {user && <button onClick={() => {
            const newD = prompt("輸入指定日期新增 (格式: YYYY-MM-DD)", formatDate(new Date()));
            if(newD) setDoc(doc(db, "announcements", newD), { date: newD, items: displayItems }, {merge:true});
          }} className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"><Plus size={24}/></button>}
        </div>
      </header>

      {/* 三欄位佈局 */}
      <main className="flex-1 flex overflow-hidden p-4 gap-0">
        {/* 欄位一：名單 (高度收窄) */}
        <div style={{ width: `${width1}%` }} className="bg-white rounded-[2rem] shadow-sm p-4 flex flex-col border border-sky-50 overflow-hidden relative z-30">
          <h2 className="text-lg font-black mb-4 text-sky-800 flex items-center gap-2"><UserCheck size={20}/> 航海員簽到</h2>
          <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {STUDENTS.map(s => {
              const status = attendance[s.id]?.status;
              const color = status === 'present' ? 'bg-sky-50 text-sky-600 border-sky-200' : status === 'sick' ? 'bg-red-50 text-red-600' : status === 'personal' ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-300';
              return (
                <button key={s.id} onClick={() => handleStudentClick(s)} className={`h-20 rounded-2xl flex flex-col items-center justify-center transition-all border-b-4 active:border-b-0 active:translate-y-1 ${color}`}>
                  <span className="text-xs font-bold opacity-30 mb-0.5">{s.id}</span>
                  <span className="text-2xl font-black">{maskName(s.name)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div onMouseDown={(e) => {
          const move = (m) => setWidth1((m.clientX / window.innerWidth) * 100);
          const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
          window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
        }} className="w-4 flex items-center justify-center cursor-col-resize group"><div className="w-1 h-12 bg-sky-100 rounded-full group-hover:bg-sky-300"></div></div>

        {/* 欄位二：今日統計 */}
        <div style={{ width: `${width2}%` }} className="bg-white rounded-[2rem] shadow-sm p-4 flex flex-col border border-sky-50 overflow-hidden z-20">
          <h2 className="text-lg font-black mb-4 text-sky-800 flex items-center gap-2"><LayoutDashboard size={20}/> 今日任務進度</h2>
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
            {STUDENTS.map(s => {
              const hw = attendance[s.id]?.completedTasks || {};
              const comp = Object.values(hw).filter(v => v).length;
              const total = displayItems[0]?.includes("尚未發布") ? 0 : displayItems.length;
              return (
                <div key={s.id} className="flex items-center p-2.5 bg-sky-50/20 rounded-xl border border-sky-100 hover:bg-sky-50 cursor-pointer" onClick={() => setViewOnlyStudent({ student: s, tasks: hw })}>
                  <span className="text-lg font-black text-sky-900 w-20 truncate">{maskName(s.name)}</span>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full mx-3 overflow-hidden border border-slate-200">
                    <div className="h-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-700" style={{ width: `${total > 0 ? (comp / total) * 100 : 0}%` }}></div>
                  </div>
                  <span className="text-sm font-black text-sky-600 w-10 text-right">{comp}/{total}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div onMouseDown={(e) => {
          const move = (m) => setWidth2(((m.clientX / window.innerWidth) * 100) - width1);
          const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
          window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
        }} className="w-4 flex items-center justify-center cursor-col-resize group"><div className="w-1 h-12 bg-sky-100 rounded-full group-hover:bg-sky-300"></div></div>

        {/* 欄位三：任務發布區 (視覺顏色區分) */}
        <div style={{ width: `${100 - width1 - width2}%` }} className="bg-[#0C4A6E] rounded-[2rem] shadow-lg p-6 text-white flex flex-col overflow-hidden z-10">
          <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
            <h2 className="text-2xl font-black flex items-center gap-3 text-sky-300"><ScrollText size={28}/> 任務發布區</h2>
            <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl">
              <button onClick={() => setFontSize(f => Math.max(16, f-2))} className="p-1 hover:bg-white/20 rounded-lg text-white"><Minus size={16}/></button>
              <button onClick={() => setFontSize(f => Math.min(80, f+2))} className="p-1 hover:bg-white/20 rounded-lg text-white"><Plus size={16}/></button>
              {user && <button onClick={() => isEditing ? (setIsEditing(false), setDoc(doc(db, "announcements", formatDate(viewDate)), { items: announcementText.split('\n'), date: formatDate(viewDate) }, {merge:true})) : setIsEditing(true)} className="ml-2 bg-emerald-500 hover:bg-emerald-400 px-4 py-1 rounded-lg font-bold text-sm">編輯</button>}
            </div>
          </div>
          <div className="flex-1 bg-black/20 rounded-2xl p-4 overflow-y-auto custom-scrollbar border border-white/5">
            {isEditing ? (
              <div className="h-full flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {PRESET_HOMEWORK.map(h => <button key={h} onClick={() => setAnnouncementText(p => p + (p?'\n':'') + h)} className="px-3 py-1.5 bg-sky-700/80 hover:bg-sky-600 rounded-lg text-sm border border-sky-400 font-bold transition-all shadow-sm">+{h}</button>)}
                  {PRESET_TAGS.map(t => <button key={t} onClick={() => setAnnouncementText(p => p + (p?'\n':'') + t)} className="px-3 py-1.5 bg-amber-700/80 hover:bg-amber-600 rounded-lg text-sm border border-amber-400 font-bold transition-all shadow-sm">+{t.replace('：','')}</button>)}
                </div>
                <textarea value={announcementText} onChange={e => setAnnouncementText(e.target.value)} className="flex-1 bg-transparent text-white font-bold outline-none leading-relaxed text-3xl" />
              </div>
            ) : (
              <div className="font-bold space-y-4" style={{ fontSize: `${fontSize}px` }}>
                {displayItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center text-white text-xl shadow-md">{i+1}</span>
                    <span className="text-white drop-shadow-sm pt-1">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 月度統計分析 (表頭凍結與彩色並排指標) */}
      <section className="p-4 bg-white border-t border-sky-100 max-h-[35vh] overflow-hidden flex flex-col shrink-0">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-black text-sky-900 flex items-center gap-2"><Calendar size={24}/> 月度航行分析報表</h3>
          <div className="flex gap-2 bg-slate-50 p-1 rounded-xl">
            {["2月", "3月", "4月", "5月", "6月", "7月"].map(m => (
              <button key={m} onClick={() => setActiveStatMonth(m)} className={`px-4 py-1.5 rounded-lg text-sm font-black transition-all ${activeStatMonth === m ? 'bg-sky-600 text-white shadow-md' : 'text-slate-400 hover:bg-white'}`}>{m}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-auto rounded-xl border border-sky-100 relative custom-scrollbar">
          <table className="w-full text-center table-fixed border-collapse border-spacing-0">
            <thead className="sticky top-0 z-40 bg-sky-700 text-white shadow-md">
              <tr className="text-sm font-black">
                <th className="p-3 bg-sky-800 border-r border-sky-600 sticky left-0 z-50 w-24">姓名</th>
                <th className="p-3 bg-cyan-600 border-r border-sky-500">出席狀況統計</th>
                <th className="p-3 bg-indigo-600">作業繳交狀況統計</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-50">
              {STUDENTS.map(s => (
                <tr key={s.id} className="hover:bg-sky-50/50 transition-colors">
                  <td className="p-3 text-xl font-black text-sky-900 border-r border-sky-50 sticky left-0 z-10 bg-white">{maskName(s.name)}</td>
                  <td className="p-3 border-r border-sky-50">
                    <div className="flex justify-center items-center gap-6 text-xl font-black">
                      <div className="flex items-center gap-2 text-emerald-600"><CheckCircle2 size={24}/> 準時: 0</div>
                      <div className="h-6 w-px bg-slate-200"></div>
                      <div className="flex items-center gap-2 text-red-400"><Clock size={24}/> 遲到: 0</div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-center items-center gap-6 text-xl font-black">
                       <div className="flex items-center gap-2 text-sky-600"><UserCheck size={24}/> 齊全: 0</div>
                       <div className="h-6 w-px bg-slate-200"></div>
                       <div className="flex items-center gap-2 text-amber-500"><AlertTriangle size={24}/> 遲交: 0</div>
                       <div className="h-6 w-px bg-slate-200"></div>
                       <div className="flex items-center gap-2 text-rose-500"><XOctagon size={24}/> 缺交: 0</div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 任務詳細視窗 (文字大小優化) */}
      {(activeStudent || viewOnlyStudent) && (
        <div className="fixed inset-0 bg-sky-900/90 backdrop-blur-md z-[300] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl p-10 shadow-2xl relative flex flex-col max-h-[85vh] border-8 border-sky-100">
            <div className="flex justify-between items-center mb-6 border-b-2 border-sky-50 pb-6">
              <h3 className="text-5xl font-black text-sky-900">{maskName(activeStudent?.name || viewOnlyStudent?.student.name)} <span className="text-xl text-sky-300 ml-4 font-bold">任務查閱</span></h3>
              <button onClick={() => { setActiveStudent(null); setViewOnlyStudent(null); }} className="text-slate-300 hover:text-red-500 transition-all"><XCircle size={48}/></button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2 custom-scrollbar mb-8">
              {(activeStudent ? prevTasks : Object.keys(viewOnlyStudent?.tasks || {})).map((task, idx) => (
                <label key={idx} className={`p-6 rounded-[2.5rem] border-4 flex items-center gap-6 transition-all ${activeStudent ? 'cursor-pointer active:scale-95' : ''} ${(activeStudent ? selectedTasks[task] : viewOnlyStudent?.tasks[task]) ? 'bg-sky-50 border-sky-500 shadow-inner' : 'bg-slate-50 border-slate-200'}`}>
                  {activeStudent && <input type="checkbox" checked={!!selectedTasks[task]} onChange={(e) => setSelectedTasks({...selectedTasks, [task]: e.target.checked})} className="w-8 h-8 accent-sky-600" />}
                  {!activeStudent && (viewOnlyStudent?.tasks[task] ? <CheckCircle2 className="text-emerald-500" size={32} strokeWidth={4}/> : <XOctagon className="text-red-300" size={32}/>)}
                  <span className={`text-2xl font-black ${(activeStudent ? selectedTasks[task] : viewOnlyStudent.tasks[task]) ? 'text-sky-900' : 'text-slate-400'}`}>{task}</span>
                </label>
              ))}
            </div>

            {activeStudent && (
              <div className="grid grid-cols-3 gap-4 shrink-0">
                <button onClick={() => submitCheckin('present')} className="py-6 bg-sky-600 text-white rounded-[2rem] text-3xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all">確認簽到並打卡</button>
                <button onClick={() => submitCheckin('sick')} className="py-6 bg-red-100 text-red-600 rounded-[2rem] text-3xl font-black hover:bg-red-200">病假</button>
                <button onClick={() => submitCheckin('personal')} className="py-6 bg-orange-100 text-orange-600 rounded-[2rem] text-3xl font-black hover:bg-orange-200">事假</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
