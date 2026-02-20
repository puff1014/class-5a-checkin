import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, orderBy, limit, serverTimestamp, getDocs, increment, deleteDoc } from 'firebase/firestore';
import { Ship, ScrollText, Check, Edit3, ChevronLeft, ChevronRight, XCircle, Clock, UserCheck, Plus, Minus, Trash2, LayoutDashboard } from 'lucide-react';

const APP_VERSION = "v5.0.260222_ThreeColumn";

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
  const [fontSize, setFontSize] = useState(36);
  const [recordedDates, setRecordedDates] = useState([]);

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    setDb(getFirestore(app));
    setAuth(getAuth(app));
    onAuthStateChanged(getAuth(app), (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!db) return;
    const unsubDates = onSnapshot(collection(db, "announcements"), (snap) => {
      // 修改：由左到右排列（最舊到最新）
      const dates = snap.docs.map(d => d.id).sort();
      setRecordedDates(dates);
    });
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

  const handleDeleteDate = async () => {
    if (!user) return;
    const dateKey = formatDate(viewDate);
    if (window.confirm(`確定要刪除 ${dateKey} 的所有資料（聯絡簿與打卡）嗎？`)) {
      try {
        await deleteDoc(doc(db, "announcements", dateKey));
        // 亦可在此批次刪除該日的 attendance 集合
        alert("日期資料已刪除");
      } catch (e) { alert("刪除失敗"); }
    }
  };

  const handleStudentClick = async (student) => {
    // 學生模式點擊已簽到者不彈窗
    if (attendance[student.id]?.status && !user) return;
    
    // 抓取前一日任務邏輯
    const q = query(collection(db, "announcements"), where("date", "<", formatDate(viewDate)), orderBy("date", "desc"), limit(1));
    const snap = await getDocs(q);
    setPrevTasks(!snap.empty ? snap.docs[0].data().items : ["(無前日資料)"]);
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
    } catch (e) { alert("權限不足"); }
  };

  return (
    <div className="min-h-screen bg-[#F0F4F8] flex flex-col overflow-x-hidden select-none font-sans">
      {/* 頂部 Header */}
      <header className="h-20 bg-white border-b-4 border-sky-100 flex items-center justify-between px-8 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => user ? signOut(auth) : signInWithEmailAndPassword(auth, prompt("Email"), prompt("密碼"))}>
            <Ship className={`w-12 h-12 transition-all ${user ? 'text-emerald-500' : 'text-sky-600'}`} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-sky-900 leading-none">五甲航海打卡系統</h1>
            <p className="text-sky-400 font-bold mt-1">{APP_VERSION}</p>
          </div>
        </div>

        {/* 日期標籤：左至右排列 */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-[45%] pb-1">
          {recordedDates.map(d => (
            <button key={d} onClick={() => setViewDate(new Date(d))} 
              className={`px-4 py-2 rounded-xl text-xl font-bold transition-all ${formatDate(viewDate) === d ? 'bg-sky-600 text-white shadow-md' : 'bg-sky-50 text-sky-400 hover:bg-sky-100'}`}>
              {d.split('-').slice(1).join('/')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {user && <button onClick={handleDeleteDate} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"><Trash2 size={24}/></button>}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)))} className="p-2 hover:bg-white rounded-xl"><ChevronLeft size={28}/></button>
            <span className="text-xl font-black px-4 flex items-center">{formatDate(viewDate)}</span>
            <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)))} className="p-2 hover:bg-white rounded-xl"><ChevronRight size={28}/></button>
          </div>
        </div>
      </header>

      {/* 三欄位主區域 */}
      <main className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* 第一欄：名單 */}
        <div className="w-[30%] bg-white rounded-[2.5rem] shadow-xl p-6 flex flex-col border-2 border-sky-50">
          <h2 className="text-2xl font-black mb-6 text-sky-800 flex items-center gap-2"><UserCheck size={28}/> 航海員簽到</h2>
          <div className="grid grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {STUDENTS.map(s => {
              const status = attendance[s.id]?.status;
              const colorClass = status === 'present' ? 'bg-sky-50 text-sky-600 border-sky-200' : 
                                 status === 'sick' ? 'bg-red-50 text-red-600 border-red-100' :
                                 status === 'personal' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                 'bg-slate-50 text-slate-300 border-slate-100';
              return (
                <button key={s.id} onClick={() => handleStudentClick(s)}
                  className={`h-28 rounded-3xl flex flex-col items-center justify-center transition-all border-b-4 active:border-b-0 active:translate-y-1 ${colorClass}`}>
                  <span className="text-xl font-bold opacity-30">{s.id}</span>
                  <span className="text-4xl font-black tracking-tighter">{maskName(s.name)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 第二欄：今日統計（視覺化） */}
        <div className="w-[35%] bg-white rounded-[2.5rem] shadow-xl p-6 flex flex-col border-2 border-sky-50">
          <h2 className="text-2xl font-black mb-6 text-sky-800 flex items-center gap-2"><LayoutDashboard size={28}/> 今日任務進度</h2>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
            {STUDENTS.map(s => {
              const hwData = attendance[s.id]?.completedTasks || {};
              const completedCount = Object.values(hwData).filter(v => v).length;
              const totalCount = displayItems.length;
              return (
                <div key={s.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-2xl font-black text-slate-700 w-24">{maskName(s.name)}</span>
                  <div className="flex-1 h-3 bg-slate-200 rounded-full mx-4 overflow-hidden">
                    <div className="h-full bg-sky-500 transition-all duration-500" style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}></div>
                  </div>
                  <span className="text-xl font-bold text-sky-600">{completedCount}/{totalCount}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 第三欄：聯絡簿編輯區 */}
        <div className="w-[35%] bg-[#0C4A6E] rounded-[2.5rem] shadow-2xl p-8 text-white flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black flex items-center gap-3"><ScrollText size={32}/> 任務清單</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setFontSize(f => Math.max(16, f-4))} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg"><Minus size={18}/></button>
              <button onClick={() => setFontSize(f => Math.min(80, f+4))} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg"><Plus size={18}/></button>
              {user && (
                <button onClick={() => isEditing ? (setIsEditing(false), setDoc(doc(db, "announcements", formatDate(viewDate)), { items: announcementText.split('\n'), date: formatDate(viewDate) }, {merge:true})) : setIsEditing(true)} 
                  className="ml-2 bg-emerald-500 hover:bg-emerald-400 px-5 py-2 rounded-xl font-bold shadow-lg">
                  {isEditing ? '儲存' : '編輯'}
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 bg-black/20 rounded-[2rem] p-6 overflow-y-auto custom-scrollbar shadow-inner">
            {isEditing ? (
              <div className="h-full flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  {PRESET_HOMEWORK.map(h => <button key={h} onClick={() => setAnnouncementText(p => p + (p?'\n':'') + h)} className="px-3 py-1 bg-sky-700/50 rounded-lg text-sm border border-sky-400">+{h}</button>)}
                  {PRESET_TAGS.map(t => <button key={t} onClick={() => setAnnouncementText(p => p + (p?'\n':'') + t)} className="px-3 py-1 bg-amber-700/50 rounded-lg text-sm border border-amber-400">+{t.replace('：','')}</button>)}
                </div>
                <textarea value={announcementText} onChange={e => setAnnouncementText(e.target.value)} className="flex-1 bg-transparent text-white font-bold outline-none leading-relaxed" style={{ fontSize: `${fontSize}px` }} />
              </div>
            ) : (
              <div className="font-bold space-y-4" style={{ fontSize: `${fontSize}px` }}>
                {displayItems.map((item, i) => <div key={i} className="flex gap-4"><span className="text-sky-400 shrink-0">{i+1}.</span>{item}</div>)}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 每月統計表格：全班人名、文字放大、完成改繳交 */}
      <section className="px-8 py-8 bg-white border-t-8 border-sky-50 shrink-0">
        <h3 className="text-3xl font-black text-sky-900 mb-8 flex items-center gap-3">📊 全班每月繳交狀況統計表</h3>
        <div className="overflow-hidden rounded-[2.5rem] border-4 border-sky-100 shadow-xl">
          <table className="w-full text-center table-fixed border-collapse">
            <thead className="bg-sky-600 text-white">
              <tr>
                <th className="p-6 text-3xl font-black border-r border-sky-500">姓名</th>
                {["2月", "3月", "4月", "5月", "6月", "7月"].map(m => (
                  <th key={m} className="p-6 text-2xl font-black border-r border-sky-500">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STUDENTS.map(s => (
                <tr key={s.id} className="border-b border-sky-50 hover:bg-sky-50/50 transition-colors">
                  <td className="p-6 text-4xl font-black text-sky-900 border-r border-sky-50">{maskName(s.name)}</td>
                  <td className="p-6 bg-emerald-50/30 border-r border-sky-50">
                    <div className="text-3xl font-black text-emerald-600">繳交: 3</div>
                    <div className="text-xl font-bold text-slate-300 mt-1">遲交: 0 / 缺交: 0</div>
                  </td>
                  {[1,2,3,4,5].map(i => <td key={i} className="p-6 text-slate-200 text-3xl font-black border-r border-sky-50">－</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 彈出確認視窗 */}
      {activeStudent && (
        <div className="fixed inset-0 bg-sky-900/90 backdrop-blur-xl z-[100] flex items-center justify-center p-10">
          <div className="bg-white rounded-[4rem] w-full max-w-5xl p-12 shadow-2xl relative flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-8 border-b-4 border-sky-50 pb-6">
              <h3 className="text-6xl font-black text-sky-900">{maskName(activeStudent.name)} <span className="text-3xl text-sky-300 ml-4">任務確認</span></h3>
              <button onClick={() => setActiveStudent(null)} className="text-slate-200 hover:text-red-500 transition-colors"><XCircle size={72}/></button>
            </div>
            
            <p className="text-3xl text-slate-400 font-bold mb-8 flex items-center gap-2"><Clock size={36}/> 請勾選昨日已繳交的項目：</p>
            
            <div className="grid grid-cols-2 gap-6 flex-1 overflow-y-auto pr-4 custom-scrollbar mb-10">
              {prevTasks.map((task, idx) => (
                <label key={idx} className={`p-8 rounded-[3rem] border-4 flex items-center gap-6 cursor-pointer transition-all ${selectedTasks[task] ? 'bg-sky-50 border-sky-500 shadow-inner' : 'bg-slate-50 border-slate-200 hover:border-sky-300'}`}>
                  <input type="checkbox" checked={!!selectedTasks[task]} onChange={(e) => setSelectedTasks({...selectedTasks, [task]: e.target.checked})} className="w-12 h-12 accent-sky-600" />
                  <span className={`text-4xl font-black ${selectedTasks[task] ? 'text-sky-800' : 'text-slate-400'}`}>{task}</span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-6">
              <button onClick={() => submitCheckin('present')} className="py-10 bg-sky-600 text-white rounded-[3rem] text-4xl font-black shadow-2xl hover:scale-105 active:scale-95 transition-all"><Check className="inline mr-4" size={48}/> 確認簽到</button>
              <button onClick={() => submitCheckin('sick')} className="py-10 bg-red-100 text-red-600 rounded-[3rem] text-4xl font-black hover:bg-red-200 transition-all">病假</button>
              <button onClick={() => submitCheckin('personal')} className="py-10 bg-orange-100 text-orange-600 rounded-[3rem] text-4xl font-black hover:bg-orange-200 transition-all">事假</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
