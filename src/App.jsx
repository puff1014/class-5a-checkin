import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, orderBy, limit, serverTimestamp, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { Ship, ScrollText, Check, Edit3, ChevronLeft, ChevronRight, XCircle, Clock, UserCheck, Plus, Minus, Trash2, LayoutDashboard, Calendar, Trophy, AlertTriangle, XOctagon, CheckCircle2 } from 'lucide-react';

const APP_VERSION = "v11.1.260221_TallReport_Final";

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
  const [fontSize, setFontSize] = useState(40);
  const [recordedDates, setRecordedDates] = useState([]);
  const [width1, setWidth1] = useState(25);
  const [width2, setWidth2] = useState(25);
  const [activeStatMonth, setActiveStatMonth] = useState("2月");
  const [selectedTasks, setSelectedTasks] = useState({});

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
    try {
      await setDoc(doc(db, `attendance_${dateKey}`, activeStudent.id), {
        name: activeStudent.name, status, completedTasks: selectedTasks, timestamp: serverTimestamp()
      }, { merge: true });
      setActiveStudent(null);
    } catch (e) { alert("儲存失敗，請檢查網路狀態"); }
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex flex-col font-sans select-none overflow-x-hidden">
      {/* 雙列式 Header */}
      <header className="bg-white border-b-2 border-sky-100 shadow-sm sticky top-0 z-[100]">
        <div className="px-8 py-3 flex items-center justify-between border-b border-sky-50">
          <div className="flex items-center gap-6">
            <button onClick={() => user ? signOut(auth) : signInWithEmailAndPassword(auth, prompt("Email"), prompt("密碼"))}>
              <Ship className={`w-12 h-12 ${user ? 'text-emerald-500' : 'text-sky-600'}`} />
            </button>
            <h1 className="text-4xl font-black text-sky-900 leading-none">五甲航海日誌</h1>
          </div>
          <div className="flex items-baseline gap-6">
            <span className="text-3xl font-bold text-slate-500">{currentTime.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })}</span>
            <span className="text-5xl font-mono font-black text-sky-600 drop-shadow-sm">{currentTime.toLocaleTimeString('zh-TW', { hour12: false })}</span>
            <span className="text-sm font-bold text-slate-300 ml-4">Ver {APP_VERSION}</span>
          </div>
        </div>

        <div className="px-8 py-2 flex items-center justify-between bg-sky-50/30">
          <div className="flex items-center gap-2 overflow-x-auto max-w-[60%] scrollbar-hide">
            {recordedDates.map(d => (
              <button key={d} onClick={() => setViewDate(new Date(d))} 
                className={`px-4 py-1.5 rounded-xl text-lg font-black transition-all ${formatDate(viewDate) === d ? 'bg-sky-600 text-white shadow-md' : 'bg-white text-sky-400 border border-sky-100 hover:bg-sky-100'}`}>
                {d.split('-').slice(1).join('/')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {user && <button onClick={() => window.confirm("確定要刪除今日紀錄？") && deleteDoc(doc(db, "announcements", formatDate(viewDate)))} className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={24}/></button>}
            <div className="flex bg-white p-1 rounded-xl items-center shadow-sm border border-sky-100">
              <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)))} className="p-2 hover:bg-sky-50 rounded-lg transition-all"><ChevronLeft size={28}/></button>
              <span className="text-xl font-black px-6 text-sky-800">{formatDate(viewDate)}</span>
              <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)))} className="p-2 hover:bg-sky-50 rounded-lg transition-all"><ChevronRight size={28}/></button>
            </div>
            {user && <button onClick={() => setDoc(doc(db, "announcements", formatDate(viewDate)), { date: formatDate(viewDate), items: displayItems }, {merge:true})} className="p-2 bg-emerald-100 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"><Plus size={24}/></button>}
          </div>
        </div>
      </header>

      {/* 主區域 */}
      <main className="flex-1 flex overflow-hidden p-4 gap-0 min-h-[500px]">
        {/* 簽到區 */}
        <div style={{ width: `${width1}%` }} className="bg-white rounded-[2.5rem] shadow-sm p-4 flex flex-col border border-sky-50 overflow-hidden relative z-30">
          <h2 className="text-2xl font-black mb-4 text-sky-800 flex items-center gap-2 px-2"><UserCheck size={28}/> 航海員簽到</h2>
          <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {STUDENTS.map(s => {
              const status = attendance[s.id]?.status;
              const color = status === 'present' ? 'bg-sky-50 text-sky-600 border-sky-200' : status === 'sick' ? 'bg-red-50 text-red-600' : status === 'personal' ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-300';
              return (
                <button key={s.id} onClick={() => { setActiveStudent(s); setSelectedTasks(attendance[s.id]?.completedTasks || {}); }} className={`h-22 rounded-[1.5rem] flex flex-col items-center justify-center transition-all border-b-4 active:border-b-0 active:translate-y-1 ${color}`}>
                  <span className="text-xs font-bold opacity-30 mb-0.5">{s.id}</span>
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
        }} className="w-4 flex items-center justify-center cursor-col-resize group z-40"><div className="w-1.5 h-12 bg-sky-100 rounded-full group-hover:bg-sky-400"></div></div>

        {/* 進度統計區 */}
        <div style={{ width: `${width2}%` }} className="bg-white rounded-[2.5rem] shadow-sm p-4 flex flex-col border border-sky-50 overflow-hidden z-20">
          <h2 className="text-2xl font-black mb-4 text-sky-800 flex items-center gap-2 px-2"><LayoutDashboard size={28}/> 今日任務進度</h2>
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2.5">
            {STUDENTS.map(s => {
              const hw = attendance[s.id]?.completedTasks || {};
              const comp = Object.values(hw).filter(v => v).length;
              const total = displayItems[0]?.includes("尚未發布") ? 0 : displayItems.length;
              return (
                <div key={s.id} onClick={() => setViewOnlyStudent({ student: s, tasks: hw })} className="flex items-center p-3 bg-sky-50/20 rounded-2xl border border-sky-100 hover:bg-sky-100 cursor-pointer transition-all">
                  <span className="text-2xl font-black text-sky-900 w-24 truncate">{maskName(s.name)}</span>
                  <div className="flex-1 h-3.5 bg-slate-100 rounded-full mx-4 overflow-hidden border border-slate-200">
                    <div className="h-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-700" style={{ width: `${total > 0 ? (comp / total) * 100 : 0}%` }}></div>
                  </div>
                  <span className="text-xl font-black text-sky-600 w-12 text-right">{comp}/{total}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div onMouseDown={(e) => {
          const move = (m) => setWidth2(((m.clientX / window.innerWidth) * 100) - width1);
          const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
          window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
        }} className="w-4 flex items-center justify-center cursor-col-resize group z-40"><div className="w-1.5 h-12 bg-sky-100 rounded-full group-hover:bg-sky-400"></div></div>

        {/* 任務發布區 */}
        <div style={{ width: `${100 - width1 - width2}%` }} className="bg-[#0C4A6E] rounded-[2.5rem] shadow-lg p-8 text-white flex flex-col overflow-hidden z-10">
          <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
            <h2 className="text-3xl font-black flex items-center gap-4 text-sky-300"><ScrollText size={36}/> 任務發布區</h2>
            <div className="flex items-center gap-3 bg-white/10 p-2 rounded-2xl">
              <button onClick={() => setFontSize(f => Math.max(20, f-4))} className="p-1 hover:bg-white/20 rounded-lg"><Minus/></button>
              <button onClick={() => setFontSize(f => Math.min(100, f+4))} className="p-1 hover:bg-white/20 rounded-lg"><Plus/></button>
              {user && <button onClick={() => isEditing ? (setIsEditing(false), setDoc(doc(db, "announcements", formatDate(viewDate)), { items: announcementText.split('\n'), date: formatDate(viewDate) }, {merge:true})) : setIsEditing(true)} className="ml-4 bg-emerald-500 hover:bg-emerald-400 px-6 py-2 rounded-xl font-bold text-lg shadow-lg">編輯</button>}
            </div>
          </div>
          <div className="flex-1 bg-black/20 rounded-[2rem] p-8 overflow-y-auto custom-scrollbar border border-white/5">
            {isEditing ? (
              <div className="h-full flex flex-col gap-6">
                <div className="flex flex-wrap gap-3">
                  {PRESET_HOMEWORK.map(h => <button key={h} onClick={() => setAnnouncementText(p => p + (p?'\n':'') + h)} className="px-4 py-2 bg-sky-700/80 hover:bg-sky-600 rounded-xl text-lg font-bold border border-sky-400">+{h}</button>)}
                  {PRESET_TAGS.map(t => <button key={t} onClick={() => setAnnouncementText(p => p + (p?'\n':'') + t)} className="px-4 py-2 bg-amber-700/80 hover:bg-amber-600 rounded-xl text-lg font-bold border border-amber-400">+{t.replace('：','')}</button>)}
                </div>
                <textarea value={announcementText} onChange={e => setAnnouncementText(e.target.value)} className="flex-1 bg-transparent text-white font-bold outline-none leading-relaxed text-4xl" />
              </div>
            ) : (
              <div className="font-bold space-y-6" style={{ fontSize: `${fontSize}px` }}>
                {displayItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-6 animate-fade-in">
                    <span className="flex-shrink-0 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white text-2xl shadow-md border-2 border-orange-200">{i+1}</span>
                    <span className="text-white drop-shadow-md pt-1">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 月度分析報表：高度加大，可顯示 8 人 */}
      <section className="mx-4 mb-10 bg-white rounded-[2rem] p-8 shadow-2xl border-2 border-blue-100 max-h-[60vh] overflow-hidden flex flex-col shrink-0">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-4xl font-black text-sky-900 flex items-center gap-4 px-2"><Calendar size={44}/> 月度航行分析報表</h3>
          <div className="flex gap-2 bg-blue-50 p-2 rounded-2xl border border-blue-100">
            {["2月", "3月", "4月", "5月", "6月", "7月"].map(m => (
              <button key={m} onClick={() => setActiveStatMonth(m)} className={`px-8 py-2.5 rounded-xl text-xl font-black transition-all ${activeStatMonth === m ? 'bg-sky-600 text-white shadow-md scale-105' : 'text-slate-400 hover:bg-white'}`}>{m}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-auto rounded-3xl border-2 border-sky-100 relative shadow-inner custom-scrollbar">
          <table className="w-full text-center table-fixed border-collapse">
            <thead className="sticky top-0 z-40 bg-sky-700 text-white shadow-lg">
              <tr className="text-2xl font-black">
                <th className="p-6 bg-sky-800 border-r border-sky-600 sticky left-0 z-50 w-56">姓名</th>
                <th className="p-6 bg-cyan-600 border-r border-sky-500">出席狀況</th>
                <th className="p-6 bg-indigo-600">作業繳交狀況</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-sky-50">
              {STUDENTS.map(s => (
                <tr key={s.id} className="hover:bg-sky-50 transition-colors">
                  <td className="p-6 text-4xl font-black text-sky-900 border-r-2 border-sky-50 sticky left-0 z-10 bg-white whitespace-nowrap overflow-visible">{maskName(s.name)}</td>
                  <td className="p-6 border-r-2 border-sky-50">
                    <div className="flex justify-center items-center gap-12 text-4xl font-black">
                      <div className="flex items-center gap-3 text-emerald-600"><CheckCircle2 size={40}/> 準時: 0</div>
                      <div className="flex items-center gap-3 text-red-400"><Clock size={40}/> 遲到: 0</div>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex justify-center items-center gap-10 text-4xl font-black">
                       <div className="flex items-center gap-3 text-sky-600"><Trophy size={40}/> 齊全: 0</div>
                       <div className="flex items-center gap-3 text-amber-500"><AlertTriangle size={40}/> 遲交: 0</div>
                       <div className="flex items-center gap-3 text-rose-500"><XOctagon size={40}/> 缺交: 0</div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 彈窗系統 */}
      {(activeStudent || viewOnlyStudent) && (
        <div className="fixed inset-0 bg-sky-900/90 backdrop-blur-xl z-[300] flex items-center justify-center p-8">
          <div className="bg-white rounded-[4rem] w-full max-w-5xl p-12 shadow-2xl relative flex flex-col max-h-[85vh] border-8 border-sky-100">
            <div className="flex justify-between items-center mb-8 border-b-4 border-sky-50 pb-8">
              <h3 className="text-6xl font-black text-sky-900">{maskName(activeStudent?.name || viewOnlyStudent?.student.name)} <span className="text-2xl text-sky-300 ml-6 font-bold">任務確認系統</span></h3>
              <button onClick={() => { setActiveStudent(null); setViewOnlyStudent(null); }} className="text-slate-300 hover:text-red-500 transition-all transform hover:rotate-90"><XCircle size={72}/></button>
            </div>
            
            <div className="grid grid-cols-2 gap-6 flex-1 overflow-y-auto pr-2 custom-scrollbar mb-10">
              {(activeStudent ? displayItems : Object.keys(viewOnlyStudent?.tasks || {})).map((task, idx) => (
                <label key={idx} className={`p-8 rounded-[2.5rem] border-4 flex items-center gap-8 transition-all active:scale-95 cursor-pointer ${(selectedTasks[task] || viewOnlyStudent?.tasks?.[task]) ? 'bg-sky-50 border-sky-500' : 'bg-slate-50 border-slate-200'}`}>
                  {activeStudent && <input type="checkbox" checked={!!selectedTasks[task]} onChange={(e) => setSelectedTasks({...selectedTasks, [task]: e.target.checked})} className="w-12 h-12 accent-sky-600" />}
                  {viewOnlyStudent && (viewOnlyStudent.tasks[task] ? <CheckCircle2 className="text-emerald-500" size={48}/> : <XOctagon className="text-red-300" size={48}/>)}
                  <span className="text-3xl font-black text-sky-900">{task}</span>
                </label>
              ))}
            </div>

            {activeStudent && (
              <div className="grid grid-cols-3 gap-6 shrink-0">
                <button onClick={() => submitCheckin('present')} className="py-8 bg-sky-600 text-white rounded-[2.5rem] text-4xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all">確認簽到並打卡</button>
                <button onClick={() => submitCheckin('sick')} className="py-8 bg-red-100 text-red-600 rounded-[2.5rem] text-4xl font-black hover:bg-red-200 transition-all">病假</button>
                <button onClick={() => submitCheckin('personal')} className="py-8 bg-orange-100 text-orange-600 rounded-[2.5rem] text-4xl font-black hover:bg-orange-200 transition-all">事假</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
