import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, limit, serverTimestamp } from 'firebase/firestore';
import { Ship, ScrollText, Check, Edit3, Star, Plus, Minus, AlignVerticalJustifyStart, AlignHorizontalJustifyStart, ChevronLeft, ChevronRight, CheckCircle2, Clock, Palette, Settings, Users, AlertCircle } from 'lucide-react';

const firebaseConfig = {
  apiKey: "AIzaSyArwz6gPeW9lNq_8LOfnKYwZmkRN-Wgtb8",
  authDomain: "class-5a-app.firebaseapp.com",
  projectId: "class-5a-app",
  storageBucket: "class-5a-app.firebasestorage.app",
  messagingSenderId: "828328241350",
  appId: "1:828328241350:web:5d39d529209f87a2540fc7"
};

const APP_VERSION = "v3.1.260220_FinalStable";

const App = () => {
  const [db, setDb] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [isTeacher, setIsTeacher] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [displayItems, setDisplayItems] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [fontSize, setFontSize] = useState(42);
  const [isVertical, setIsVertical] = useState(false);
  const [clockStyle, setClockStyle] = useState(0);

  const STUDENTS = useMemo(() => [
    { id: '1', name: '陳○佑' }, { id: '2', name: '徐○綸' }, { id: '3', name: '蕭○群' }, 
    { id: '4', name: '吳○晏' }, { id: '5', name: '呂○蔚' }, { id: '6', name: '吳○昇' },
    { id: '7', name: '翁○儀' }, { id: '8', name: '鄭○妍' }, { id: '9', name: '周○涵' }, { id: '10', name: '李○妤' }
  ], []);

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    setDb(getFirestore(app));
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!db) return;
    const dateKey = viewDate.toLocaleDateString('zh-TW').replace(/\//g, "-");
    
    const unsubHw = onSnapshot(query(collection(db, "announcements"), where("date", "==", dateKey), limit(1)), (snapshot) => {
      if (!snapshot.empty) {
        const items = snapshot.docs[0].data().items || [];
        setDisplayItems(items);
        setAnnouncementText(items.join('\n'));
      } else {
        setDisplayItems(["本日尚未發布作業"]);
        setAnnouncementText("");
      }
    });

    const unsubAtt = onSnapshot(collection(db, `attendance_${dateKey}`), (snapshot) => {
      const data = {};
      snapshot.forEach(doc => data[doc.id] = doc.data());
      setAttendance(data);
    });

    return () => { unsubHw(); unsubAtt(); };
  }, [db, viewDate]);

  const handleSave = async () => {
    if (!db) return;
    const items = announcementText.split('\n').filter(i => i.trim() !== "");
    const dateKey = viewDate.toLocaleDateString('zh-TW').replace(/\//g, "-");
    await setDoc(doc(db, "announcements", dateKey), { items, date: dateKey, updatedAt: serverTimestamp() });
    setIsEditing(false);
  };

  return (
    <div className="h-screen bg-[#F0F9FF] flex flex-col overflow-hidden font-sans">
      <header className="h-20 shrink-0 flex items-center justify-between px-10 bg-white shadow-sm z-20 border-b-4 border-sky-100">
        <div className="flex items-center gap-4">
          <button onClick={() => {if(prompt("密碼")==="123+++") setIsTeacher(true)}}><Ship className="w-10 h-10 text-sky-600" /></button>
          <h1 className="text-3xl font-black text-sky-900">五甲航海日誌</h1>
        </div>
        <div className="flex items-center gap-4 bg-sky-50 p-2 rounded-2xl border-2 border-sky-100">
          <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)))} className="p-1 hover:bg-white rounded-full"><ChevronLeft /></button>
          <span className="text-2xl font-black text-sky-800 px-4">{viewDate.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', weekday: 'short' })}</span>
          <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)))} className="p-1 hover:bg-white rounded-full"><ChevronRight /></button>
        </div>
        <div className="text-2xl font-mono font-black text-sky-600">{currentTime.toLocaleTimeString()}</div>
      </header>

      <main className="flex-1 flex p-4 gap-4 overflow-hidden">
        <div className="w-[55%] bg-white rounded-[3rem] shadow-xl p-8 overflow-y-auto border-4 border-white">
          <h2 className="text-2xl font-black mb-8 flex items-center gap-2 text-sky-900"><Star className="fill-yellow-400 text-yellow-400"/> 航海員簽到表</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {STUDENTS.map(s => (
              <button key={s.id} onClick={async () => {
                const dateKey = viewDate.toLocaleDateString('zh-TW').replace(/\//g, "-");
                await setDoc(doc(db, `attendance_${dateKey}`, s.id), { name: s.name, timestamp: serverTimestamp() });
              }} className={`h-24 rounded-3xl border-b-8 transition-all flex flex-col items-center justify-center relative active:border-b-0 active:translate-y-2 ${attendance[s.id] ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-sky-100 text-slate-700'}`}>
                {attendance[s.id] && <CheckCircle2 className="absolute top-2 right-2 text-green-500" size={20}/>}
                <span className="text-xs font-bold opacity-30">No.{s.id}</span>
                <span className="text-3xl font-black">{s.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="w-[45%] bg-[#0C4A6E] rounded-[3rem] p-8 text-white shadow-2xl flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black flex items-center gap-2"><ScrollText /> 聯絡簿內容</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setFontSize(f => f-4)} className="p-1.5 bg-white/10 rounded-lg"><Minus size={14}/></button>
              <button onClick={() => setFontSize(f => f+4)} className="p-1.5 bg-white/10 rounded-lg"><Plus size={14}/></button>
              <button onClick={() => setIsVertical(!isVertical)} className="p-1.5 bg-white/10 rounded-lg border-l border-white/20 ml-1">
                {isVertical ? <AlignHorizontalJustifyStart size={18}/> : <AlignVerticalJustifyStart size={18}/>}
              </button>
              {isTeacher && (
                <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} className={`ml-2 px-4 py-1.5 rounded-xl font-bold flex items-center gap-2 ${isEditing ? 'bg-green-500' : 'bg-yellow-400 text-sky-900'}`}>
                  {isEditing ? <Check size={18}/> : <Edit3 size={18}/>} {isEditing ? "完成" : "編輯"}
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 bg-black/20 rounded-2xl p-6 overflow-auto">
            {isEditing ? (
              <textarea value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} className={`w-full h-full bg-transparent outline-none resize-none font-bold ${isVertical ? '[writing-mode:vertical-rl]' : ''}`} style={{ fontSize: `${fontSize}px` }} autoFocus />
            ) : (
              <div className={isVertical ? '[writing-mode:vertical-rl] h-full' : ''}>
                {displayItems.map((item, i) => (
                  <div key={i} style={{ fontSize: `${fontSize}px` }} className="font-bold mb-4 flex gap-2">
                    <span className="text-yellow-400">{i + 1}.</span>{item}
                  </div>
                ))}
              </div>
            )}
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
