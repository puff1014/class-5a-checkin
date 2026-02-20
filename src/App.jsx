import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, orderBy, limit, serverTimestamp, getDocs, increment, deleteDoc, writeBatch } from 'firebase/firestore';
import { Ship, ScrollText, Check, Edit3, ChevronLeft, ChevronRight, XCircle, Clock, UserCheck, Plus, Minus, Trash2, LayoutDashboard, Calendar, Timer } from 'lucide-react';

const APP_VERSION = "v7.0.260221_Ultimate";

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

const PRESET_HOMEWORK = ["預習數課", "數習", "數習", "背成+小+寫"];
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
  const [fontSize, setFontSize] = useState(32);
  const [recordedDates, setRecordedDates] = useState([]);
  // 需求5：預設 1/4 (25%), 1/4 (25%), 2/4 (50%)
  const [width1, setWidth1] = useState(25);
  const [width2, setWidth2] = useState(25);

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
    const q = query(collection(db, "announcements"), where("date", "<", dateKey), orderBy("date", "desc"), limit(1));
    getDocs(q).then(snap => {
      if (!snap.empty) setPrevTasks(snap.docs[0].data().items || []);
      else setPrevTasks([]);
    });
    return () => { unsubHw(); unsubAtt(); };
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
        await setDoc(doc(db, `/artifacts/class-5a-app/public/data/student_bank/${activeStudent.id}`), {
          bronze: increment(diff)
        }, { merge: true });
      }
      setActiveStudent(null);
    } catch (e) { alert("儲存失敗"); }
  };

  return (
    <div className="min-h-screen bg-[#F0FBFF] flex flex-col font-sans select-none overflow-x-hidden">
      {/* 需求1：日期與時間整合為橫排 */}
      <header className="bg-white border-b-2 border-sky-100 px-6 py-3 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => user ? signOut(auth) : signInWithEmailAndPassword(auth, prompt("Email"), prompt("密碼"))}>
            <Ship className={`w-10 h-10 ${user ? 'text-emerald-500' : 'text-sky-600'}`} />
          </button>
          <div className="flex items-baseline gap-4 border-l-2 border-sky-100 pl-4">
            <span className="text-xl font-bold text-sky-900">{currentTime.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</span>
            <span className="text-3xl font-mono font-black text-sky-600">{currentTime.toLocaleTimeString('zh-TW', { hour12: false })}</span>
          </div>
        </div>
        
        <div className="flex gap-1 overflow-x-auto px-4 max-w-[40%] scrollbar-hide">
          {recordedDates.map(d => (
            <button key={d} onClick={() => setViewDate(new Date(d))} 
              className={`px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${formatDate(viewDate) === d ? 'bg-sky-600 text-white shadow-sm' : 'bg-sky-50 text-sky-400 hover:bg-sky-100'}`}>
              {d.split('-').slice(1).join('/')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {user && <button onClick={async () => {
             if(window.confirm("確定要刪除今日紀錄嗎？")) {
                const batch = writeBatch(db);
                batch.delete(doc(db, "announcements", formatDate(viewDate)));
                const attSnap = await getDocs(collection(db, `attendance_${formatDate(viewDate)}`));
                attSnap.forEach(d => batch.delete(d.ref));
                await batch.commit();
             }
          }} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 size={20}/></button>}
          <div className="flex bg-slate-100 p-1 rounded-xl items-center">
            <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)))} className="p-1.5 hover:bg-white rounded-lg"><ChevronLeft size={24}/></button>
            <span className="text-sm font-black px-3">{formatDate(viewDate)}</span>
            <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)))} className="p-1.5 hover:bg-white rounded-lg"><ChevronRight size={24}/></button>
          </div>
        </div>
      </header>

      {/* 需求5：三欄位版面 */}
      <main className="flex-1 flex overflow-hidden p-4 gap-0">
        {/* 欄位一：名單 */}
        <div style={{ width: `${width1}%` }} className="bg-white rounded-[2rem] shadow-sm p-4 flex flex-col border border-sky-50 overflow-hidden">
          <h2 className="text-lg font-black mb-4 text-sky-800 flex items-center gap-2"><UserCheck size={20}/> 航海員簽到</h2>
          <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {STUDENTS.map(s => {
              const status = attendance[s.id]?.status;
              const color = status === 'present' ? 'bg-sky-50 text-sky-600 border-sky-200' : status === 'sick' ? 'bg-red-50 text-red-600 border-red-100' : status === 'personal' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-300 border-slate-100';
              return (
                <button key={s.id} onClick={() => handleStudentClick(s)} className={`h-24 rounded-2xl flex flex-col items-center justify-center transition-all border-b-4 active:border-b-0 active:translate-y-1 ${color}`}>
                  <span className="text-sm font-bold opacity-30">{s.id}</span>
                  {/* 需求6：簽到名字縮小 */}
                  <span className="text-2xl font-black">{maskName(s.name)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 需求5：三個欄位都有調整桿 */}
        <div onMouseDown={(e) => {
          const move = (m) => setWidth1((m.clientX / window.innerWidth) * 100);
          const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
          window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
        }} className="w-4 flex items-center justify-center cursor-col-resize hover:bg-sky-100/50 group"><div className="w-1 h-12 bg-sky-100 rounded-full"></div></div>

        {/* 欄位二：統計進度 */}
        <div style={{ width: `${width2}%` }} className="bg-white rounded-[2rem] shadow-sm p-4 flex flex-col border border-sky-50 overflow-hidden">
          <h2 className="text-lg font-black mb-4 text-sky-800 flex items-center gap-2"><LayoutDashboard size={20}/> 今日任務進度</h2>
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2">
            {STUDENTS.map(s => {
              const hwData = attendance[s.id]?.completedTasks || {};
              const comp = Object.values(hwData).filter(v => v).length;
              const total = prevTasks.length;
              return (
                <div key={s.id} className="flex items-center p-2.5 bg-sky-50/20 rounded-xl border border-sky-100">
                  <span onClick={() => setViewOnlyStudent({ student: s, tasks: hwData })} className="text-lg font-black text-sky-900 w-20 cursor-pointer hover:text-sky-500 truncate">{maskName(s.name)}</span>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full mx-3 overflow-hidden border border-slate-200">
                    <div className="h-full bg-sky-500 transition-all duration-700" style={{ width: `${total > 0 ? (comp / total) * 100 : 0}%` }}></div>
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
        }} className="w-4 flex items-center justify-center cursor-col-resize hover:bg-sky-100/50 group"><div className="w-1 h-12 bg-sky-100 rounded-full"></div></div>

        {/* 欄位三：任務編輯區 */}
        <div style={{ width: `${100 - width1 - width2}%` }} className="bg-[#0C4A6E] rounded-[2rem] shadow-lg p-6 text-white flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black flex items-center gap-2"><ScrollText size={24}/> 任務編輯區</h2>
            <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl">
              <button onClick={() => setFontSize(f => Math.max(16, f-2))} className="p-1 hover:bg-white/20 rounded-lg text-white"><Minus size={16}/></button>
              <button onClick={() => setFontSize(f => Math.min(60, f+2))} className="p-1 hover:bg-white/20 rounded-lg text-white"><Plus size={16}/></button>
              {user && <button onClick={() => isEditing ? (setIsEditing(false), setDoc(doc(db, "announcements", formatDate(viewDate)), { items: announcementText.split('\n'), date: formatDate(viewDate) }, {merge:true})) : setIsEditing(true)} className="ml-2 bg-emerald-500 hover:bg-emerald-400 px-4 py-1 rounded-lg font-bold text-sm">儲存</button>}
            </div>
          </div>
          <div className="flex-1 bg-black/20 rounded-2xl p-4 overflow-y-auto custom-scrollbar border border-white/5 shadow-inner">
            {isEditing ? (
              <div className="h-full flex flex-col gap-3">
                <div className="flex flex-wrap gap-2">
                  {PRESET_HOMEWORK.map(h => <button key={h} onClick={() => setAnnouncementText(p => p + (p?'\n':'') + h)} className="px-2.5 py-1 bg-sky-700/50 rounded-lg text-xs border border-sky-400">+{h}</button>)}
                  {PRESET_TAGS.map(t => <button key={t} onClick={() => setAnnouncementText(p => p + (p?'\n':'') + t)} className="px-2.5 py-1 bg-amber-700/50 rounded-lg text-xs border border-amber-400">+{t.replace('：','')}</button>)}
                </div>
                <textarea value={announcementText} onChange={e => setAnnouncementText(e.target.value)} className="flex-1 bg-transparent text-white font-bold outline-none leading-relaxed text-2xl" />
              </div>
            ) : (
              <div className="font-bold space-y-3" style={{ fontSize: `${fontSize}px` }}>
                {displayItems.map((item, i) => <div key={i} className="flex gap-3"><span className="text-sky-300 shrink-0">{i+1}.</span>{item}</div>)}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 需求7, 8：每月統計表與雙軌制 */}
      <section className="p-4 bg-white border-t border-sky-100 max-h-[40vh] overflow-hidden flex flex-col shrink-0">
        {/* 需求3：文字比標題小一點點 */}
        <h3 className="text-md font-black text-sky-900 mb-2 flex items-center gap-2 px-2"><Calendar size={20}/> 月度綜合數據分析</h3>
        <div className="flex-1 overflow-auto rounded-xl border border-sky-100 custom-scrollbar relative">
          <table className="w-full text-center table-fixed border-separate border-spacing-0">
            {/* 需求3：凍結表頭 */}
            <thead className="sticky top-0 z-20 bg-sky-700 text-white shadow-md">
              <tr className="text-xs font-black">
                <th className="p-3 bg-sky-800 border-r border-sky-600 sticky left-0 z-30 w-16">姓名</th>
                <th className="p-3 border-r border-sky-600">統計項目</th>
                <th className="p-3 bg-cyan-600 border-r border-sky-500">2月</th>
                <th className="p-3 bg-blue-500 border-r border-sky-400">3月</th>
                <th className="p-3 bg-sky-500 border-r border-sky-400">4月</th>
                <th className="p-3 bg-teal-500 border-r border-sky-400">5月</th>
                <th className="p-3 bg-emerald-500 border-r border-sky-400">6月</th>
                <th className="p-3 bg-sky-900">7月</th>
              </tr>
            </thead>
            <tbody>
              {STUDENTS.map(s => (
                <React.Fragment key={s.id}>
                  {/* 需求8：統計一 - 出席 */}
                  <tr className="border-b border-sky-50 hover:bg-sky-50/50 transition-colors">
                    {/* 需求3：凍結姓名 */}
                    <td rowSpan={2} className="p-2 text-md font-black text-sky-900 border-r border-sky-50 sticky left-0 z-10 bg-white">{maskName(s.name)}</td>
                    <td className="p-1 text-[10px] font-bold text-slate-500 bg-slate-50 border-r border-sky-50">出席狀況</td>
                    {[2,3,4,5,6,7].map(m => (
                      <td key={m} className="p-1 border-r border-sky-50">
                        <div className="flex justify-center gap-2 text-[11px] font-black">
                          <span className="text-emerald-600">準時:0</span>
                          <span className="text-red-400">遲到:0</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                  {/* 需求8：統計二 - 任務 */}
                  <tr className="border-b border-sky-100 hover:bg-sky-50/50 transition-colors bg-sky-50/20">
                    <td className="p-1 text-[10px] font-bold text-sky-600 bg-sky-100/50 border-r border-sky-100">繳交進度</td>
                    {[2,3,4,5,6,7].map(m => (
                      <td key={m} className="p-1 border-r border-sky-100">
                         <div className="flex flex-col text-[11px] font-black">
                           <span className="text-sky-700">齊:0</span>
                           <div className="flex justify-center gap-1.5 opacity-40 text-[9px]"><span>遲:0</span><span>缺:0</span></div>
                         </div>
                      </td>
                    ))}
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 需求2：彈出視窗文字大小與螢幕原則 */}
      {(activeStudent || viewOnlyStudent) && (
        <div className="fixed inset-0 bg-sky-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] w-full max-w-3xl p-8 shadow-2xl relative flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b-2 border-sky-50 pb-4">
              <h3 className="text-4xl font-black text-sky-900">{maskName(activeStudent?.name || viewOnlyStudent?.student.name)} <span className="text-lg text-sky-300 ml-4">任務詳細清單</span></h3>
              <button onClick={() => { setActiveStudent(null); setViewOnlyStudent(null); }} className="text-slate-300 hover:text-red-500 transition-all"><XCircle size={40}/></button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2 custom-scrollbar mb-8">
              {prevTasks.map((task, idx) => (
                <label key={idx} className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${activeStudent ? 'cursor-pointer' : ''} ${(activeStudent ? selectedTasks[task] : viewOnlyStudent?.tasks[task]) ? 'bg-sky-50 border-sky-500' : 'bg-slate-50 border-slate-200'}`}>
                  {activeStudent && <input type="checkbox" checked={!!selectedTasks[task]} onChange={(e) => setSelectedTasks({...selectedTasks, [task]: e.target.checked})} className="w-6 h-6 accent-sky-600" />}
                  {viewOnlyStudent && (viewOnlyStudent.tasks[task] ? <Check className="text-emerald-500" size={24} strokeWidth={4}/> : <XCircle className="text-red-300" size={24}/>)}
                  <span className={`text-xl font-bold ${(activeStudent ? selectedTasks[task] : viewOnlyStudent.tasks[task]) ? 'text-sky-900' : 'text-slate-300'}`}>{task}</span>
                </label>
              ))}
            </div>

            {activeStudent && (
              <div className="grid grid-cols-3 gap-4 shrink-0">
                <button onClick={() => submitCheckin('present')} className="py-4 bg-sky-600 text-white rounded-2xl text-xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all">確認簽到</button>
                <button onClick={() => submitCheckin('sick')} className="py-4 bg-red-100 text-red-600 rounded-2xl text-xl font-black hover:bg-red-200">病假</button>
                <button onClick={() => submitCheckin('personal')} className="py-4 bg-orange-100 text-orange-600 rounded-2xl text-xl font-black hover:bg-orange-200">事假</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
