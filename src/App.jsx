import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, orderBy, limit, serverTimestamp, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { Ship, ScrollText, Check, Edit3, ChevronLeft, ChevronRight, XCircle, Clock, UserCheck, Plus, Minus, Trash2, LayoutDashboard, Calendar, Trophy, AlertTriangle, XOctagon, CheckCircle2, Ghost, Smile, Lock, Unlock } from 'lucide-react';

const APP_VERSION = "v14.4.260221_Compact_Master";

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

const QUICK_TAGS = ["預習數課", "數習", "數八", "背成+小+寫", "國甲", "國乙", "國丙", "閱讀A", "閱讀B", "國預習單", "朗讀", "解釋單", "國練卷", "符號本", "帶學用品", "訂正功課"];

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
  const [fontSize, setFontSize] = useState(48);
  const [recordedDates, setRecordedDates] = useState([]);
  const [width1, setWidth1] = useState(25);
  const [width2, setWidth2] = useState(25);
  const [activeStatMonth, setActiveStatMonth] = useState(`${new Date().getMonth() + 1}月`);

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

  const submitCheckin = async (status = 'present') => {
    const dateKey = formatDate(viewDate);
    const checkinTime = new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' });
    await setDoc(doc(db, `attendance_${dateKey}`, activeStudent.id), {
      name: activeStudent.name, status, completedTasks: selectedTasks, checkinTime, timestamp: serverTimestamp()
    }, { merge: true });
    setActiveStudent(null);
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex flex-col font-sans select-none overflow-x-hidden">
      <header className="bg-white border-b-2 border-sky-100 shadow-sm sticky top-0 z-[100]">
        <div className="px-8 py-4 flex items-center justify-between border-b border-sky-50">
          <div className="flex items-center gap-6">
            <Ship className={`w-16 h-16 ${user ? 'text-emerald-500' : 'text-sky-600'}`} onClick={() => !user && signInWithEmailAndPassword(auth, prompt("Email"), prompt("密碼"))} />
            <div className="flex items-baseline gap-4">
              <h1 className="text-6xl font-black text-sky-900 leading-none tracking-tight">五甲航海日誌</h1>
              <span className="text-lg font-bold text-slate-300">Ver {APP_VERSION}</span>
              <button onClick={() => user ? signOut(auth) : signInWithEmailAndPassword(auth, prompt("Email"), prompt("密碼"))} 
                className={`ml-4 px-4 py-2 rounded-xl text-xl font-bold flex items-center gap-2 ${user ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                {user ? <><Unlock size={24}/> 教師模式</> : <><Lock size={24}/> 學生模式</>}
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
            <select value={activeStatMonth} onChange={(e) => setActiveStatMonth(e.target.value)}
              className="bg-white border-2 border-sky-200 text-sky-700 rounded-2xl px-5 py-2.5 font-black text-2xl outline-none shadow-sm transition-all">
              {["2月", "3月", "4月", "5月", "6月", "7月"].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <div className="flex items-center gap-2 overflow-x-auto max-w-[50vw] scrollbar-hide py-1">
              {recordedDates.filter(d => parseInt(d.split('-')[1]) === parseInt(activeStatMonth)).map(d => (
                <button key={d} onClick={() => setViewDate(new Date(d))} 
                  className={`px-6 py-2 rounded-2xl text-2xl font-black transition-all shrink-0 ${formatDate(viewDate) === d ? 'bg-sky-600 text-white shadow-lg scale-105' : 'bg-white text-sky-400 border border-sky-100 hover:bg-sky-50'}`}>
                  {d.split('-')[2]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-white p-1.5 rounded-2xl items-center shadow-inner border border-sky-100">
              <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)))} className="p-2 hover:bg-sky-50 rounded-xl transition-all"><ChevronLeft size={36}/></button>
              <span className="text-3xl font-black px-6 text-sky-800">{formatDate(viewDate)}</span>
              <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)))} className="p-2 hover:bg-sky-50 rounded-xl transition-all"><ChevronRight size={36}/></button>
            </div>
            {user && (
              <>
                <button onClick={async () => {
                  if(window.confirm(`確定要刪除日期 ${formatDate(viewDate)} 嗎？`)) {
                    const dk = formatDate(viewDate);
                    const batch = writeBatch(db);
                    batch.delete(doc(db, "announcements", dk));
                    const att = await getDocs(collection(db, `attendance_${dk}`));
                    att.forEach(d => batch.delete(d.ref));
                    await batch.commit();
                  }
                }} className="p-3 bg-rose-100 text-rose-600 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><Trash2 size={32}/></button>
                <button onClick={() => setDoc(doc(db, "announcements", formatDate(viewDate)), { date: formatDate(viewDate), items: displayItems }, {merge:true})} className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"><Plus size={32}/></button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-4 gap-0">
        {/* 簽到區 - 高度固定 */}
        <div style={{ width: `${width1}%` }} className="bg-white rounded-[3rem] shadow-sm p-4 flex flex-col border border-sky-50 overflow-hidden z-30">
          <h2 className="text-3xl font-black mb-4 text-sky-800 flex items-center gap-3 px-2"><UserCheck size={40}/> 航海員簽到</h2>
          <div className="grid grid-cols-2 gap-3 pr-1">
            {STUDENTS.map(s => {
              const st = attendance[s.id]?.status;
              const ct = attendance[s.id]?.checkinTime;
              const clr = st === 'present' ? 'bg-sky-50 text-sky-600 border-sky-200' : st === 'sick' ? 'bg-red-50 text-red-600 border-red-100' : st === 'personal' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-slate-50 text-slate-300 border-slate-100';
              return (
                <button key={s.id} onClick={async () => {
                  const q = query(collection(db, "announcements"), where("date", "<", formatDate(viewDate)), orderBy("date", "desc"), limit(1));
                  const snap = await getDocs(q);
                  setPrevTasks(!snap.empty ? snap.docs[0].data().items : []);
                  setSelectedTasks(attendance[s.id]?.completedTasks || {});
                  setActiveStudent(s);
                }} 
                  className={`h-28 rounded-[1.8rem] flex flex-col items-center justify-center transition-all border-b-8 active:border-b-0 active:translate-y-2 ${clr}`}>
                  <span className="text-5xl font-black">{maskName(s.name)}</span>
                  {ct && <span className="text-3xl font-black text-purple-700 mt-1">{ct}</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div onMouseDown={() => {
          const move = (m) => setWidth1((m.clientX / window.innerWidth) * 100);
          const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
          window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
        }} className="w-4 cursor-col-resize flex justify-center z-40 group"><div className="w-1.5 h-16 bg-sky-100 rounded-full group-hover:bg-sky-400 mt-20"></div></div>

        {/* 進度區 - 高度固定 */}
        <div style={{ width: `${width2}%` }} className="bg-white rounded-[3rem] shadow-sm p-4 flex flex-col border border-sky-50 overflow-hidden z-20">
          <h2 className="text-3xl font-black mb-4 text-sky-800 flex items-center gap-3 px-2"><LayoutDashboard size={40}/> 今日任務進度</h2>
          <div className="space-y-3 pr-1">
            {STUDENTS.map(s => {
              const hw = attendance[s.id]?.completedTasks || {};
              const cp = Object.values(hw).filter(v => v).length;
              const tt = prevTasks.length;
              return (
                <div key={s.id} onClick={() => setViewOnlyStudent({ student: s, tasks: hw })} className="flex items-center p-3 bg-sky-50/30 rounded-[1.5rem] border border-sky-100 hover:bg-sky-100 cursor-pointer transition-all">
                  <span className="text-3xl font-black text-sky-900 w-32 truncate">{maskName(s.name)}</span>
                  <div className="flex-1 h-5 bg-slate-100 rounded-full mx-4 overflow-hidden border border-slate-200">
                    <div className="h-full bg-sky-500 transition-all duration-700" style={{ width: `${tt > 0 ? (cp / tt) * 100 : 0}%` }}></div>
                  </div>
                  <span className="text-3xl font-black text-sky-600 w-24 text-right">{cp}/{tt}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div onMouseDown={() => {
          const move = (m) => setWidth2(((m.clientX / window.innerWidth) * 100) - width1);
          const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
          window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
        }} className="w-4 cursor-col-resize flex justify-center z-40 group"><div className="w-1.5 h-16 bg-sky-100 rounded-full group-hover:bg-sky-400 mt-20"></div></div>

        {/* 任務發布區 - 緊湊排列 */}
        <div style={{ width: `${100 - width1 - width2}%` }} className="bg-[#0C4A6E] rounded-[3rem] shadow-xl p-8 text-white flex flex-col overflow-hidden z-10">
          <div className="flex justify-between items-center mb-4 border-b border-white/20 pb-4">
            <h2 className="text-4xl font-black flex items-center gap-4 text-sky-300"><ScrollText size={48}/> 任務發布區</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl">
                <button onClick={() => setFontSize(f => Math.max(20, f-4))} className="p-2 hover:bg-white/20 rounded-xl"><Minus/></button>
                <button onClick={() => setFontSize(f => Math.min(100, f+4))} className="p-2 hover:bg-white/20 rounded-xl"><Plus/></button>
              </div>
              {user && <button onClick={() => isEditing ? (setIsEditing(false), setDoc(doc(db, "announcements", formatDate(viewDate)), { items: announcementText.split('\n'), date: formatDate(viewDate) }, {merge:true})) : setIsEditing(true)} className="bg-emerald-500 hover:bg-emerald-400 px-8 py-3 rounded-2xl font-black text-2xl shadow-lg transition-transform active:scale-95">編輯</button>}
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
              <div className="font-black space-y-3" style={{ fontSize: `${fontSize}px` }}>
                {displayItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-8 animate-fade-in border-b border-white/5 pb-1 last:border-0">
                    <span className="flex-shrink-0 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg border-4 border-orange-200/50">{i+1}</span>
                    <span className="text-white drop-shadow-sm pt-1">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <section className="mx-4 mb-10 bg-white rounded-[3rem] p-8 shadow-2xl border-4 border-sky-100 max-h-[75vh] overflow-hidden flex flex-col shrink-0">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-5xl font-black text-sky-900 flex items-center gap-5"><Calendar size={56} className="text-sky-600"/> 月度分析報表</h3>
          <div className="flex gap-2 bg-sky-50 p-2.5 rounded-3xl">
            {["2月", "3月", "4月", "5月", "6月", "7月"].map(m => <button key={m} onClick={() => setActiveStatMonth(m)} className={`px-12 py-3.5 rounded-2xl text-2xl font-black transition-all ${activeStatMonth === m ? 'bg-sky-600 text-white shadow-xl scale-105' : 'text-slate-400 hover:bg-white'}`}>{m}</button>)}
          </div>
        </div>
        <div className="flex-1 overflow-auto rounded-[2rem] border-2 border-sky-50 relative custom-scrollbar">
          <table className="w-full text-center table-fixed border-collapse">
            <thead className="sticky top-0 z-40 bg-sky-700 text-white"><tr className="text-3xl font-black"><th className="p-8 bg-sky-800 border-r border-sky-600 sticky left-0 z-50 w-72 text-left pl-12">姓名</th><th className="p-8 bg-cyan-600 border-r border-sky-500">出席狀況</th><th className="p-8 bg-indigo-600">作業繳交狀況</th></tr></thead>
            <tbody className="divide-y divide-sky-100">
              {STUDENTS.map(s => (
                <tr key={s.id} className="hover:bg-sky-50/50 transition-colors">
                  <td className="p-8 text-5xl font-black text-sky-900 border-r-2 border-sky-50 sticky left-0 z-10 bg-white whitespace-nowrap overflow-visible text-left pl-12">{maskName(s.name)}</td>
                  <td className="p-8 border-r-2 border-sky-50">
                    <div className="flex justify-center items-center gap-10 text-4xl font-black">
                      <div className="flex items-center gap-3 text-emerald-600"><CheckCircle2 size={48}/> 準時: 0</div>
                      <div className="flex items-center gap-3 text-red-400"><Clock size={48}/> 遲到: 0</div>
                      <div className="flex items-center gap-3 text-slate-400"><Ghost size={48}/> 未到: 0</div>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex justify-center items-center gap-10 text-4xl font-black">
                       <div className="flex items-center gap-3 text-sky-600"><Trophy size={48}/> 齊全: 0</div>
                       <div className="flex items-center gap-3 text-orange-400"><AlertTriangle size={48}/> 遲交: 0</div>
                       <div className="flex items-center gap-3 text-rose-500"><XOctagon size={48}/> 缺交: 0</div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Popups - 壓縮頭尾 */}
      {(activeStudent || viewOnlyStudent) && (
        <div className="fixed inset-0 bg-sky-900/95 backdrop-blur-xl z-[300] flex items-center justify-center p-8">
          <div className="bg-white rounded-[4rem] w-full max-w-[95vw] p-10 shadow-2xl relative flex flex-col max-h-[90vh] border-[12px] border-sky-100/50">
            <div className="flex justify-between items-center mb-6 border-b-4 border-sky-50 pb-6">
              <h3 className="text-7xl font-black text-sky-900 leading-none">
                {maskName(activeStudent?.name || viewOnlyStudent?.student.name)} 
                <span className="text-2xl text-sky-300 ml-6 font-bold">任務查閱 - {formatDate(viewDate)}</span>
              </h3>
              <button onClick={() => { setActiveStudent(null); setViewOnlyStudent(null); }} className="text-slate-300 hover:text-red-500 transition-all transform hover:rotate-90"><XCircle size={72}/></button>
            </div>
            
            <div className="grid grid-cols-3 gap-6 flex-1 overflow-y-auto pr-4 custom-scrollbar mb-8">
              {activeStudent ? prevTasks.map((t, idx) => (
                <label key={idx} className={`p-6 rounded-[2rem] border-4 flex items-center gap-6 transition-all active:scale-95 cursor-pointer shadow-md ${selectedTasks[t] ? 'bg-sky-50 border-sky-500' : 'bg-slate-50 border-slate-200'}`}>
                  <input type="checkbox" checked={!!selectedTasks[t]} onChange={(e) => setSelectedTasks({...selectedTasks, [t]: e.target.checked})} className="w-10 h-10 accent-sky-600" />
                  <span className="text-4xl font-black text-sky-900 leading-tight">{t}</span>
                </label>
              )) : (
                <div className="col-span-3 flex flex-col items-center justify-center gap-10 py-10 animate-fade-in">
                  {(prevTasks.length > 0 && prevTasks.every(t => viewOnlyStudent.tasks[t])) ? (
                    <div className="flex flex-col items-center gap-6"><Smile size={180} className="text-emerald-500 animate-bounce" /><p className="text-7xl font-black text-emerald-600">今日任務已繳交 😊</p></div>
                  ) : (
                    <div className="grid grid-cols-3 gap-6 w-full">
                      <p className="col-span-3 text-4xl font-black text-red-500 mb-2 px-6">目前尚有缺交任務：</p>
                      {prevTasks.filter(t => !viewOnlyStudent.tasks[t]).map((t, idx) => (
                        <div key={idx} className="p-8 bg-red-50 border-4 border-red-100 rounded-[2.5rem] flex items-center gap-8"><XOctagon size={48} className="text-red-500" /><span className="text-4xl font-black text-red-700">{t}</span></div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {activeStudent && (
              <div className="grid grid-cols-3 gap-6 shrink-0 h-28">
                <button onClick={() => submitCheckin('present')} className="bg-sky-600 text-white rounded-[2rem] text-4xl font-black shadow-xl hover:bg-sky-500 transition-all">確認打卡</button>
                <button onClick={() => submitCheckin('sick')} className="bg-red-100 text-red-600 rounded-[2rem] text-4xl font-black hover:bg-red-200">病假</button>
                <button onClick={() => submitCheckin('personal')} className="bg-orange-100 text-orange-600 rounded-[2rem] text-4xl font-black hover:bg-orange-200">事假</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
