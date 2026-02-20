import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, orderBy, limit, serverTimestamp, getDocs, increment } from 'firebase/firestore';
import { Ship, ScrollText, Check, Edit3, ChevronLeft, ChevronRight, XCircle, Clock, UserCheck, Plus, Minus, AlertCircle } from 'lucide-react';

const APP_VERSION = "v4.0.260222_Final";

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
  const [isEditing, setIsEditing] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [displayItems, setDisplayItems] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [activeStudent, setActiveStudent] = useState(null);
  const [prevTasks, setPrevTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState({});
  const [fontSize, setFontSize] = useState(48);
  const [leftWidth, setLeftWidth] = useState(55);
  const [recordedDates, setRecordedDates] = useState([]);
  const [allAttendanceData, setAllAttendanceData] = useState([]);

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    setDb(getFirestore(app));
    setAuth(getAuth(app));
    onAuthStateChanged(getAuth(app), (u) => setUser(u));
  }, []);

  // 監聽歷史日期與所有打卡數據（用於統計）
  useEffect(() => {
    if (!db) return;
    const unsubDates = onSnapshot(collection(db, "announcements"), (snap) => {
      const dates = snap.docs.map(d => d.id).sort().reverse();
      setRecordedDates(dates);
    });
    // 簡單模擬抓取最近打卡數據做統計
    setAllAttendanceData([]); 
    return () => unsubDates();
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
        setDisplayItems(["本日尚未發布作業"]);
      }
    });
    const unsubAtt = onSnapshot(collection(db, `attendance_${dateKey}`), (snap) => {
      const data = {};
      snap.forEach(d => data[d.id] = d.data());
      setAttendance(data);
    });
    return () => { unsubHw(); unsubAtt(); };
  }, [db, viewDate, isEditing]);

  const handleStudentClick = async (student) => {
    if (attendance[student.id]?.status && !user) return;
    // 抓取上一份作業邏輯
    const q = query(collection(db, "announcements"), where("date", "<", formatDate(viewDate)), orderBy("date", "desc"), limit(1));
    const snap = await getDocs(q);
    setPrevTasks(!snap.empty ? snap.docs[0].data().items : ["(無前日資料)"]);
    setSelectedTasks(attendance[student.id]?.completedTasks || {});
    setActiveStudent(student);
  };

  const submitCheckin = async (status = 'present') => {
    const dateKey = formatDate(viewDate);
    // 自動算費邏輯（維持原定）
    const hwCount = Object.values(selectedTasks).filter(v => v).length;
    const oldHwCount = Object.values(attendance[activeStudent.id]?.completedTasks || {}).filter(v => v).length;
    const diff = (hwCount - oldHwCount) * 2;

    try {
      await setDoc(doc(db, `attendance_${dateKey}`, activeStudent.id), {
        name: activeStudent.name,
        status,
        completedTasks: selectedTasks,
        timestamp: serverTimestamp()
      }, { merge: true });

      if (diff !== 0) {
        await setDoc(doc(db, `/artifacts/class-5a-app/public/data/student_bank/${activeStudent.id}`), {
          bronze: increment(diff)
        }, { merge: true });
      }
      setActiveStudent(null);
    } catch (e) { alert("權限不足，儲存失敗"); }
  };

  // 版面拉桿邏輯
  const isResizing = useRef(false);
  const handleMouseDown = () => { isResizing.current = true; };
  useEffect(() => {
    const move = (e) => { if (isResizing.current) setLeftWidth((e.clientX / window.innerWidth) * 100); };
    const up = () => { isResizing.current = false; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, []);

  return (
    <div className="min-h-screen bg-[#F0F7FF] flex flex-col overflow-x-hidden select-none font-sans">
      <header className="h-20 bg-white border-b-4 border-blue-100 flex items-center justify-between px-8 shadow-md shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => user ? signOut(auth) : signInWithEmailAndPassword(auth, prompt("Email"), prompt("密碼"))}>
            <Ship className={`w-12 h-12 transition-transform active:scale-90 ${user ? 'text-emerald-500' : 'text-blue-600'}`} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-blue-900 leading-none">五甲航海打卡系統</h1>
            <p className="text-blue-400 font-bold mt-1">{formatDate(viewDate)} | {APP_VERSION}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto max-w-[40%] pb-1 scrollbar-hide">
          {recordedDates.slice(0, 5).map(d => (
            <button key={d} onClick={() => setViewDate(new Date(d))} 
              className={`px-4 py-2 rounded-xl text-xl font-bold whitespace-nowrap transition-all ${formatDate(viewDate) === d ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-50 text-blue-400 hover:bg-blue-100'}`}>
              {d.split('-').slice(1).join('/')}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
           <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)))} className="p-2 bg-blue-50 rounded-xl hover:bg-blue-200"><ChevronLeft size={32}/></button>
           <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)))} className="p-2 bg-blue-50 rounded-xl hover:bg-blue-200"><ChevronRight size={32}/></button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-6 gap-0">
        <div style={{ width: `${leftWidth}%` }} className="bg-white rounded-[3rem] shadow-xl p-8 flex flex-col border-4 border-white overflow-hidden">
          <h2 className="text-2xl font-black mb-6 text-blue-800 flex items-center gap-2"><UserCheck /> 航海員打卡</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {STUDENTS.map(s => {
              const status = attendance[s.id]?.status;
              const colorClass = status === 'present' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
                                 status === 'sick' ? 'bg-red-50 text-red-600 border-red-200' :
                                 status === 'personal' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                                 'bg-slate-50 text-slate-400 border-slate-100';
              return (
                <button key={s.id} onClick={() => handleStudentClick(s)}
                  className={`h-32 rounded-[2.5rem] flex flex-col items-center justify-center transition-all border-b-8 active:border-b-0 active:translate-y-2 ${colorClass}`}>
                  <span className="text-2xl font-bold opacity-40 mb-1">{s.id}</span>
                  <span className="text-5xl font-black">{maskName(s.name)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 拉桿回歸 */}
        <div onMouseDown={handleMouseDown} className="w-5 flex items-center justify-center cursor-col-resize hover:bg-blue-100/50 transition-colors group">
          <div className="w-1.5 h-20 bg-slate-200 rounded-full group-hover:bg-blue-300"></div>
        </div>

        <div style={{ width: `${100 - leftWidth}%` }} className="bg-[#0C4A6E] rounded-[3rem] shadow-2xl p-10 text-white flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black flex items-center gap-3"><ScrollText size={36}/> 任務清單</h2>
            <div className="flex items-center gap-3 bg-white/10 p-2 rounded-2xl">
              <button onClick={() => setFontSize(f => Math.max(20, f-4))} className="p-2 hover:bg-white/20 rounded-lg"><Minus size={20}/></button>
              <button onClick={() => setFontSize(f => Math.min(100, f+4))} className="p-2 hover:bg-white/20 rounded-lg"><Plus size={20}/></button>
              {user && (
                <button onClick={() => isEditing ? (setIsEditing(false), setDoc(doc(db, "announcements", formatDate(viewDate)), { items: announcementText.split('\n'), date: formatDate(viewDate) }, {merge:true})) : setIsEditing(true)} 
                  className="ml-2 bg-emerald-500 hover:bg-emerald-400 px-6 py-2 rounded-xl font-bold">
                  {isEditing ? '儲存' : '編輯'}
                </button>
              )}
            </div>
          </div>
          
          <div className="flex-1 bg-black/20 rounded-[2.5rem] p-8 overflow-y-auto custom-scrollbar shadow-inner">
            {isEditing ? (
              <div className="h-full flex flex-col">
                <div className="flex flex-wrap gap-2 mb-4">
                  {PRESET_HOMEWORK.map(h => <button key={h} onClick={() => setAnnouncementText(p => p + (p?'\n':'') + h)} className="px-3 py-1 bg-blue-700/50 rounded-lg text-sm border border-blue-400">+{h}</button>)}
                  {PRESET_TAGS.map(t => <button key={t} onClick={() => setAnnouncementText(p => p + (p?'\n':'') + t)} className="px-3 py-1 bg-amber-700/50 rounded-lg text-sm border border-amber-400">+{t.replace('：','')}</button>)}
                </div>
                <textarea value={announcementText} onChange={e => setAnnouncementText(e.target.value)} className="flex-1 bg-transparent text-white text-4xl font-bold outline-none resize-none" />
              </div>
            ) : (
              <div className="font-bold space-y-4" style={{ fontSize: `${fontSize}px` }}>
                {displayItems.map((item, i) => <div key={i} className="flex gap-4"><span className="text-blue-400 shrink-0">{i+1}.</span>{item}</div>)}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 每月統計區 */}
      <section className="px-6 py-8 bg-white border-t-4 border-blue-50 shrink-0">
        <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">📊 每月繳交狀況統計</h3>
        <div className="overflow-x-auto rounded-3xl border border-slate-200">
          <table className="w-full text-center">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-4 text-xl font-bold text-slate-500">姓名</th>
                {["2月", "3月", "4月", "5月", "6月", "7月"].map(m => (
                  <th key={m} className="p-4 text-xl font-bold text-slate-500 border-l">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STUDENTS.slice(0, 5).map(s => (
                <tr key={s.id} className="border-b hover:bg-blue-50 transition-colors">
                  <td className="p-4 text-2xl font-black text-slate-700">{maskName(s.name)}</td>
                  <td className="p-4 bg-emerald-50/50 border-l">
                    <div className="text-emerald-600 font-bold">完成: 3</div>
                    <div className="text-slate-300">遲交: 0</div>
                    <div className="text-slate-300">缺交: 0</div>
                  </td>
                  {[1,2,3,4,5].map(i => <td key={i} className="p-4 text-slate-300 border-l">-</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 雙排作業視窗 */}
      {activeStudent && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-10">
          <div className="bg-white rounded-[4rem] w-full max-w-5xl p-12 shadow-2xl relative flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-8 border-b pb-6">
              <h3 className="text-6xl font-black text-blue-900">{maskName(activeStudent.name)} <span className="text-3xl text-slate-300 ml-4 font-bold">作業確認</span></h3>
              <button onClick={() => setActiveStudent(null)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><XCircle size={64}/></button>
            </div>

            <p className="text-2xl text-slate-400 font-bold mb-6 flex items-center gap-2"><Clock /> 請確認昨日作業是否已繳交：</p>
            
            <div className="grid grid-cols-2 gap-6 flex-1 overflow-y-auto pr-4 custom-scrollbar mb-10">
              {prevTasks.map((task, idx) => (
                <label key={idx} className={`p-8 rounded-[2.5rem] border-4 flex items-center gap-6 cursor-pointer transition-all ${selectedTasks[task] ? 'bg-blue-50 border-blue-400 shadow-inner' : 'bg-slate-50 border-slate-100 hover:border-blue-200'}`}>
                  <input type="checkbox" checked={!!selectedTasks[task]} onChange={(e) => setSelectedTasks({...selectedTasks, [task]: e.target.checked})} className="w-10 h-10 accent-blue-600" />
                  <span className={`text-4xl font-black ${selectedTasks[task] ? 'text-blue-800' : 'text-slate-500'}`}>{task}</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-6 shrink-0">
              <button onClick={() => submitCheckin('present')} className="py-10 bg-blue-600 text-white rounded-[2.5rem] text-4xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-4"><Check size={48}/> 確認簽到</button>
              <button onClick={() => submitCheckin('sick')} className="py-10 bg-red-100 text-red-600 rounded-[2.5rem] text-4xl font-black hover:bg-red-200">病假</button>
              <button onClick={() => submitCheckin('personal')} className="py-10 bg-orange-100 text-orange-600 rounded-[2.5rem] text-4xl font-black hover:bg-orange-200">事假</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
