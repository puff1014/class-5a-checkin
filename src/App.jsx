import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, limit, serverTimestamp } from 'firebase/firestore';
import { Ship, ScrollText, Check, Edit3, Star, Plus, Minus, AlignVerticalJustifyStart, AlignHorizontalJustifyStart, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';

const APP_VERSION = "v3.4.260220_FinalFix";

const firebaseConfig = {
  apiKey: "AIzaSyArwz6gPeW9lNq_8LOfnKYwZmkRN-Wgtb8",
  authDomain: "class-5a-app.firebaseapp.com",
  projectId: "class-5a-app",
  storageBucket: "class-5a-app.firebasestorage.app",
  messagingSenderId: "828328241350",
  appId: "1:828328241350:web:5d39d529209f87a2540fc7"
};

const STUDENTS = [
  { id: '1', name: '陳○佑' }, { id: '2', name: '徐○綸' }, { id: '3', name: '蕭○群' }, 
  { id: '4', name: '吳○晏' }, { id: '5', name: '呂○蔚' }, { id: '6', name: '吳○昇' },
  { id: '7', name: '翁○儀' }, { id: '8', name: '鄭○妍' }, { id: '9', name: '周○涵' }, { id: '10', name: '李○妤' }
];

const PRESET_HOMEWORK = ["預習數課", "數習", "數八", "背成+小+寫"];
const PRESET_TAGS = ["帶學用品：", "訂正作業："];

const App = () => {
  const [db, setDb] = useState(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [isTeacher, setIsTeacher] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [announcementText, setAnnouncementText] = useState("");
  const [displayItems, setDisplayItems] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [fontSize, setFontSize] = useState(48);
  const [isVertical, setIsVertical] = useState(false);

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    setDb(getFirestore(app));
  }, []);

  useEffect(() => {
    if (!db) return;
    const dateKey = viewDate.toLocaleDateString('zh-TW').replace(/\//g, "-");
    
    // 監聽聯絡簿
    const qHw = query(collection(db, "announcements"), where("date", "==", dateKey), limit(1));
    const unsubHw = onSnapshot(qHw, (snapshot) => {
      if (!snapshot.empty) {
        const items = snapshot.docs[0].data().items || [];
        setDisplayItems(items);
        if (!isEditing) setAnnouncementText(items.join('\n'));
      } else {
        setDisplayItems(["本日尚未發布作業"]);
        if (!isEditing) setAnnouncementText("");
      }
    });

    // 監聽打卡紀錄
    const unsubAtt = onSnapshot(collection(db, `attendance_${dateKey}`), (snapshot) => {
      const data = {};
      snapshot.forEach(doc => data[doc.id] = doc.data());
      setAttendance(data);
    });

    return () => { unsubHw(); unsubAtt(); };
  }, [db, viewDate, isEditing]);

  // --- 修正動作：簽到函數 ---
  const handleStudentCheckin = async (student) => {
    if (!db) return;
    const dateKey = viewDate.toLocaleDateString('zh-TW').replace(/\//g, "-");
    const studentRef = doc(db, `attendance_${dateKey}`, student.id);
    try {
      await setDoc(studentRef, { name: student.name, timestamp: serverTimestamp() });
    } catch (e) { console.error("簽到失敗", e); }
  };

  // --- 修正動作：完成按鈕函數 ---
  const handleSaveNote = async () => {
    if (!db) return;
    const items = announcementText.split('\n').filter(i => i.trim() !== "");
    const dateKey = viewDate.toLocaleDateString('zh-TW').replace(/\//g, "-");
    try {
      await setDoc(doc(db, "announcements", dateKey), { items, date: dateKey, updatedAt: serverTimestamp() });
      setIsEditing(false); // 儲存成功後跳回顯示模式
    } catch (e) { console.error("儲存失敗", e); }
  };

  const handlePresetClick = (text) => setAnnouncementText(prev => prev + (prev ? '\n' : '') + text);

  return (
    <div className="h-screen bg-[#F0F9FF] flex flex-col overflow-hidden font-sans">
      <header className="h-20 shrink-0 flex items-center justify-between px-10 bg-white shadow-sm z-20 border-b-4 border-sky-100">
        <div className="flex items-center gap-4">
          <button onClick={() => {if(prompt("密碼")==="123+++") setIsTeacher(true)}}><Ship className="w-10 h-10 text-sky-600" /></button>
          <h1 className="text-3xl font-black text-sky-900 tracking-tighter">五年甲班打卡系統</h1>
        </div>
        
        <div className="flex items-center gap-4 bg-sky-50 p-2 rounded-2xl border-2 border-sky-100">
          <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)))} className="p-1 hover:bg-white rounded-full"><ChevronLeft /></button>
          <div className="text-center min-w-[140px]">
            <span className="text-xl font-black text-sky-800">{viewDate.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}</span>
          </div>
          <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)))} className="p-1 hover:bg-white rounded-full"><ChevronRight /></button>
        </div>
        <div className="text-[10px] font-bold text-slate-400">最新版本: {APP_VERSION}</div>
      </header>

      <main className="flex-1 flex p-4 gap-4 overflow-hidden">
        {/* 左側：簽到區 */}
        <div className="w-[55%] bg-white rounded-[3rem] shadow-xl p-8 overflow-hidden flex flex-col border-4 border-white">
          <h2 className="text-2xl font-black mb-6 flex items-center gap-2 text-sky-900"><Star className="fill-yellow-400 text-yellow-400"/> 航海員簽到</h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto pr-2">
            {STUDENTS.map(s => (
              <button key={s.id} onClick={() => handleStudentCheckin(s)}
                className={`h-28 rounded-3xl border-b-8 transition-all flex flex-col items-center justify-center relative active:border-b-0 active:translate-y-2
                  ${attendance[s.id] ? 'bg-emerald-500 border-emerald-700 text-white shadow-inner' : 'bg-white border-sky-100 text-slate-700 hover:bg-sky-50'}`}>
                {attendance[s.id] && <CheckCircle2 className="absolute top-2 right-4 text-white" size={24} />}
                <span className={`text-xs font-bold ${attendance[s.id] ? 'text-emerald-100' : 'opacity-30'}`}>No.{s.id}</span>
                <span className="text-4xl font-black">{s.name}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 flex gap-6 text-sm font-bold p-4 bg-slate-50 rounded-2xl">
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-emerald-500 rounded-md"></div>已簽到 (海洋綠)</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-white border border-sky-200 rounded-md"></div>未簽到 (白色)</div>
          </div>
        </div>

        {/* 右側：聯絡簿 (原地編輯設計) */}
        <div className="w-[45%] bg-[#0C4A6E] rounded-[3rem] p-10 text-white shadow-2xl flex flex-col relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-black flex items-center gap-3"><ScrollText /> 班級聯絡簿</h2>
            <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl">
              <button onClick={() => setFontSize(f => Math.max(16, f-4))} className="p-1.5 hover:bg-white/20 rounded-lg"><Minus size={16}/></button>
              <button onClick={() => setFontSize(f => Math.min(80, f+4))} className="p-1.5 hover:bg-white/20 rounded-lg"><Plus size={16}/></button>
              <button onClick={() => setIsVertical(!isVertical)} className="p-1.5 hover:bg-white/20 rounded-lg border-l border-white/20 ml-1">
                {isVertical ? <AlignHorizontalJustifyStart size={18}/> : <AlignVerticalJustifyStart size={18}/>}
              </button>
              {isTeacher && (
                <button 
                  onClick={() => isEditing ? handleSaveNote() : setIsEditing(true)}
                  className={`ml-2 px-5 py-2 rounded-xl font-black flex items-center gap-2 transition-all ${isEditing ? 'bg-emerald-500' : 'bg-yellow-400 text-sky-900'}`}
                >
                  {isEditing ? <><Check size={20}/>完成</> : <><Edit3 size={20}/>編輯</>}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 bg-black/20 rounded-[2.5rem] p-8 overflow-hidden relative border-2 border-white/5">
            {isEditing ? (
              <div className="h-full flex flex-col">
                <div className="flex flex-wrap gap-2 mb-4">
                  {PRESET_HOMEWORK.map(h => <button key={h} onClick={() => handlePresetClick(h)} className="text-xs bg-sky-700 px-3 py-1 rounded-lg hover:bg-sky-600 font-bold border border-sky-500">+{h}</button>)}
                  {PRESET_TAGS.map(t => <button key={t} onClick={() => handlePresetClick(t)} className="text-xs bg-amber-600 px-3 py-1 rounded-lg hover:bg-amber-500 font-bold border border-amber-400">+{t.replace('：','')}</button>)}
                </div>
                <textarea 
                  value={announcementText} 
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  autoFocus
                  className={`flex-1 bg-transparent outline-none resize-none font-bold ${isVertical ? '[writing-mode:vertical-rl] h-full' : ''}`}
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.5 }}
                />
              </div>
            ) : (
              <div className={`h-full overflow-auto ${isVertical ? '[writing-mode:vertical-rl] h-full' : ''}`}>
                {displayItems.map((item, i) => (
                  <div key={i} style={{ fontSize: `${fontSize}px` }} className="font-bold mb-6 leading-tight flex items-start gap-4">
                    <span className="text-yellow-400 shrink-0 select-none">{i + 1}.</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
