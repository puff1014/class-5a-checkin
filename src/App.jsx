import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, limit, serverTimestamp } from 'firebase/firestore';
import { Ship, ScrollText, Check, Edit3, Star, Plus, Minus, AlignVerticalJustifyStart, AlignHorizontalJustifyStart, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';

// --- 配置區 ---
const APP_VERSION = "v3.5.210226_Stable";

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

// --- 工具函數：確保日期格式統一為 YYYY-MM-DD ---
const formatDate = (date) => {
  const d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  const year = d.getFullYear();
  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  return [year, month, day].join('-');
};

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

  // 初始化 Firebase
  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    setDb(getFirestore(app));
  }, []);

  // 監聽數據更新
  useEffect(() => {
    if (!db) return;
    const dateKey = formatDate(viewDate);
    
    // 1. 監聽聯絡簿 (使用 doc 監聽比 query 更精確)
    const unsubHw = onSnapshot(doc(db, "announcements", dateKey), (docSnap) => {
      if (docSnap.exists()) {
        const items = docSnap.data().items || [];
        setDisplayItems(items);
        // 只有在非編輯模式下才同步文字，避免輸入到一半被蓋掉
        if (!isEditing) setAnnouncementText(items.join('\n'));
      } else {
        setDisplayItems(["本日尚未發布作業"]);
        if (!isEditing) setAnnouncementText("");
      }
    });

    // 2. 監聽打卡紀錄
    const unsubAtt = onSnapshot(collection(db, `attendance_${dateKey}`), (snapshot) => {
      const data = {};
      snapshot.forEach(doc => data[doc.id] = doc.data());
      setAttendance(data);
    });

    return () => { unsubHw(); unsubAtt(); };
  }, [db, viewDate, isEditing]);

  // --- 行動：學生簽到 ---
  const handleStudentCheckin = async (student) => {
    if (!db) return;
    if (attendance[student.id]) return; // 已簽到則不重複執行

    const dateKey = formatDate(viewDate);
    const studentRef = doc(db, `attendance_${dateKey}`, student.id);
    
    try {
      await setDoc(studentRef, { 
        name: student.name, 
        timestamp: serverTimestamp() 
      });
    } catch (e) {
      console.error("簽到失敗:", e);
      alert("簽到失敗，請確認 Firebase Rules 權限設定。");
    }
  };

  // --- 行動：儲存聯絡簿 ---
  const handleSaveNote = async () => {
    if (!db) return;
    const items = announcementText.split('\n').filter(i => i.trim() !== "");
    const dateKey = formatDate(viewDate);
    
    try {
      const docRef = doc(db, "announcements", dateKey);
      await setDoc(docRef, { 
        items, 
        date: dateKey, 
        updatedAt: serverTimestamp() 
      }, { merge: true });
      setIsEditing(false);
    } catch (e) {
      console.error("儲存失敗:", e);
      alert("儲存失敗，請確認網路或權限。");
    }
  };

  const handlePresetClick = (text) => setAnnouncementText(prev => prev + (prev ? '\n' : '') + text);

  return (
    <div className="h-screen bg-[#F0F9FF] flex flex-col overflow-hidden font-sans">
      <header className="h-20 shrink-0 flex items-center justify-between px-10 bg-white shadow-sm z-20 border-b-4 border-sky-100">
        <div className="flex items-center gap-4">
          <button onClick={() => {if(prompt("請輸入教師密碼")==="123+++") setIsTeacher(true)}}>
            <Ship className={`w-10 h-10 ${isTeacher ? 'text-emerald-600' : 'text-sky-600'}`} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-sky-900 tracking-tighter">五年甲班航海日誌</h1>
            <p className="text-[10px] font-bold text-slate-400">Ver {APP_VERSION}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-sky-50 p-2 rounded-2xl border-2 border-sky-100">
          <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)))} className="p-1 hover:bg-white rounded-full transition-colors"><ChevronLeft /></button>
          <div className="text-center min-w-[140px]">
            <span className="text-xl font-black text-sky-800">{viewDate.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric' })}</span>
          </div>
          <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)))} className="p-1 hover:bg-white rounded-full transition-colors"><ChevronRight /></button>
        </div>

        {isTeacher && <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold animate-pulse">教師權限已開啟</div>}
      </header>

      <main className="flex-1 flex p-4 gap-4 overflow-hidden">
        {/* 左側：簽到區 */}
        <div className="w-[55%] bg-white rounded-[3rem] shadow-xl p-8 overflow-hidden flex flex-col border-4 border-white">
          <h2 className="text-2xl font-black mb-6 flex items-center gap-2 text-sky-900"><Star className="fill-yellow-400 text-yellow-400"/> 航海員簽到站</h2>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {STUDENTS.map(s => (
              <button key={s.id} onClick={() => handleStudentCheckin(s)}
                className={`h-28 rounded-3xl border-b-8 transition-all flex flex-col items-center justify-center relative active:border-b-0 active:translate-y-2
                  ${attendance[s.id] ? 'bg-emerald-500 border-emerald-700 text-white shadow-inner' : 'bg-white border-sky-100 text-slate-700 hover:bg-sky-50 shadow-sm'}`}>
                {attendance[s.id] && <CheckCircle2 className="absolute top-2 right-4 text-white" size={24} />}
                <span className={`text-xs font-bold ${attendance[s.id] ? 'text-emerald-100' : 'opacity-30'}`}>No.{s.id}</span>
                <span className="text-4xl font-black">{s.name}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 flex gap-6 text-sm font-bold p-4 bg-slate-50 rounded-2xl">
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-emerald-500 rounded-md shadow-sm"></div>已登船 (已簽到)</div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-white border border-sky-200 rounded-md"></div>待命中 (未簽到)</div>
          </div>
        </div>

        {/* 右側：聯絡簿 */}
        <div className="w-[45%] bg-[#0C4A6E] rounded-[3rem] p-10 text-white shadow-2xl flex flex-col relative">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-black flex items-center gap-3"><ScrollText /> 任務清單</h2>
            <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl">
              <button onClick={() => setFontSize(f => Math.max(16, f-4))} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><Minus size={16}/></button>
              <button onClick={() => setFontSize(f => Math.min(100, f+4))} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><Plus size={16}/></button>
              <button onClick={() => setIsVertical(!isVertical)} className="p-1.5 hover:bg-white/20 rounded-lg border-l border-white/20 ml-1 transition-colors">
                {isVertical ? <AlignHorizontalJustifyStart size={18}/> : <AlignVerticalJustifyStart size={18}/>}
              </button>
              {isTeacher && (
                <button 
                  onClick={() => isEditing ? handleSaveNote() : setIsEditing(true)}
                  className={`ml-2 px-5 py-2 rounded-xl font-black flex items-center gap-2 transition-all shadow-lg active:scale-95 ${isEditing ? 'bg-emerald-500 text-white' : 'bg-yellow-400 text-sky-900'}`}
                >
                  {isEditing ? <><Check size={20}/>完成儲存</> : <><Edit3 size={20}/>編輯內容</>}
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 bg-black/20 rounded-[2.5rem] p-8 overflow-hidden relative border-2 border-white/5 shadow-inner">
            {isEditing ? (
              <div className="h-full flex flex-col">
                <div className="flex flex-wrap gap-2 mb-4">
                  {PRESET_HOMEWORK.map(h => <button key={h} onClick={() => handlePresetClick(h)} className="text-xs bg-sky-700 px-3 py-1 rounded-lg hover:bg-sky-600 font-bold border border-sky-500 transition-colors">+{h}</button>)}
                  {PRESET_TAGS.map(t => <button key={t} onClick={() => handlePresetClick(t)} className="text-xs bg-amber-600 px-3 py-1 rounded-lg hover:bg-amber-500 font-bold border border-amber-400 transition-colors">+{t.replace('：','')}</button>)}
                </div>
                <textarea 
                  value={announcementText} 
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  autoFocus
                  placeholder="請輸入今日作業..."
                  className={`flex-1 bg-transparent outline-none resize-none font-bold placeholder:text-white/20 ${isVertical ? '[writing-mode:vertical-rl] h-full w-full' : 'w-full'}`}
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.4 }}
                />
              </div>
            ) : (
              <div className={`h-full overflow-auto custom-scrollbar ${isVertical ? '[writing-mode:vertical-rl] h-full' : ''}`}>
                {displayItems.length > 0 && displayItems[0] !== "本日尚未發布作業" ? (
                  displayItems.map((item, i) => (
                    <div key={i} style={{ fontSize: `${fontSize}px` }} className="font-bold mb-6 leading-tight flex items-start gap-4">
                      <span className="text-yellow-400 shrink-0 select-none">{i + 1}.</span>
                      <span>{item}</span>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-white/30 gap-4">
                    <AlertCircle size={64} />
                    <p className="text-2xl font-bold">尚無任務發布</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
