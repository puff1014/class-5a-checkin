import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, orderBy, limit, serverTimestamp, getDocs, increment, deleteDoc, writeBatch } from 'firebase/firestore';
import { Ship, ScrollText, Check, Edit3, ChevronLeft, ChevronRight, XCircle, Clock, UserCheck, Plus, Minus, Trash2, LayoutDashboard, Calendar } from 'lucide-react';

const APP_VERSION = "v6.0.260221_FinalFix";

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
  const [announcementText, setAnnouncementText] = useState("");
  const [displayItems, setDisplayItems] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [activeStudent, setActiveStudent] = useState(null);
  const [viewOnlyStudent, setViewOnlyStudent] = useState(null);
  const [prevTasks, setPrevTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState({});
  const [fontSize, setFontSize] = useState(36);
  const [recordedDates, setRecordedDates] = useState([]);
  const [width1, setWidth1] = useState(30);
  const [width2, setWidth2] = useState(35);

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
    return onSnapshot(collection(db, "announcements"), (snap) => {
      setRecordedDates(snap.docs.map(d => d.id).sort());
    });
  }, [db]);

  useEffect(() => {
    if (!db) return;
    const dateKey = formatDate(viewDate);
    const unsubHw = onSnapshot(doc(db, "announcements", dateKey), (snap) => {
      if (snap.exists()) {
        const items = snap.data().items || [];
        setDisplayItems(items);
        if (!isEditing) setAnnouncementText(items.join('\n'));
      } else {
        setDisplayItems([]);
      }
    });
    const unsubAtt = onSnapshot(collection(db, `attendance_${dateKey}`), (snap) => {
      const data = {};
      snap.forEach(d => data[d.id] = d.data());
      setAttendance(data);
    });
    // 獲取前一日作業總量
    const q = query(collection(db, "announcements"), where("date", "<", dateKey), orderBy("date", "desc"), limit(1));
    getDocs(q).then(snap => {
      if (!snap.empty) setPrevTasks(snap.docs[0].data().items || []);
      else setPrevTasks([]);
    });
    return () => { unsubHw(); unsubAtt(); };
  }, [db, viewDate, isEditing]);

  const handleDeleteDate = async () => {
    if (!user) return;
    const dateKey = formatDate(viewDate);
    if (!window.confirm(`確定要刪除 ${dateKey} 的聯絡簿與簽到紀錄嗎？`)) return;
    const batch = writeBatch(db);
    batch.delete(doc(db, "announcements", dateKey));
    const attSnap = await getDocs(collection(db, `attendance_${dateKey}`));
    attSnap.forEach(d => batch.delete(d.ref));
    await batch.commit();
    alert("日期紀錄已完全刪除");
  };

  const handleStudentClick = (student) => {
    if (attendance[student.id]?.status && !user) return;
    setSelectedTasks(attendance[student.id]?.completedTasks || {});
    setActiveStudent(student);
  };

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
        await setDoc(doc(db, `/artifacts/class-5a-app/public/data/student_bank/${activeStudent.id}`), {
          bronze: increment(diff)
        }, { merge: true });
      }
      setActiveStudent(null);
    } catch (e) { alert("儲存失敗"); }
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex flex-col font-sans select-none overflow-x-hidden">
      {/* 頂部：巨型時鐘與日期 */}
      <header className="bg-white border-b-4 border-sky-100 p-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <button onClick={() => user ? signOut(auth) : signInWithEmailAndPassword(auth, prompt("Email"), prompt("密碼"))}>
            <Ship className={`w-14 h-14 ${user ? 'text-emerald-500' : 'text-sky-600'}`} />
          </button>
          <div className="text-4xl font-black text-sky-900 border-l-4 border-sky-100 pl-6">
            <div>{currentTime.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</div>
            <div className="text-6xl font-mono text-sky-600 mt-1">{currentTime.toLocaleTimeString('zh-TW', { hour12: false })}</div>
          </div>
        </div>
        
        <div className="flex-1 flex justify-center gap-2 overflow-x-auto px-10">
          {recordedDates.map(d => (
            <button key={d} onClick={() => setViewDate(new Date(d))} 
              className={`px-5 py-2 rounded-2xl text-2xl font-bold whitespace-nowrap transition-all ${formatDate(viewDate) === d ? 'bg-sky-600 text-white shadow-lg' : 'bg-sky-50 text-sky-400 hover:bg-sky-100'}`}>
              {d.split('-').slice(1).join('/')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {user && <button onClick={handleDeleteDate} className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={32}/></button>}
          <div className="flex bg-slate-100 p-2 rounded-3xl">
            <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)))} className="p-3 hover:bg-white rounded-2xl"><ChevronLeft size={40}/></button>
            <span className="text-3xl font-black px-6 flex items-center">{formatDate(viewDate)}</span>
            <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)))} className="p-3 hover:bg-white rounded-2xl"><ChevronRight size={40}/></button>
          </div>
        </div>
      </header>

      {/* 三欄位主區塊 */}
      <main className="flex-1 flex overflow-hidden p-6 gap-0">
        {/* 欄位一：名單 */}
        <div style={{ width: `${width1}%` }} className="bg-white rounded-[3rem] shadow-xl p-8 flex flex-col border-2 border-sky-50 overflow-hidden">
          <h2 className="text-3xl font-black mb-8 text-sky-800 flex items-center gap-3"><UserCheck size={36}/> 航海員簽到</h2>
          <div className="grid grid-cols-2 gap-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {STUDENTS.map(s => {
              const status = attendance[s.id]?.status;
              const color = status === 'present' ? 'bg-sky-50 text-sky-600 border-sky-200' : status === 'sick' ? 'bg-red-50 text-red-600 border-red-100' : status === 'personal' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-300 border-slate-100';
              return (
                <button key={s.id} onClick={() => handleStudentClick(s)} className={`h-36 rounded-[2.5rem] flex flex-col items-center justify-center transition-all border-b-8 active:border-b-0 active:translate-y-1 ${color}`}>
                  <span className="text-3xl font-bold opacity-30">{s.id}</span>
                  <span className="text-5xl font-black">{maskName(s.name)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div onMouseDown={(e) => {
          const move = (m) => setWidth1((m.clientX / window.innerWidth) * 100);
          const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
          window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
        }} className="w-5 flex items-center justify-center cursor-col-resize hover:bg-sky-100/50 group transition-colors"><div className="w-1.5 h-24 bg-sky-200 rounded-full group-hover:bg-sky-400"></div></div>

        {/* 欄位二：統計進度 */}
        <div style={{ width: `${width2}%` }} className="bg-white rounded-[3rem] shadow-xl p-8 flex flex-col border-2 border-sky-50 overflow-hidden">
          <h2 className="text-3xl font-black mb-8 text-sky-800 flex items-center gap-3"><LayoutDashboard size={36}/> 今日任務進度</h2>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {STUDENTS.map(s => {
              const hwData = attendance[s.id]?.completedTasks || {};
              const comp = Object.values(hwData).filter(v => v).length;
              const total = prevTasks.length;
              return (
                <div key={s.id} className="flex items-center p-5 bg-sky-50/30 rounded-3xl border border-sky-100">
                  <span onClick={() => setViewOnlyStudent({ student: s, tasks: hwData })} className="text-3xl font-black text-sky-900 w-32 cursor-pointer hover:text-sky-500 transition-colors">{maskName(s.name)}</span>
                  <div className="flex-1 h-5 bg-slate-200 rounded-full mx-6 overflow-hidden border border-slate-300">
                    <div className="h-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-700" style={{ width: `${total > 0 ? (comp / total) * 100 : 0}%` }}></div>
                  </div>
                  <span className="text-3xl font-black text-sky-600 w-24 text-right">{comp}/{total}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div onMouseDown={(e) => {
          const move = (m) => setWidth2(((m.clientX / window.innerWidth) * 100) - width1);
          const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
          window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
        }} className="w-5 flex items-center justify-center cursor-col-resize hover:bg-sky-100/50 group transition-colors"><div className="w-1.5 h-24 bg-sky-200 rounded-full group-hover:bg-sky-400"></div></div>

        {/* 欄位三：編輯區 */}
        <div style={{ width: `${100 - width1 - width2}%` }} className="bg-[#075985] rounded-[3rem] shadow-2xl p-10 text-white flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black flex items-center gap-3"><ScrollText size={40}/> 任務編輯區</h2>
            <div className="flex items-center gap-3 bg-white/10 p-3 rounded-2xl">
              <button onClick={() => setFontSize(f => Math.max(16, f-4))} className="p-2 hover:bg-white/20 rounded-xl"><Minus size={24}/></button>
              <button onClick={() => setFontSize(f => Math.min(100, f+4))} className="p-2 hover:bg-white/20 rounded-xl"><Plus size={24}/></button>
              {user && <button onClick={() => isEditing ? (setIsEditing(false), setDoc(doc(db, "announcements", formatDate(viewDate)), { items: announcementText.split('\n'), date: formatDate(viewDate) }, {merge:true})) : setIsEditing(true)} className="ml-4 bg-emerald-500 hover:bg-emerald-400 px-8 py-3 rounded-2xl font-black text-xl shadow-lg transition-all active:scale-95">{isEditing ? '儲存' : '編輯'}</button>}
            </div>
          </div>
          <div className="flex-1 bg-black/30 rounded-[2.5rem] p-8 overflow-y-auto custom-scrollbar shadow-inner border border-white/10">
            {isEditing ? (
              <div className="h-full flex flex-col gap-6">
                <div className="flex flex-wrap gap-3">
                  {PRESET_HOMEWORK.map(h => <button key={h} onClick={() => setAnnouncementText(p => p + (p?'\n':'') + h)} className="px-5 py-3 bg-sky-600 hover:bg-sky-500 rounded-2xl text-xl font-bold border-2 border-sky-400 transition-all">+{h}</button>)}
                  {PRESET_TAGS.map(t => <button key={t} onClick={() => setAnnouncementText(p => p + (p?'\n':'') + t)} className="px-5 py-3 bg-amber-600 hover:bg-amber-500 rounded-2xl text-xl font-bold border-2 border-amber-400 transition-all">+{t.replace('：','')}</button>)}
                </div>
                <textarea value={announcementText} onChange={e => setAnnouncementText(e.target.value)} className="flex-1 bg-transparent text-white font-bold outline-none leading-relaxed text-4xl" />
              </div>
            ) : (
              <div className="font-bold space-y-6" style={{ fontSize: `${fontSize}px` }}>
                {displayItems.map((item, i) => <div key={i} className="flex gap-4"><span className="text-sky-300 shrink-0">{i+1}.</span>{item}</div>)}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 每月統計表：海洋配色 */}
      <section className="p-10 bg-white border-t-8 border-sky-50">
        <h3 className="text-4xl font-black text-sky-900 mb-10 flex items-center gap-4"><Calendar size={48}/> 全班月度繳交分析報表</h3>
        <div className="overflow-hidden rounded-[3rem] border-4 border-sky-100 shadow-2xl">
          <table className="w-full text-center table-fixed border-collapse">
            <thead>
              <tr className="text-white text-3xl font-black">
                <th className="p-8 bg-sky-800 border-r border-sky-700">姓名</th>
                <th className="p-8 bg-cyan-600 border-r border-sky-500">2月</th>
                <th className="p-8 bg-blue-500 border-r border-sky-400">3月</th>
                <th className="p-8 bg-sky-500 border-r border-sky-400">4月</th>
                <th className="p-8 bg-teal-500 border-r border-sky-400">5月</th>
                <th className="p-8 bg-emerald-500 border-r border-sky-400">6月</th>
                <th className="p-8 bg-sky-700">7月</th>
              </tr>
            </thead>
            <tbody>
              {STUDENTS.map(s => (
                <tr key={s.id} className="border-b border-sky-50 hover:bg-sky-50/50 transition-colors">
                  <td className="p-8 text-5xl font-black text-sky-900 border-r border-sky-50 bg-slate-50/50">{maskName(s.name)}</td>
                  <td className="p-8 border-r border-sky-50 bg-emerald-50/20">
                    <div className="text-4xl font-black text-emerald-600">繳交: {attendance[s.id]?.rewardReceived ? Math.floor(attendance[s.id].rewardReceived/2) : 0}</div>
                    <div className="text-xl font-bold text-slate-400 mt-2">遲交: 0 / 缺交: 0</div>
                  </td>
                  {[1,2,3,4,5].map(i => <td key={i} className="p-8 text-slate-200 text-4xl font-black border-r border-sky-50">－</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 彈出視窗邏輯 */}
      {(activeStudent || viewOnlyStudent) && (
        <div className="fixed inset-0 bg-sky-900/95 backdrop-blur-2xl z-[200] flex items-center justify-center p-12">
          <div className="bg-white rounded-[5rem] w-full max-w-6xl p-16 shadow-2xl relative flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-10 border-b-8 border-sky-50 pb-10">
              <h3 className="text-8xl font-black text-sky-900">{maskName(activeStudent?.name || viewOnlyStudent?.student.name)} <span className="text-4xl text-sky-300 ml-6">任務詳細清單</span></h3>
              <button onClick={() => { setActiveStudent(null); setViewOnlyStudent(null); }} className="text-slate-200 hover:text-red-500 transition-all"><XCircle size={100}/></button>
            </div>
            <div className="grid grid-cols-2 gap-10 flex-1 overflow-y-auto pr-6 custom-scrollbar mb-12">
              {prevTasks.map((task, idx) => (
                <label key={idx} className={`p-12 rounded-[4rem] border-8 flex items-center gap-10 transition-all ${activeStudent ? 'cursor-pointer' : ''} ${(activeStudent ? selectedTasks[task] : viewOnlyStudent?.tasks[task]) ? 'bg-sky-50 border-sky-500' : 'bg-slate-50 border-slate-100'}`}>
                  {activeStudent && <input type="checkbox" checked={!!selectedTasks[task]} onChange={(e) => setSelectedTasks({...selectedTasks, [task]: e.target.checked})} className="w-16 h-16 accent-sky-600" />}
                  {viewOnlyStudent && (viewOnlyStudent.tasks[task] ? <Check className="text-emerald-500" size={60} strokeWidth={4}/> : <XCircle className="text-red-300" size={60}/>)}
                  <span className={`text-5xl font-black ${(activeStudent ? selectedTasks[task] : viewOnlyStudent.tasks[task]) ? 'text-sky-900' : 'text-slate-300'}`}>{task}</span>
                </label>
              ))}
            </div>
            {activeStudent && (
              <div className="grid grid-cols-3 gap-8 shrink-0">
                <button onClick={() => submitCheckin('present')} className="py-12 bg-sky-600 text-white rounded-[3.5rem] text-5xl font-black shadow-2xl hover:scale-105 active:scale-95 transition-all">確認繳交並打卡</button>
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
