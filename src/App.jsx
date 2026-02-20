import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, orderBy, limit, serverTimestamp, getDocs, increment, deleteDoc, writeBatch } from 'firebase/firestore';
import { Ship, ScrollText, Check, Edit3, ChevronLeft, ChevronRight, XCircle, Clock, UserCheck, Plus, Minus, Trash2, LayoutDashboard, Calendar, CalendarDays } from 'lucide-react';

const APP_VERSION = "v8.0.260221_A_Final";

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
  const [activeStatMonth, setActiveStatMonth] = useState("2月"); // 方案 A：預設顯示 2 月

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
        // 默默更新，失敗不彈窗
        updateDoc(doc(db, `/artifacts/class-5a-app/public/data/student_bank/${activeStudent.id}`), { bronze: increment(diff) }).catch(() => {});
      }
      setActiveStudent(null);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-[#E0F2FE] flex flex-col font-sans select-none overflow-x-hidden">
      {/* 頂部：時間與日期 (需求 5: 時鐘要大) */}
      <header className="bg-white/80 backdrop-blur-md border-b-4 border-blue-200 p-6 flex items-center justify-between shadow-lg sticky top-0 z-[100]">
        <div className="flex items-center gap-6">
          <button onClick={() => user ? signOut(auth) : signInWithEmailAndPassword(auth, prompt("Email"), prompt("密碼"))} className="hover:rotate-12 transition-transform">
            <Ship className={`w-16 h-16 ${user ? 'text-emerald-500' : 'text-blue-600'}`} />
          </button>
          <div className="flex items-center gap-8 border-l-4 border-blue-100 pl-8">
            <div className="text-3xl font-black text-slate-700">
              {currentTime.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </div>
            <div className="text-7xl font-mono font-black text-blue-700 drop-shadow-sm">
              {currentTime.toLocaleTimeString('zh-TW', { hour12: false })}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 px-6">
          {recordedDates.slice(-5).map(d => (
            <button key={d} onClick={() => setViewDate(new Date(d))} 
              className={`px-6 py-3 rounded-2xl text-xl font-black transition-all transform hover:scale-105 ${formatDate(viewDate) === d ? 'bg-blue-600 text-white shadow-xl' : 'bg-white text-blue-400 border-2 border-blue-100'}`}>
              {d.split('-').slice(1).join('/')}
            </button>
          ))}
          {user && <button onClick={() => {
            const newD = prompt("輸入日期 (YYYY-MM-DD)", formatDate(new Date()));
            if(newD) setDoc(doc(db, "announcements", newD), { date: newD, items: displayItems });
          }} className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all"><Plus size={32}/></button>}
        </div>

        <div className="flex items-center gap-4 bg-blue-50 p-2 rounded-[2rem] border-2 border-blue-100">
           {user && <button onClick={() => window.confirm("刪除此日紀錄？") && deleteDoc(doc(db, "announcements", formatDate(viewDate)))} className="p-3 text-red-400 hover:bg-red-50 rounded-full"><Trash2 size={28}/></button>}
           <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)))} className="p-3 hover:bg-white rounded-2xl"><ChevronLeft size={44}/></button>
           <span className="text-2xl font-black px-4">{formatDate(viewDate)}</span>
           <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)))} className="p-3 hover:bg-white rounded-2xl"><ChevronRight size={44}/></button>
        </div>
      </header>

      {/* 主三欄區域 */}
      <main className="flex-1 flex overflow-hidden p-6 gap-0">
        {/* 1. 名單 (z-30 確保點擊) */}
        <div style={{ width: `${width1}%` }} className="bg-white rounded-[3rem] shadow-2xl p-8 flex flex-col border-4 border-white overflow-hidden relative z-30">
          <h2 className="text-3xl font-black mb-8 text-blue-800 flex items-center gap-3"><UserCheck size={40}/> 航海員簽到</h2>
          <div className="grid grid-cols-2 gap-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {STUDENTS.map(s => {
              const status = attendance[s.id]?.status;
              const color = status === 'present' ? 'bg-blue-50 text-blue-600 border-blue-200' : status === 'sick' ? 'bg-red-50 text-red-600' : status === 'personal' ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-300';
              return (
                <button key={s.id} onClick={() => handleStudentClick(s)} className={`h-40 rounded-[2.5rem] flex flex-col items-center justify-center transition-all border-b-8 active:border-b-0 active:translate-y-2 hover:scale-105 ${color}`}>
                  <span className="text-2xl font-bold opacity-30 mb-2">{s.id}</span>
                  <span className="text-4xl font-black">{maskName(s.name)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div onMouseDown={(e) => {
          const move = (m) => setWidth1((m.clientX / window.innerWidth) * 100);
          const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
          window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
        }} className="w-6 flex items-center justify-center cursor-col-resize hover:bg-blue-400/20 group z-40"><div className="w-2 h-20 bg-white/50 rounded-full group-hover:bg-blue-400 shadow-sm"></div></div>

        {/* 2. 統計 */}
        <div style={{ width: `${width2}%` }} className="bg-white rounded-[3rem] shadow-2xl p-8 flex flex-col border-4 border-white overflow-hidden z-20">
          <h2 className="text-3xl font-black mb-8 text-blue-800 flex items-center gap-3"><LayoutDashboard size={40}/> 任務進度</h2>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {STUDENTS.map(s => {
              const hw = attendance[s.id]?.completedTasks || {};
              const comp = Object.values(hw).filter(v => v).length;
              const total = displayItems.length;
              return (
                <div key={s.id} className="flex items-center p-4 bg-blue-50/30 rounded-3xl border border-blue-100 hover:bg-blue-50 transition-colors cursor-pointer" onClick={() => setViewOnlyStudent({ student: s, tasks: hw })}>
                  <span className="text-3xl font-black text-slate-700 w-24">{maskName(s.name)}</span>
                  <div className="flex-1 h-6 bg-slate-200 rounded-full mx-6 overflow-hidden border-2 border-white shadow-inner">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-500 transition-all duration-1000" style={{ width: `${total > 0 ? (comp / total) * 100 : 0}%` }}></div>
                  </div>
                  <span className="text-3xl font-black text-blue-600">{comp}/{total}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div onMouseDown={(e) => {
          const move = (m) => setWidth2(((m.clientX / window.innerWidth) * 100) - width1);
          const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
          window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
        }} className="w-6 flex items-center justify-center cursor-col-resize hover:bg-blue-400/20 group z-40"><div className="w-2 h-20 bg-white/50 rounded-full group-hover:bg-blue-400 shadow-sm"></div></div>

        {/* 3. 任務發布區 (需求 4 改名) */}
        <div style={{ width: `${100 - width1 - width2}%` }} className="bg-gradient-to-br from-[#075985] to-[#0C4A6E] rounded-[3.5rem] shadow-2xl p-10 text-white flex flex-col relative overflow-hidden z-10">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-4xl font-black flex items-center gap-4"><ScrollText size={48}/> 任務發布區</h2>
            <div className="flex items-center gap-3 bg-white/10 p-2 rounded-2xl">
              <button onClick={() => setFontSize(f => Math.max(16, f-4))} className="p-2 hover:bg-white/20 rounded-xl text-white"><Minus/></button>
              <button onClick={() => setFontSize(f => Math.min(80, f+4))} className="p-2 hover:bg-white/20 rounded-xl text-white"><Plus/></button>
              {user && <button onClick={() => isEditing ? (setIsEditing(false), setDoc(doc(db, "announcements", formatDate(viewDate)), { items: announcementText.split('\n'), date: formatDate(viewDate) }, {merge:true})) : setIsEditing(true)} className="ml-4 bg-emerald-500 hover:bg-emerald-400 px-8 py-3 rounded-2xl font-black text-2xl shadow-xl transition-all active:scale-95">{isEditing ? '儲存' : '編輯'}</button>}
            </div>
          </div>
          <div className="flex-1 bg-black/30 rounded-[3rem] p-10 overflow-y-auto custom-scrollbar border-4 border-white/5 shadow-inner">
            {isEditing ? (
              <div className="h-full flex flex-col gap-6">
                <div className="flex flex-wrap gap-4 mb-4">
                  {/* 需求 6: 文字顯示大但方格不用加大 */}
                  {PRESET_HOMEWORK.map(h => <button key={h} onClick={() => setAnnouncementText(p => p + (p?'\n':'') + h)} className="px-6 py-2 bg-blue-600/80 hover:bg-blue-500 rounded-xl text-lg font-bold border-2 border-blue-400 transition-colors">+{h}</button>)}
                  {PRESET_TAGS.map(t => <button key={t} onClick={() => setAnnouncementText(p => p + (p?'\n':'') + t)} className="px-6 py-2 bg-amber-600/80 hover:bg-amber-500 rounded-xl text-lg font-bold border-2 border-amber-400 transition-colors">+{t.replace('：','')}</button>)}
                </div>
                <textarea value={announcementText} onChange={e => setAnnouncementText(e.target.value)} className="flex-1 bg-transparent text-white font-bold outline-none leading-relaxed text-5xl" />
              </div>
            ) : (
              <div className="font-bold space-y-8" style={{ fontSize: `${fontSize}px` }}>
                {displayItems.map((item, i) => <div key={i} className="flex gap-6 animate-fade-in"><span className="text-blue-400 drop-shadow-md shrink-0">{i+1}.</span>{item}</div>)}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 方案 A：月份切換統計 (活潑風格) */}
      <section className="mx-6 mb-10 bg-white rounded-[3rem] p-10 shadow-2xl border-4 border-white flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <h3 className="text-4xl font-black text-slate-800 flex items-center gap-4"><CalendarDays size={48} className="text-blue-600"/> 月度航行分析</h3>
          <div className="flex gap-3 bg-slate-100 p-2 rounded-[2.5rem]">
            {["2月", "3月", "4月", "5月", "6月", "7月"].map(m => (
              <button key={m} onClick={() => setActiveStatMonth(m)} className={`px-8 py-3 rounded-[2rem] text-2xl font-black transition-all ${activeStatMonth === m ? 'bg-blue-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:bg-white'}`}>{m}</button>
            ))}
          </div>
        </div>
        
        <div className="overflow-x-auto rounded-[2rem] border-4 border-blue-50">
          <table className="w-full text-center table-fixed border-collapse">
            <thead className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white sticky top-0 z-10">
              <tr>
                <th className="p-8 text-3xl font-black border-r border-white/20 w-48">姓名</th>
                <th className="p-8 text-3xl font-black border-r border-white/20">出席狀況</th>
                <th className="p-8 text-3xl font-black">繳交進度</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-blue-50">
              {STUDENTS.map(s => (
                <tr key={s.id} className="hover:bg-blue-50/50 transition-colors">
                  <td className="p-6 text-4xl font-black text-slate-700 bg-slate-50/50 border-r-2 border-blue-50">{maskName(s.name)}</td>
                  <td className="p-6 border-r-2 border-blue-50">
                    <div className="flex justify-center gap-8 text-3xl font-black">
                      <span className="text-emerald-500">準時: 0</span>
                      <span className="text-red-400">遲到: 0</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col items-center">
                       <span className="text-4xl font-black text-blue-600">繳交齊全: 0</span>
                       <div className="flex gap-6 text-xl font-bold text-slate-300 mt-2"><span>遲交: 0</span><span>缺交: 0</span></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 巨型確認視窗 (需求 2: 以螢幕能顯示為原則) */}
      {(activeStudent || viewOnlyStudent) && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-2xl z-[300] flex items-center justify-center p-12">
          <div className="bg-white rounded-[4rem] w-full max-w-5xl p-16 shadow-2xl relative flex flex-col max-h-[85vh] border-8 border-blue-100">
            <div className="flex justify-between items-center mb-10 border-b-4 border-blue-50 pb-10">
              <h3 className="text-7xl font-black text-blue-900">{maskName(activeStudent?.name || viewOnlyStudent?.student.name)} <span className="text-3xl text-slate-300 ml-6">任務詳細</span></h3>
              <button onClick={() => { setActiveStudent(null); setViewOnlyStudent(null); }} className="text-slate-200 hover:text-red-500 transition-all transform hover:rotate-90"><XCircle size={100}/></button>
            </div>
            <div className="grid grid-cols-2 gap-8 flex-1 overflow-y-auto pr-6 custom-scrollbar mb-12">
              {(activeStudent ? prevTasks : []).map((task, idx) => (
                <label key={idx} className={`p-10 rounded-[3rem] border-8 flex items-center gap-8 transition-all active:scale-95 cursor-pointer ${(selectedTasks[task]) ? 'bg-blue-50 border-blue-500 shadow-inner' : 'bg-slate-50 border-slate-200'}`}>
                  <input type="checkbox" checked={!!selectedTasks[task]} onChange={(e) => setSelectedTasks({...selectedTasks, [task]: e.target.checked})} className="w-16 h-16 accent-blue-600" />
                  <span className={`text-4xl font-black ${(selectedTasks[task]) ? 'text-blue-900' : 'text-slate-300'}`}>{task}</span>
                </label>
              ))}
              {viewOnlyStudent && Object.entries(viewOnlyStudent.tasks).map(([task, val], idx) => (
                <div key={idx} className={`p-10 rounded-[3rem] border-8 flex items-center gap-8 ${val ? 'bg-emerald-50 border-emerald-500' : 'bg-red-50 border-red-200'}`}>
                  {val ? <Check size={60} className="text-emerald-500" strokeWidth={5}/> : <XCircle size={60} className="text-red-400"/>}
                  <span className={`text-4xl font-black ${val ? 'text-emerald-900' : 'text-red-900'}`}>{task}</span>
                </div>
              ))}
            </div>
            {activeStudent && (
              <div className="grid grid-cols-3 gap-8 shrink-0">
                <button onClick={() => submitCheckin('present')} className="py-12 bg-blue-600 text-white rounded-[3.5rem] text-5xl font-black shadow-2xl hover:scale-105 active:scale-95 transition-all">確認簽到並登船</button>
                <button onClick={() => submitCheckin('sick')} className="py-12 bg-red-100 text-red-600 rounded-[3.5rem] text-5xl font-black hover:bg-red-200 transition-all">病假</button>
                <button onClick={() => submitCheckin('personal')} className="py-12 bg-orange-100 text-orange-600 rounded-[3.5rem] text-5xl font-black hover:bg-orange-200 transition-all">事假</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
