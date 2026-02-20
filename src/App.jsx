import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, orderBy, limit, serverTimestamp, increment } from 'firebase/firestore';
import { Clock, Ship, Anchor, CheckCircle2, Waves, ScrollText, Send, Star, Megaphone, UserX, Lock, Calendar, Plus, Minus, Type, AlignVerticalJustifyStart, AlignHorizontalJustifyStart, FileJson, Upload, Download } from 'lucide-react';

// 版本號碼
const APP_VERSION = "v2.0.260220";

const firebaseConfig = {
  apiKey: "AIzaSyArwz6gPeW9lNq_8LOfnKYwZmkRN-Wgtb8",
  authDomain: "class-5a-app.firebaseapp.com",
  projectId: "class-5a-app",
  storageBucket: "class-5a-app.firebasestorage.app",
  messagingSenderId: "828328241350",
  appId: "1:828328241350:web:5d39d529209f87a2540fc7"
};

const STUDENTS = [
  { id: '1', name: '陳○佑' }, { id: '2', name: '徐○綸' },
  { id: '3', name: '蕭○群' }, { id: '4', name: '吳○晏' },
  { id: '5', name: '呂○蔚' }, { id: '6', name: '吳○昇' },
  { id: '7', name: '翁○儀' }, { id: '8', name: '鄭○妍' },
  { id: '9', name: '周○涵' }, { id: '10', name: '李○妤' }
];

const PRESET_HOMEWORK = ["預習數課", "數習", "數八", "背成+小+寫"];
const PRESET_TAGS = ["帶學用品：", "訂正作業："];

const App = () => {
  const [db, setDb] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTeacher, setIsTeacher] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [latestHomework, setLatestHomework] = useState([]);
  const [hwDate, setHwDate] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [attendance, setAttendance] = useState({});
  const [hwChecked, setHwChecked] = useState({});
  
  // 新增：視覺與佈局狀態
  const [splitRatio, setSplitRatio] = useState(60); // 左側佔比 %
  const [fontSize, setFontSize] = useState(32); // 聯絡簿字體 px
  const [isVertical, setIsVertical] = useState(false); // 是否直式書寫
  const splitContainerRef = useRef(null);

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    setDb(firestore);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    const q = query(collection(firestore, `/artifacts/class-5a-app/public/data/announcements`), orderBy("createdAt", "desc"), limit(1));
    const unsubAnnounce = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setLatestHomework(data.items || []);
        setHwDate(data.date || "");
      }
    });

    onSnapshot(collection(firestore, `/artifacts/class-5a-app/public/data/attendance`), (snapshot) => {
      const attData = {};
      snapshot.forEach(doc => attData[doc.id] = doc.data().status);
      setAttendance(attData);
    });

    return () => { clearInterval(timer); unsubAnnounce(); };
  }, []);

  // 處理分屏拖動
  const handleMouseDown = (e) => {
    const handleMouseMove = (moveEvent) => {
      if (splitContainerRef.current) {
        const containerWidth = splitContainerRef.current.offsetWidth;
        let newRatio = (moveEvent.clientX / containerWidth) * 100;
        if (newRatio > 30 && newRatio < 80) setSplitRatio(newRatio);
      }
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleLogin = () => {
    const pw = prompt("請輸入導航員密碼：");
    if (pw === "123+++") setIsTeacher(true);
  };

  const handlePostAnnouncement = async () => {
    const items = announcement.split('\n').filter(i => i.trim());
    await setDoc(doc(collection(db, `/artifacts/class-5a-app/public/data/announcements`)), {
      items,
      date: new Date().toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }),
      createdAt: serverTimestamp()
    });
    setAnnouncement("");
    alert("📢 聯絡簿同步成功！");
  };

  return (
    <div className="h-screen bg-[#F0F9FF] flex flex-col overflow-hidden font-sans selection:bg-sky-200">
      {/* 頂部 Header */}
      <header className="h-24 shrink-0 flex items-center justify-between px-10 bg-white/80 backdrop-blur shadow-sm z-20">
        <div className="flex items-center gap-6">
          <button onClick={handleLogin} className="hover:rotate-12 transition-transform">
            <Ship className={`w-12 h-12 ${isTeacher ? 'text-yellow-500' : 'text-sky-600'}`} />
          </button>
          <h1 className="text-4xl font-black text-[#0C4A6E] tracking-tighter">五年甲班打卡系統</h1>
        </div>
        
        <div className="flex items-center gap-4 bg-sky-50 px-6 py-2 rounded-2xl border-2 border-sky-100">
          <Calendar className="text-sky-600 w-5 h-5" />
          <span className="text-xl font-bold text-slate-700">{currentTime.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })}</span>
          <span className="text-2xl font-mono font-black text-sky-600 border-l-2 ml-4 pl-4">{currentTime.toLocaleTimeString()}</span>
        </div>
      </header>

      {/* 主體區域 */}
      <main ref={splitContainerRef} className="flex-1 flex overflow-hidden p-4 gap-2 relative">
        
        {/* 左側：學生區 */}
        <div style={{ width: `${splitRatio}%` }} className="flex flex-col bg-white rounded-[3rem] shadow-xl border-4 border-white overflow-hidden p-8">
          <div className="flex justify-between items-end mb-6">
            <h2 className="text-3xl font-black text-sky-900 flex items-center gap-3"><Star className="fill-yellow-400 text-yellow-400" /> 水手名單</h2>
            <div className="flex gap-2">
              <StatBadge label="應到" value={STUDENTS.length} color="bg-slate-100 text-slate-600" />
              <StatBadge label="請假" value={Object.values(attendance).filter(v => v !== '出席').length} color="bg-red-100 text-red-600" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2">
            {STUDENTS.map(s => (
              <button key={s.id} onClick={() => setSelectedStudent(s)} disabled={attendance[s.id] && attendance[s.id] !== '出席'}
                className={`relative h-28 rounded-3xl shadow-md transition-all flex flex-col items-center justify-center border-b-8 active:border-b-0 active:translate-y-2
                  ${attendance[s.id] && attendance[s.id] !== '出席' ? 'bg-slate-100 border-slate-200 grayscale' : 'bg-white border-sky-100 hover:bg-sky-50'}`}>
                <span className="absolute top-2 left-4 text-slate-300 font-black text-lg">No.{s.id}</span>
                <span className="text-3xl font-black text-slate-700">{s.name}</span>
                {attendance[s.id] && attendance[s.id] !== '出席' && <span className="text-sm font-bold text-red-500">{attendance[s.id]}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* 分屏拖動條 */}
        <div onMouseDown={handleMouseDown} className="w-2 hover:bg-sky-200 cursor-col-resize rounded-full transition-colors flex items-center justify-center">
          <div className="w-1 h-12 bg-sky-100 rounded-full" />
        </div>

        {/* 右側：聯絡簿 */}
        <div style={{ width: `${100 - splitRatio}%` }} className="flex flex-col bg-[#0C4A6E] rounded-[3rem] shadow-2xl p-8 text-white relative">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-3xl font-black flex items-center gap-3"><ScrollText /> 班級聯絡簿</h2>
            <div className="flex gap-1 bg-white/10 p-1 rounded-xl">
              <button onClick={() => setFontSize(f => Math.max(16, f-4))} className="p-2 hover:bg-white/20 rounded-lg"><Minus size={16}/></button>
              <span className="px-2 py-1 font-mono text-sm">{fontSize}</span>
              <button onClick={() => setFontSize(f => Math.min(72, f+4))} className="p-2 hover:bg-white/20 rounded-lg"><Plus size={16}/></button>
              <button onClick={() => setIsVertical(!isVertical)} className="p-2 hover:bg-white/20 rounded-lg ml-2 border-l border-white/20">
                {isVertical ? <AlignHorizontalJustifyStart size={16}/> : <AlignVerticalJustifyStart size={16}/>}
              </button>
            </div>
          </div>

          <div className={`flex-1 bg-white/10 rounded-3xl p-6 border-2 border-white/10 overflow-hidden relative`}>
             <div className={`h-full ${isVertical ? '[writing-mode:vertical-rl]' : ''} overflow-x-auto overflow-y-auto`}>
                <ul className="space-y-4">
                  {latestHomework.map((item, i) => (
                    <li key={i} style={{ fontSize: `${fontSize}px` }} className="font-bold flex items-start gap-3 leading-tight">
                      <span className="text-yellow-400 mt-1">●</span> {item}
                    </li>
                  ))}
                </ul>
             </div>
          </div>

          {isTeacher && (
            <div className="mt-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex flex-wrap gap-2">
                {PRESET_HOMEWORK.map(h => <button key={h} onClick={() => setAnnouncement(a => a+h+'\n')} className="text-xs bg-sky-800 px-3 py-1 rounded-lg hover:bg-sky-700">+{h}</button>)}
                {PRESET_TAGS.map(t => <button key={t} onClick={() => setAnnouncement(a => a+t+'\n')} className="text-xs bg-yellow-600 px-3 py-1 rounded-lg hover:bg-yellow-500">+{t}</button>)}
              </div>
              <textarea value={announcement} onChange={(e) => setAnnouncement(e.target.value)} className="w-full h-32 bg-white/5 border-2 border-white/20 rounded-2xl p-4 text-xl focus:border-sky-400 focus:outline-none" placeholder="輸入今日作業..." />
              <button onClick={handlePostAnnouncement} className="w-full py-4 bg-sky-400 text-[#0C4A6E] font-black text-xl rounded-2xl flex items-center justify-center gap-3 hover:bg-sky-300 transition-colors"><Send /> 發布並同步</button>
            </div>
          )}
        </div>
      </main>

      {/* 頁尾版本資訊 */}
      <footer className="h-8 shrink-0 flex items-center justify-between px-10 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        <span>Designed by 鄭念慈老師 & Gemini AI</span>
        <span className="bg-slate-200 px-2 py-0.5 rounded text-slate-500">{APP_VERSION}</span>
      </footer>

      {/* 學生回報視窗 (彈窗) */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in">
          <div className="bg-white rounded-[4rem] p-12 w-full max-w-2xl shadow-2xl border-t-[12px] border-sky-500">
            <h2 className="text-5xl font-black text-sky-900 mb-6 flex items-center gap-4"><Anchor className="w-12 h-12" /> 任務回報</h2>
            <p className="text-2xl text-slate-500 font-bold mb-8 border-b pb-6">{selectedStudent.id} 號：{selectedStudent.name}</p>
            
            <div className="space-y-4 mb-10">
              <p className="font-black text-slate-400 flex items-center gap-2"><Megaphone className="text-sky-500" /> 昨日任務檢核 ({hwDate})</p>
              {latestHomework.map((hw, i) => (
                <label key={i} className="flex items-center gap-6 p-5 bg-slate-50 rounded-3xl cursor-pointer hover:bg-sky-100 transition-colors">
                  <input type="checkbox" className="w-10 h-10 rounded-xl text-sky-600 focus:ring-sky-500" onChange={(e) => setHwChecked({...hwChecked, [i]: e.target.checked})} />
                  <span className="text-3xl font-black text-slate-700">{hw}</span>
                </label>
              ))}
            </div>

            {isTeacher && (
              <div className="mb-8 p-6 bg-red-50 rounded-3xl border-2 border-red-100">
                <p className="text-red-800 font-black mb-4">老師專屬：更改狀態</p>
                <div className="grid grid-cols-3 gap-3">
                  {['出席', '事假', '病假'].map(st => (
                    <button key={st} onClick={async () => {
                      await setDoc(doc(db, `/artifacts/class-5a-app/public/data/attendance`, selectedStudent.id), { status: st, updatedAt: serverTimestamp() });
                      setSelectedStudent(null);
                    }} className="py-3 bg-white rounded-xl font-bold text-red-700 border-2 border-red-100 hover:bg-red-500 hover:text-white transition-all">{st}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <button onClick={() => setSelectedStudent(null)} className="py-6 bg-slate-100 text-slate-400 rounded-3xl text-2xl font-black hover:bg-slate-200">取消</button>
              <button onClick={async () => {
                const reward = 5 + (Object.values(hwChecked).filter(v => v).length * 2);
                await setDoc(doc(db, `/artifacts/class-5a-app/public/data/student_bank`, selectedStudent.id), { bronze: increment(reward), updatedAt: serverTimestamp() }, { merge: true });
                alert(`⚓ 獲得 ${reward} 銅幣！`);
                setSelectedStudent(null);
              }} className="py-6 bg-sky-600 text-white rounded-3xl text-2xl font-black shadow-xl hover:bg-sky-500 flex items-center justify-center gap-3"><CheckCircle2 /> 完成打卡</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 小統計組件
const StatBadge = ({ label, value, color }) => (
  <div className={`px-4 py-1 rounded-full ${color} font-black text-sm flex items-center gap-2 border shadow-sm`}>
    <span>{label}</span>
    <span className="text-lg">{value}</span>
  </div>
);

export default App;
