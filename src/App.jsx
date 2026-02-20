import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, orderBy, limit, serverTimestamp, getDoc, getDocs, increment } from 'firebase/firestore';
import { Ship, ScrollText, Check, Edit3, Star, Plus, Minus, AlignVerticalJustifyStart, AlignHorizontalJustifyStart, ChevronLeft, ChevronRight, CheckCircle2, UserCheck, XCircle, Clock, Lock, LogIn } from 'lucide-react';

// --- 配置區 (使用您點數系統的 Config) ---
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

// 路徑定義
const getBankPath = (id) => `/artifacts/class-5a-app/public/data/student_bank/${id}`;

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
  const [fontSize, setFontSize] = useState(48);
  const [isVertical, setIsVertical] = useState(false);
  const [leftWidth, setLeftWidth] = useState(55);
  const [activeStudent, setActiveStudent] = useState(null);
  const [prevTasks, setPrevTasks] = useState([]);
  const [prevDate, setPrevDate] = useState("");

  // 初始化 Firebase
  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    const firebaseAuth = getAuth(app);
    setDb(firestore);
    setAuth(firebaseAuth);

    onAuthStateChanged(firebaseAuth, (u) => setUser(u));
  }, []);

  // 監聽聯絡簿與簽到資料
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

  // --- 核心邏輯：計算打卡獎勵 ---
  const calculateReward = (studentId) => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes; // 轉為分鐘數方便比較

    const isSpecial = ['5', '7', '8'].includes(studentId);

    if (isSpecial) {
      if (currentTime <= 8 * 60 + 5) return 10; // 08:05 前
      if (currentTime <= 8 * 60 + 10) return 5; // 08:10 前
    } else {
      if (currentTime <= 7 * 60 + 30) return 10; // 07:30 前
      if (currentTime <= 7 * 60 + 40) return 5;  // 07:40 前
    }
    return 0; // 超過時間不觸發獎勵
  };

  // --- 核心邏輯：找尋「上一個有資料的聯絡簿」 ---
  const findLastAnnouncement = async () => {
    if (!db) return;
    const q = query(
      collection(db, "announcements"), 
      where("date", "<", formatDate(viewDate)), 
      orderBy("date", "desc"), 
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const lastDoc = querySnapshot.docs[0];
      setPrevDate(lastDoc.id);
      setPrevTasks(lastDoc.data().items || []);
    } else {
      setPrevTasks(["(無歷史資料)"]);
    }
  };

  // --- 行動：點擊學生簽到 ---
  const handleStudentClick = async (student) => {
    if (!db) return;
    if (user) { setActiveStudent(student); return; } // 老師模式直接開啟管理
    if (attendance[student.id]?.status === 'present') return;

    await findLastAnnouncement();
    setActiveStudent(student);
  };

  const submitCheckin = async (status = 'present') => {
    const dateKey = formatDate(viewDate);
    const rewardCoins = user ? 0 : calculateReward(activeStudent.id); // 只有學生端且在時間內有獎勵

    try {
      // 1. 寫入簽到表
      await setDoc(doc(db, `attendance_${dateKey}`, activeStudent.id), {
        name: activeStudent.name,
        status: status,
        reward: rewardCoins,
        timestamp: serverTimestamp()
      });

      // 2. 如果有獎勵，寫入點數系統的存摺
      if (rewardCoins > 0) {
        const bankRef = doc(db, getBankPath(activeStudent.id));
        await setDoc(bankRef, { 
          bronze: increment(rewardCoins),
          updatedAt: serverTimestamp() 
        }, { merge: true });
        alert(`打卡成功！您獲得了 ${rewardCoins} 個銅幣獎勵！`);
      }

      setActiveStudent(null);
    } catch (e) {
      console.error(e);
      alert("儲存失敗，請檢查權限");
    }
  };

  // --- 行動：發布聯絡簿 (同步建立點數系統的作業項) ---
  const handleSaveNote = async () => {
    if (!db || !user) return;
    const items = announcementText.split('\n').filter(i => i.trim() !== "");
    const dateKey = formatDate(viewDate);
    
    try {
      // 儲存於聯絡簿
      await setDoc(doc(db, "announcements", dateKey), { items, date: dateKey, updatedAt: serverTimestamp() });
      
      // 同步建立點數系統所需的資料 (讓點數系統自動抓取)
      const assignmentsRef = collection(db, `/artifacts/class-5a-app/public/data/assignments`);
      for (let item of items) {
        const q = query(assignmentsRef, where("assignmentDate", "==", dateKey), where("assignmentName", "==", item));
        const existing = await getDocs(q);
        if (existing.empty) {
          await setDoc(doc(assignmentsRef), {
            assignmentName: item,
            assignmentDate: dateKey,
            submissionStatus: STUDENTS.reduce((acc, s) => ({ ...acc, [s.id]: true }), {}),
            createdAt: serverTimestamp()
          });
        }
      }

      setIsEditing(false);
    } catch (e) { console.error(e); }
  };

  // 登入處理
  const handleLogin = async () => {
    const email = prompt("請輸入老師 Email");
    const password = prompt("請輸入密碼");
    if (email && password) {
      try { await signInWithEmailAndPassword(auth, email, password); } 
      catch (e) { alert("登入失敗"); }
    }
  };

  // 版面拖曳邏輯 (省略...同前次代碼)
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
    <div className="h-screen bg-[#F0F7FF] flex flex-col overflow-hidden font-sans">
      <header className="h-20 bg-white border-b-4 border-blue-100 flex items-center justify-between px-8 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => user ? signOut(auth) : handleLogin()}>
            <Ship className={`w-10 h-10 ${user ? 'text-emerald-600' : 'text-blue-600'}`} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-blue-900 leading-none">五甲航海打卡系統</h1>
            <p className="text-blue-500 font-bold text-sm mt-1">
              {viewDate.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
          </div>
        </div>
        {user && <div className="px-4 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">老師已登入 ({user.email})</div>}
        <div className="flex gap-2">
           <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)))} className="p-2 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"><ChevronLeft /></button>
           <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)))} className="p-2 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"><ChevronRight /></button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-4">
        {/* 左側：簽到 */}
        <div style={{ width: `${leftWidth}%` }} className="bg-white rounded-[2.5rem] shadow-lg p-8 flex flex-col border border-blue-50 overflow-hidden">
          <h2 className="text-xl font-bold mb-6 text-blue-800 flex items-center gap-2"><UserCheck /> 航海員簽到</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {STUDENTS.map(s => {
              const status = attendance[s.id]?.status;
              return (
                <button key={s.id} onClick={() => handleStudentClick(s)}
                  className={`h-24 rounded-3xl transition-all flex flex-col items-center justify-center border-b-8 active:border-b-0 active:translate-y-2
                  ${status === 'present' ? 'bg-blue-600 border-blue-800 text-white' : 
                    status === 'sick' ? 'bg-red-100 border-red-300 text-red-600' :
                    status === 'personal' ? 'bg-amber-100 border-amber-300 text-amber-600' :
                    'bg-slate-50 border-slate-200 text-slate-600 hover:bg-blue-50 shadow-sm'}`}>
                  <span className="text-[10px] font-bold opacity-40">No.{s.id}</span>
                  <span className="text-3xl font-black">{s.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 調整桿 */}
        <div onMouseDown={handleMouseDown} className="w-4 flex items-center justify-center cursor-col-resize hover:bg-blue-100 transition-colors">
          <div className="w-1 h-12 bg-blue-200 rounded-full"></div>
        </div>

        {/* 右側：聯絡簿 */}
        <div style={{ width: `${100 - leftWidth}%` }} className="bg-blue-900 rounded-[2.5rem] shadow-2xl p-8 text-white flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black flex items-center gap-2"><ScrollText /> 任務清單</h2>
            {user && (
              <button onClick={() => isEditing ? handleSaveNote() : setIsEditing(true)} 
                className={`px-6 py-2 rounded-xl font-bold transition-all shadow-md active:scale-95 ${isEditing ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                {isEditing ? '儲存任務' : '編輯任務'}
              </button>
            )}
          </div>
          <div className="flex-1 bg-black/20 rounded-[2rem] p-8 overflow-hidden flex flex-col border border-white/10">
            {isEditing ? (
              <textarea value={announcementText} onChange={e => setAnnouncementText(e.target.value)} autoFocus className="flex-1 bg-transparent text-white text-4xl font-bold outline-none resize-none leading-relaxed" />
            ) : (
              <div className={`h-full overflow-auto custom-scrollbar ${isVertical ? '[writing-mode:vertical-rl]' : ''}`} style={{ fontSize: `${fontSize}px` }}>
                {displayItems.map((item, i) => <div key={i} className="mb-4 font-bold flex gap-4"><span className="text-blue-400 shrink-0">{i+1}.</span>{item}</div>)}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 彈窗：簽到確認 */}
      {activeStudent && (
        <div className="fixed inset-0 bg-blue-900/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl p-10 shadow-2xl relative">
            <button onClick={() => setActiveStudent(null)} className="absolute top-6 right-6 text-slate-300 hover:text-slate-500"><XCircle size={40}/></button>
            <h3 className="text-4xl font-black text-blue-900 mb-6">{activeStudent.name}</h3>
            
            {user ? (
              <div className="grid grid-cols-3 gap-4">
                <button onClick={() => submitCheckin('present')} className="p-8 bg-blue-600 text-white rounded-3xl font-bold text-xl">已出席</button>
                <button onClick={() => submitCheckin('sick')} className="p-8 bg-red-500 text-white rounded-3xl font-bold text-xl">病假</button>
                <button onClick={() => submitCheckin('personal')} className="p-8 bg-amber-500 text-white rounded-3xl font-bold text-xl">事假</button>
              </div>
            ) : (
              <div>
                <div className="mb-6 p-6 bg-blue-50 rounded-3xl border border-blue-100">
                  <p className="text-blue-700 font-bold mb-2 flex items-center gap-2"><Clock /> 任務回顧 (日期：{prevDate})</p>
                  <div className="space-y-4 max-h-60 overflow-y-auto">
                    {prevTasks.map((t, idx) => (
                      <label key={idx} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 cursor-pointer">
                        <input type="checkbox" className="w-6 h-6 accent-blue-600" required />
                        <span className="font-bold text-slate-700">{t}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button onClick={() => submitCheckin('present')} className="w-full p-8 bg-blue-600 text-white rounded-3xl font-black text-2xl shadow-xl hover:scale-105 transition-transform">我已完成以上任務，簽到！</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
