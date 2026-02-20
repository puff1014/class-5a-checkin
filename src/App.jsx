import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, orderBy, limit, serverTimestamp, increment, where, getDocs } from 'firebase/firestore';
import { Clock, Ship, Anchor, CheckCircle2, ScrollText, Send, Star, Megaphone, UserX, Calendar, Plus, Minus, AlignVerticalJustifyStart, AlignHorizontalJustifyStart, ChevronLeft, ChevronRight } from 'lucide-react';

// 版本號碼：方便老師確認是否更新成功
const APP_VERSION = "v2.1.260220_HistoryUpdate";

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
  const [viewDate, setViewDate] = useState(new Date()); // 目前檢視的日期
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isTeacher, setIsTeacher] = useState(false);
  const [announcementInput, setAnnouncementInput] = useState("");
  const [displayHomework, setDisplayHomework] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [hwChecked, setHwChecked] = useState({});
  
  // 介面設定
  const [splitRatio, setSplitRatio] = useState(60);
  const [fontSize, setFontSize] = useState(48);
  const [isVertical, setIsVertical] = useState(false);

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    setDb(firestore);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 當「檢視日期」改變時，重新讀取該日期的聯絡簿
  useEffect(() => {
    if (!db) return;
    const dateKey = viewDate.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
    const q = query(
      collection(db, `/artifacts/class-5a-app/public/data/announcements`), 
      where("date", "==", dateKey),
      limit(1)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setDisplayHomework(snapshot.docs[0].data().items || []);
      } else {
        setDisplayHomework(["本日尚無紀錄"]);
      }
    });
    return () => unsub();
  }, [db, viewDate]);

  const handleDateChange = (days) => {
    const nextDate = new Date(viewDate);
    nextDate.setDate(viewDate.getDate() + days);
    setViewDate(nextDate);
  };

  const handlePost = async () => {
    const items = announcementInput.split('\n').filter(i => i.trim());
    const dateKey = viewDate.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
    await setDoc(doc(collection(db, `/artifacts/class-5a-app/public/data/announcements`)), {
      items,
      date: dateKey,
      createdAt: serverTimestamp()
    });
    setAnnouncementInput("");
    alert("📢 聯絡簿已存檔！");
  };

  return (
    <div className="h-screen bg-[#F0F9FF] flex flex-col overflow-hidden font-sans">
      <header className="h-20 shrink-0 flex items-center justify-between px-10 bg-white shadow-sm z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => {if(prompt("密碼")==="123+++") setIsTeacher(true)}}><Ship className="w-10 h-10 text-sky-600" /></button>
          <h1 className="text-3xl font-black text-sky-900">五年甲班打卡系統</h1>
        </div>
        
        {/* 日期切換器 */}
        <div className="flex items-center gap-4 bg-sky-50 p-2 rounded-2xl border border-sky-200">
          <button onClick={() => handleDateChange(-1)} className="p-2 hover:bg-white rounded-full transition-colors"><ChevronLeft /></button>
          <div className="text-center min-w-[200px]">
            <span className="block text-xs font-bold text-sky-400">正在檢視紀錄</span>
            <span className="text-xl font-black text-sky-800">{viewDate.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
          </div>
          <button onClick={() => handleDateChange(1)} className="p-2 hover:bg-white rounded-full transition-colors"><ChevronRight /></button>
        </div>

        <div className="text-right font-mono font-bold text-sky-600 text-xl">{currentTime.toLocaleTimeString()}</div>
      </header>

      <main className="flex-1 flex p-4 gap-4 overflow-hidden">
        {/* 左欄：打卡 */}
        <div style={{ width: `${splitRatio}%` }} className="bg-white rounded-[3rem] shadow-xl p-8 overflow-y-auto">
          <h2 className="text-2xl font-black mb-6 flex items-center gap-2 text-sky-800"><Star className="fill-yellow-400 text-yellow-400"/> 學生登船狀態</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {STUDENTS.map(s => (
              <button key={s.id} onClick={() => setSelectedStudent(s)} className="h-24 bg-white border-b-8 border-sky-100 rounded-3xl shadow-sm text-2xl font-black text-slate-700 hover:translate-y-1 active:border-b-0 transition-all">
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* 右欄：聯絡簿 (雙層設計) */}
        <div style={{ width: `${100-splitRatio}%` }} className="flex flex-col gap-4">
          <div className="flex-1 bg-[#0C4A6E] rounded-[3rem] p-8 text-white shadow-2xl flex flex-col relative overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-black flex items-center gap-2"><ScrollText /> 聯絡簿預覽</h2>
              <div className="flex items-center bg-white/10 rounded-xl p-1">
                <button onClick={() => setFontSize(f => f-4)} className="p-1 hover:bg-white/20 rounded"><Minus size={14}/></button>
                <span className="px-2 text-xs font-mono">{fontSize}</span>
                <button onClick={() => setFontSize(f => f+4)} className="p-1 hover:bg-white/20 rounded"><Plus size={14}/></button>
                <button onClick={() => setIsVertical(!isVertical)} className="ml-2 p-1 hover:bg-white/20 rounded border-l border-white/20">
                   {isVertical ? <AlignHorizontalJustifyStart size={16}/> : <AlignVerticalJustifyStart size={16}/>}
                </button>
              </div>
            </div>

            {/* 上半部：預覽區 */}
            <div className={`flex-1 bg-black/20 rounded-2xl p-6 overflow-auto border border-white/10`}>
              <div className={`${isVertical ? '[writing-mode:vertical-rl]' : ''}`}>
                {displayHomework.map((item, i) => (
                  <div key={i} style={{ fontSize: `${fontSize}px` }} className="font-bold leading-tight mb-4 flex items-start gap-2">
                    <span className="text-yellow-400">●</span> {item}
                  </div>
                ))}
              </div>
            </div>

            {/* 下半部：老師編輯區 (僅登入後顯示) */}
            {isTeacher && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_HOMEWORK.map(h => <button key={h} onClick={() => setAnnouncementInput(p => p+h+'\n')} className="text-[10px] bg-sky-700 px-2 py-1 rounded-md hover:bg-sky-600">+{h}</button>)}
                  {PRESET_TAGS.map(t => <button key={t} onClick={() => setAnnouncementInput(p => p+t+'\n')} className="text-[10px] bg-yellow-600 px-2 py-1 rounded-md hover:bg-yellow-500">+{t}</button>)}
                </div>
                <textarea value={announcementInput} onChange={(e) => setAnnouncementInput(e.target.value)} className="w-full h-24 bg-white/5 border border-white/20 rounded-xl p-3 text-lg focus:outline-none focus:border-sky-400" placeholder="編輯今日作業..." />
                <button onClick={handlePost} className="w-full mt-2 py-3 bg-sky-400 text-sky-900 font-black rounded-xl flex items-center justify-center gap-2 hover:bg-sky-300 transition-colors"><Send size={18}/> 發布紀錄至此日期</button>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="h-8 flex justify-between px-10 items-center text-[10px] text-slate-400 font-bold bg-white border-t">
        <span>鄭念慈老師 & Gemini AI 合作開發</span>
        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-500">{APP_VERSION}</span>
      </footer>
    </div>
  );
};

export default App;
