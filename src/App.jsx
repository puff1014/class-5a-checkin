import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, limit, serverTimestamp, orderBy } from 'firebase/firestore';
import { Users, UserCheck, AlertCircle, Settings, RotateCcw, Edit3, Check, AlignVerticalJustifyStart, AlignHorizontalJustifyStart, ChevronLeft, ChevronRight, Star, Heart, Clock, Palette, Minus, Plus, Ship, Anchor, CheckCircle2 } from 'lucide-react';

// Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyArwz6gPeW9lNq_8LOfnKYwZmkRN-Wgtb8",
  authDomain: "class-5a-app.firebaseapp.com",
  projectId: "class-5a-app",
  storageBucket: "class-5a-app.firebasestorage.app",
  messagingSenderId: "828328241350",
  appId: "1:828328241350:web:5d39d529209f87a2540fc7"
};

const APP_VERSION = "v3.0.260220_Final";

const App = () => {
  // ---------------------------------------------------------------------------
  // 1. 狀態與 Firebase 初始化
  // ---------------------------------------------------------------------------
  const [db, setDb] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notebookDate, setNotebookDate] = useState(new Date());
  const [isTeacher, setIsTeacher] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [splitRatio, setSplitRatio] = useState(55);
  const [notebookFontSize, setNotebookFontSize] = useState(42);
  const [writingMode, setWritingMode] = useState('horizontal');
  const [attendance, setAttendance] = useState({});
  const [announcementText, setAnnouncementText] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // 學生名單 (固定的五年甲班名單)
  const STUDENTS = useMemo(() => [
    { id: '1', name: '陳○佑' }, { id: '2', name: '徐○綸' }, { id: '3', name: '蕭○群' }, 
    { id: '4', name: '吳○晏' }, { id: '5', name: '呂○蔚' }, { id: '6', name: '吳○昇' },
    { id: '7', name: '翁○儀' }, { id: '8', name: '鄭○妍' }, { id: '9', name: '周○涵' }, { id: '10', name: '李○妤' }
  ], []);

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    setDb(firestore);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ---------------------------------------------------------------------------
  // 2. 資料同步邏輯 (Firebase 連動)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!db) return;
    const dateKey = notebookDate.toLocaleDateString('zh-TW').replace(/\//g, "-");

    // 監聽聯絡簿 (對應日期)
    const qHw = query(collection(db, "announcements"), where("date", "==", dateKey), limit(1));
    const unsubHw = onSnapshot(qHw, (snapshot) => {
      if (!snapshot.empty) {
        const items = snapshot.docs[0].data().items || [];
        setAnnouncementText(items.join('\n'));
      } else {
        setAnnouncementText("本日尚無聯絡簿內容。");
      }
    });

    // 監聽打卡狀態
    const unsubAtt = onSnapshot(collection(db, `attendance_${dateKey}`), (snapshot) => {
      const data = {};
      snapshot.forEach(doc => data[doc.id] = doc.data());
      setAttendance(data);
    });

    return () => { unsubHw(); unsubAtt(); };
  }, [db, notebookDate]);

  // ---------------------------------------------------------------------------
  // 3. 動作處理
  // ---------------------------------------------------------------------------
  const handleStudentCheckin = async (student) => {
    if (!db) return;
    const dateKey = notebookDate.toLocaleDateString('zh-TW').replace(/\//g, "-");
    const studentRef = doc(db, `attendance_${dateKey}`, student.id);
    await setDoc(studentRef, { 
      name: student.name, 
      timestamp: serverTimestamp(),
      status: 'present' 
    });
  };

  const handleSaveNote = async () => {
    if (!db) return;
    const items = announcementText.split('\n').filter(i => i.trim() !== "");
    const dateKey = notebookDate.toLocaleDateString('zh-TW').replace(/\//g, "-");
    await setDoc(doc(db, "announcements", dateKey), {
      items,
      date: dateKey,
      updatedAt: serverTimestamp()
    });
    setIsEditingNote(false);
  };

  const changeDate = (days) => {
    const newDate = new Date(notebookDate);
    newDate.setDate(notebookDate.getDate() + days);
    setNotebookDate(newDate);
  };

  const handleLogin = () => {
    const pw = prompt("請輸入老師管理密碼：");
    if (pw === "123+++") setIsTeacher(true);
  };

  return (
    <div className="h-screen bg-[#F0F9FF] font-sans text-slate-800 flex flex-col overflow-hidden relative">
      
      {/* 頂部工具列 */}
      <header className="bg-white/90 backdrop-blur-md px-8 h-20 flex justify-between items-center z-20 border-b-4 border-sky-100 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={handleLogin} className="hover:rotate-12 transition-transform">
            <Ship className={`w-10 h-10 ${isTeacher ? 'text-yellow-500' : 'text-sky-600'}`} />
          </button>
          <h1 className="text-3xl font-black text-sky-900 tracking-tighter">五年甲班打卡系統</h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="bg-sky-50 px-6 py-2 rounded-2xl border-2 border-sky-100 flex items-center gap-4">
            <button onClick={() => changeDate(-1)} className="p-1 hover:bg-white rounded-full"><ChevronLeft size={24}/></button>
            <span className="text-2xl font-black text-sky-800">{notebookDate.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
            <button onClick={() => changeDate(1)} className="p-1 hover:bg-white rounded-full"><ChevronRight size={24}/></button>
          </div>
          <div className="text-2xl font-mono font-bold text-sky-600 border-l-2 pl-6">{currentTime.toLocaleTimeString()}</div>
        </div>
      </header>

      {/* 主畫面 */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        
        {/* 左側：打卡區 */}
        <div style={{ width: `${splitRatio}%` }} className="bg-white rounded-[3rem] shadow-xl border-4 border-white overflow-hidden p-8 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-black text-sky-900 flex items-center gap-3">
              <Star className="text-yellow-400 fill-yellow-400" /> 航海員名單
            </h2>
            <div className="flex gap-2">
               <span className="bg-green-100 text-green-700 px-4 py-1 rounded-full font-bold text-lg">已到: {Object.keys(attendance).length}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-2">
            {STUDENTS.map(student => (
              <button
                key={student.id}
                onClick={() => handleStudentCheckin(student)}
                className={`h-28 rounded-3xl border-b-8 transition-all flex flex-col items-center justify-center relative active:border-b-0 active:translate-y-2
                  ${attendance[student.id] ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-sky-100 text-slate-600 hover:bg-sky-50'}`}
              >
                <span className="absolute top-2 left-6 text-slate-300 font-bold">No.{student.id}</span>
                <span className="text-4xl font-black">{student.name}</span>
                {attendance[student.id] && <CheckCircle2 className="absolute top-2 right-4 text-green-500" />}
              </button>
            ))}
          </div>
        </div>

        {/* 右側：黑板聯絡簿區 */}
        <div style={{ width: `${100 - splitRatio}%` }} className="flex flex-col bg-[#2d4035] border-[16px] border-[#a0522d] rounded-[3rem] shadow-2xl relative overflow-hidden ring-8 ring-[#8b4513]/20">
          
          {/* 黑板標題列 */}
          <div className="p-8 pb-4 flex justify-between items-center border-b-2 border-white/10 border-dashed mx-4">
            <h2 className="text-3xl font-black text-white flex items-center gap-3 tracking-widest">
              <ScrollText className="text-sky-300" /> 今日聯絡簿
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex bg-white/10 rounded-xl mr-2">
                <button onClick={() => setNotebookFontSize(f => f-4)} className="p-2 hover:bg-white/20 text-white"><Minus size={16}/></button>
                <button onClick={() => setNotebookFontSize(f => f+4)} className="p-2 hover:bg-white/20 text-white"><Plus size={16}/></button>
              </div>
              <button onClick={() => setWritingMode(w => w === 'horizontal' ? 'vertical' : 'horizontal')} className="p-2 bg-white/10 rounded-xl text-white">
                {writingMode === 'horizontal' ? <AlignVerticalJustifyStart size={20}/> : <AlignHorizontalJustifyStart size={20}/>}
              </button>
              {isTeacher && (
                <button 
                  onClick={() => isEditingNote ? handleSaveNote() : setIsEditingNote(true)}
                  className={`ml-2 px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg ${isEditingNote ? 'bg-green-500 text-white hover:bg-green-400' : 'bg-yellow-400 text-sky-900 hover:bg-yellow-300'}`}
                >
                  {isEditingNote ? <Check /> : <Edit3 />}
                  {isEditingNote ? "完成" : "編輯"}
                </button>
              )}
            </div>
          </div>

          {/* 內容區 */}
          <div className="flex-1 p-10 overflow-hidden relative">
            {isEditingNote ? (
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                className={`w-full h-full bg-black/10 text-white leading-relaxed outline-none resize-none font-bold ${writingMode === 'vertical' ? '[writing-mode:vertical-rl]' : ''}`}
                style={{ fontSize: `${notebookFontSize}px` }}
                placeholder="在此輸入內容，一行一項..."
                autoFocus
              />
            ) : (
              <div className={`h-full text-white font-bold leading-relaxed ${writingMode === 'vertical' ? '[writing-mode:vertical-rl] h-full' : ''}`}>
                {announcementText.split('\n').filter(l => l.trim() !== "").map((line, index) => (
                  <div key={index} style={{ fontSize: `${notebookFontSize}px` }} className="mb-6 flex items-start gap-4">
                    <span className="text-yellow-400 shrink-0">{index + 1}.</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 粉筆槽裝飾 */}
          <div className="h-6 bg-[#3e2714] border-t-4 border-[#2a1a0e] flex items-center px-10 gap-4">
             <div className="w-10 h-2 bg-white rounded-full opacity-60 rotate-2"></div>
             <div className="w-8 h-2 bg-pink-200 rounded-full opacity-60 -rotate-3"></div>
          </div>
        </div>
      </main>

      <footer className="h-8 flex justify-between px-10 items-center text-[10px] text-slate-400 font-bold bg-white border-t">
        <span>Designed by 鄭念慈老師 & Gemini AI</span>
        <span>{APP_VERSION}</span>
      </footer>
    </div>
  );
};

export default App;
