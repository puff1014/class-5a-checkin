import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, orderBy, limit, serverTimestamp, getDocs, increment, updateDoc } from 'firebase/firestore';
import { Ship, ScrollText, Check, Edit3, ChevronLeft, ChevronRight, XCircle, Clock, UserCheck, Plus, Save } from 'lucide-react';

// --- 配置區 (使用您的 Firebase Config) ---
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

const maskName = (name) => {
  if (!name) return "";
  if (name.length <= 2) return name[0] + "O";
  return name[0] + "O" + name.substring(2);
};

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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
  const [selectedTasks, setSelectedTasks] = useState({}); // 學生/老師勾選狀態

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    const firebaseAuth = getAuth(app);
    setDb(firestore);
    setAuth(firebaseAuth);
    onAuthStateChanged(firebaseAuth, (u) => setUser(u));
  }, []);

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

  // 找尋上一個有資料的日期
  const findLastData = async () => {
    const q = query(collection(db, "announcements"), where("date", "<", formatDate(viewDate)), orderBy("date", "desc"), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      setPrevTasks(snap.docs[0].data().items || []);
      return snap.docs[0].id;
    }
    return null;
  };

  const calculateCheckinReward = (studentId) => {
    const now = new Date();
    const time = now.getHours() * 60 + now.getMinutes();
    const isSpecial = ['5', '7', '8'].includes(studentId);
    if (isSpecial) {
      if (time <= 8 * 60 + 5) return 10;
      if (time <= 8 * 60 + 10) return 5;
    } else {
      if (time <= 7 * 60 + 30) return 10;
      if (time <= 7 * 60 + 40) return 5;
    }
    return 0;
  };

  const handleStudentClick = async (student) => {
    if (attendance[student.id]?.status === 'present' && !user) return;
    await findLastData();
    // 如果是老師，預載該生已勾選的作業
    if (user) {
      setSelectedTasks(attendance[student.id]?.completedTasks || {});
    } else {
      setSelectedTasks({});
    }
    setActiveStudent(student);
  };

  const submitCheckin = async (status = 'present') => {
    const dateKey = formatDate(viewDate);
    const hwReward = Object.values(selectedTasks).filter(v => v).length * 2;
    const timeReward = user ? 0 : calculateCheckinReward(activeStudent.id);
    const totalNewReward = timeReward + hwReward;

    try {
      // 學生端打卡
      await setDoc(doc(db, `attendance_${dateKey}`, activeStudent.id), {
        name: activeStudent.name,
        status,
        completedTasks: selectedTasks,
        rewardReceived: totalNewReward,
        timestamp: serverTimestamp()
      });

      // 更新存簿
      if (totalNewReward > 0) {
        await updateDoc(doc(db, `/artifacts/class-5a-app/public/data/student_bank/${activeStudent.id}`), {
          bronze: increment(totalNewReward)
        });
      }
      setActiveStudent(null);
    } catch (e) { alert("儲存失敗"); }
  };

  // 老師修正邏輯：自動補扣差額
  const teacherUpdate = async (newStatus) => {
    const dateKey = formatDate(viewDate);
    const oldData = attendance[activeStudent.id] || {};
    const oldHwCount = Object.values(oldData.completedTasks || {}).filter(v => v).length;
    const newHwCount = Object.values(selectedTasks).filter(v => v).length;
    const diff = (newHwCount - oldHwCount) * 2;

    await setDoc(doc(db, `attendance_${dateKey}`, activeStudent.id), {
      ...oldData,
      status: newStatus,
      completedTasks: selectedTasks,
      rewardReceived: (oldData.rewardReceived || 0) + diff
    });

    if (diff !== 0) {
      await updateDoc(doc(db, `/artifacts/class-5a-app/public/data/student_bank/${activeStudent.id}`), {
        bronze: increment(diff)
      });
    }
    setActiveStudent(null);
  };

  return (
    <div className="h-screen bg-[#F8FAFC] flex flex-col overflow-hidden">
      {/* 頂部導航 */}
      <header className="bg-white border-b px-8 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-6">
          <Ship className={`w-12 h-12 ${user ? 'text-emerald-500' : 'text-blue-600'}`} onClick={() => !user && signInWithEmailAndPassword(auth, prompt("Email"), prompt("密碼"))} />
          <h1 className="text-4xl font-black text-slate-800">五甲航海日誌</h1>
          {user && <span className="bg-emerald-500 text-white px-4 py-1 rounded-full text-lg font-bold">老師模式</span>}
        </div>
        <div className="flex items-center gap-4 bg-slate-100 p-2 rounded-2xl">
          <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)))} className="p-3 hover:bg-white rounded-xl transition-all"><ChevronLeft size={32}/></button>
          <span className="text-2xl font-bold px-4">{formatDate(viewDate)}</span>
          <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)))} className="p-3 hover:bg-white rounded-xl transition-all"><ChevronRight size={32}/></button>
        </div>
      </header>

      <div className="flex-1 flex p-6 gap-6 overflow-hidden">
        {/* 左側：學生名單 */}
        <div className="flex-[1.2] bg-white rounded-[3rem] shadow-xl p-8 overflow-y-auto border-4 border-blue-50">
          <div className="grid grid-cols-2 gap-6">
            {STUDENTS.map(s => (
              <button key={s.id} onClick={() => handleStudentClick(s)}
                className={`h-32 rounded-[2rem] flex flex-col items-center justify-center transition-all border-b-8 active:border-b-0 active:translate-y-2
                ${attendance[s.id]?.status === 'present' ? 'bg-blue-600 border-blue-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                <span className="text-lg opacity-60 font-bold">座號 {s.id}</span>
                <span className="text-5xl font-black tracking-widest">{maskName(s.name)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 右側：聯絡簿 */}
        <div className="flex-1 bg-slate-900 rounded-[3rem] shadow-2xl p-10 text-white flex flex-col relative">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-4xl font-black flex items-center gap-3"><ScrollText size={40}/> 今日任務</h2>
            {user && (
              <button onClick={() => isEditing ? (setIsEditing(false), setDoc(doc(db, "announcements", formatDate(viewDate)), { items: announcementText.split('\n'), date: formatDate(viewDate) })) : setIsEditing(true)} 
                className="bg-blue-500 hover:bg-blue-400 px-8 py-3 rounded-2xl font-bold text-xl transition-all">
                {isEditing ? '儲存任務' : '編輯任務'}
              </button>
            )}
          </div>
          
          <div className="flex-1 bg-white/5 rounded-[2rem] p-8 border border-white/10 overflow-y-auto">
            {isEditing ? (
              <div className="h-full flex flex-col gap-4">
                <div className="flex gap-2 flex-wrap mb-4">
                  {PRESET_HOMEWORK.map(ph => <button key={ph} onClick={() => setAnnouncementText(prev => prev + (prev ? '\n' : '') + ph)} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm font-bold border border-white/20">+{ph}</button>)}
                </div>
                <textarea value={announcementText} onChange={e => setAnnouncementText(e.target.value)} className="flex-1 bg-transparent text-4xl font-bold outline-none leading-relaxed w-full h-full" placeholder="在此輸入作業項目..." />
              </div>
            ) : (
              <div className="text-5xl font-black leading-[1.6] space-y-6">
                {displayItems.map((item, i) => <div key={i} className="flex gap-4"><span className="text-blue-400">{i+1}.</span>{item}</div>)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 巨型彈出視窗 */}
      {activeStudent && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[100] flex items-center justify-center p-10">
          <div className="bg-white rounded-[4rem] w-full max-w-4xl p-12 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-7xl font-black text-slate-800 mb-4">{maskName(activeStudent.name)}</h3>
                <p className="text-3xl text-slate-400 font-bold">請確認昨日作業是否已繳交：</p>
              </div>
              <button onClick={() => setActiveStudent(null)} className="text-slate-200 hover:text-red-500 transition-colors"><XCircle size={80}/></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 mb-10 pr-4 custom-scrollbar">
              {prevTasks.map((task, idx) => (
                <label key={idx} className={`flex items-center gap-8 p-10 rounded-[2.5rem] border-4 transition-all cursor-pointer ${selectedTasks[task] ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-slate-100'}`}>
                  <input type="checkbox" checked={!!selectedTasks[task]} onChange={(e) => setSelectedTasks({...selectedTasks, [task]: e.target.checked})} className="w-12 h-12 accent-emerald-500" />
                  <span className={`text-5xl font-black ${selectedTasks[task] ? 'text-emerald-700' : 'text-slate-600'}`}>{task}</span>
                </label>
              ))}
            </div>

            {user ? (
              <div className="grid grid-cols-3 gap-6">
                <button onClick={() => teacherUpdate('present')} className="py-8 bg-blue-600 text-white rounded-[2rem] text-4xl font-black shadow-lg">更新並出席</button>
                <button onClick={() => teacherUpdate('sick')} className="py-8 bg-red-500 text-white rounded-[2rem] text-4xl font-black shadow-lg">病假</button>
                <button onClick={() => teacherUpdate('personal')} className="py-8 bg-amber-500 text-white rounded-[2rem] text-4xl font-black shadow-lg">事假</button>
              </div>
            ) : (
              <button onClick={() => submitCheckin('present')} className="w-full py-12 bg-blue-600 hover:bg-blue-500 text-white rounded-[3rem] text-6xl font-black shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-6">
                <UserCheck size={60}/> 確認簽到並領取獎勵
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
