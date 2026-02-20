import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, collection, onSnapshot, doc, setDoc, 
  query, where, orderBy, limit, getDocs, serverTimestamp, increment 
} from 'firebase/firestore';
import { Clock, Ship, Tooltip as TooltipIcon, Anchor, CheckCircle2, Waves, Coins, UserCheck, AlertCircle } from 'lucide-react';

// 使用您提供的 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyArwz6gPeW9lNq_8LOfnKYwZmkRN-Wgtb8",
  authDomain: "class-5a-app.firebaseapp.com",
  projectId: "class-5a-app",
  storageBucket: "class-5a-app.firebasestorage.app",
  messagingSenderId: "828328241350",
  appId: "1:828328241350:web:5d39d529209f87a2540fc7",
  measurementId: "G-8VGE0WKD01"
};

// 1-10 號名單與校車標記
const STUDENTS = [
  { id: '1', name: '陳○佑', bus: false }, { id: '2', name: '徐○倫', bus: false },
  { id: '3', name: '蕭○群', bus: false }, { id: '4', name: '吳○晏', bus: false },
  { id: '5', name: '呂○蔚', bus: true },  { id: '6', name: '吳○昇', bus: false },
  { id: '7', name: '翁○儀', bus: true },  { id: '8', name: '鄭○妍', bus: true },
  { id: '9', name: '周○涵', bus: false }, { id: '10', name: '李○妤', bus: false }
];

const App = () => {
  const [db, setDb] = useState(null);
  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastWorkday, setLastWorkday] = useState(null);
  const [yesterdayHw, setYesterdayHw] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [hwChecked, setHwChecked] = useState({});
  const [attendance, setAttendance] = useState({});

  // 初始化 Firebase
  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    const auth = getAuth(app);
    setDb(firestore);

    signInAnonymously(auth);
    onAuthStateChanged(auth, (u) => setUser(u));

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 智慧搜尋上一個上課日
  useEffect(() => {
    if (!db) return;
    const fetchLastWorkday = async () => {
      const q = query(
        collection(db, `/artifacts/class-5a-app/public/data/assignments`),
        where("assignmentDate", "<", new Date().toISOString().split('T')[0]),
        orderBy("assignmentDate", "desc"),
        limit(10)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const latestDate = snapshot.docs[0].data().assignmentDate;
        setLastWorkday(latestDate);
        const dayTasks = snapshot.docs
          .filter(d => d.data().assignmentDate === latestDate)
          .map(d => ({ id: d.id, name: d.data().assignmentName }));
        setYesterdayHw(dayTasks);
      }
    };
    fetchLastWorkday();
  }, [db]);

  // 獎勵邏輯計算
  const calculateReward = (student, time) => {
    const hour = time.getHours();
    const min = time.getMinutes();
    const timeVal = hour * 100 + min;
    
    let baseReward = 0;
    if (student.bus) { // 校車生: 5, 7, 8
      if (timeVal <= 805) baseReward = 10;
      else if (timeVal <= 810) baseReward = 5;
    } else { // 一般生
      if (timeVal <= 730) baseReward = 10;
      else if (timeVal <= 740) baseReward = 5;
    }

    const hwCount = Object.values(hwChecked).filter(v => v).length;
    return baseReward + (hwCount * 2); // 每項作業 2 銅幣
  };

  const handleConfirm = async () => {
    if (!selectedStudent || !db) return;
    const reward = calculateReward(selectedStudent, currentTime);
    
    // 更新 Firebase 存簿
    const bankRef = doc(db, `/artifacts/class-5a-app/public/data/student_bank`, selectedStudent.id);
    await setDoc(bankRef, {
      bronze: increment(reward),
      updatedAt: serverTimestamp()
    }, { merge: true });

    alert(`⚓ 航行紀錄完成！${selectedStudent.name} 獲得了 ${reward} 銅幣！`);
    setSelectedStudent(null);
    setHwChecked({});
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] font-sans text-slate-800 p-6 flex flex-col items-center">
      {/* 標題區 */}
      <header className="text-center mb-8">
        <h1 className="text-4xl font-black text-[#0C4A6E] flex items-center gap-3">
          <Waves className="w-10 h-10 text-sky-500 animate-pulse" />
          5A 深海航行者打卡系統
        </h1>
        <div className="mt-4 bg-white px-6 py-2 rounded-full shadow-sm border border-sky-100 flex items-center gap-4">
          <Clock className="w-6 h-6 text-sky-600" />
          <span className="text-2xl font-mono font-bold">{currentTime.toLocaleTimeString('zh-TW', { hour12: false })}</span>
        </div>
      </header>

      {/* 學生按鈕區 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full max-w-4xl">
        {STUDENTS.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedStudent(s)}
            className="h-24 bg-white border-b-8 border-sky-200 rounded-2xl flex flex-col items-center justify-center hover:translate-y-1 hover:border-b-4 transition-all active:scale-95 shadow-sm"
          >
            <span className="text-gray-400 text-sm font-bold">No.{s.id}</span>
            <span className="text-2xl font-bold text-slate-700">{s.name}</span>
          </button>
        ))}
      </div>

      {/* 航海任務視窗 (自檢作業) */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl border-4 border-sky-100">
            <h2 className="text-3xl font-black text-sky-900 mb-2 flex items-center gap-2">
              <Anchor className="w-8 h-8" /> ⚓ 航海任務回報
            </h2>
            <p className="text-slate-500 mb-6 font-bold">檢核日期：{lastWorkday}</p>
            
            <div className="space-y-3 mb-8">
              {yesterdayHw.map(hw => (
                <label key={hw.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-sky-50 transition-colors">
                  <input 
                    type="checkbox" 
                    className="w-6 h-6 rounded-lg text-sky-600 border-2 border-sky-200 focus:ring-sky-500" 
                    onChange={(e) => setHwChecked({...hwChecked, [hw.id]: e.target.checked})}
                  />
                  <span className="text-xl font-bold text-slate-700">{hw.name}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setSelectedStudent(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200">取消</button>
              <button onClick={handleConfirm} className="flex-2 py-4 bg-sky-600 text-white rounded-2xl font-bold shadow-lg shadow-sky-200 hover:bg-sky-500 flex items-center justify-center gap-2 px-8">
                <CheckCircle2 className="w-6 h-6" /> 確認提交
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部裝飾 */}
      <footer className="mt-12 opacity-30 pointer-events-none flex gap-8">
        <Ship className="w-12 h-12 text-sky-300" />
        <Waves className="w-12 h-12 text-sky-300" />
      </footer>
    </div>
  );
};

export default App;
