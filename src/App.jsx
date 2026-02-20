import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, orderBy, limit, serverTimestamp, increment } from 'firebase/firestore';
import { Clock, Ship, Anchor, CheckCircle2, Waves, ScrollText, Send, Star, Megaphone, UserX, Lock, Unlock, Calendar, PlusCircle, Tag } from 'lucide-react';

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

    const unsubAttendance = onSnapshot(collection(firestore, `/artifacts/class-5a-app/public/data/attendance`), (snapshot) => {
      const attData = {};
      snapshot.forEach(doc => attData[doc.id] = doc.data().status);
      setAttendance(attData);
    });

    return () => { clearInterval(timer); unsubAnnounce(); unsubAttendance(); };
  }, []);

  const handleLogin = () => {
    const pw = prompt("請輸入導航員密碼：");
    if (pw === "123+++") setIsTeacher(true);
    else alert("密碼錯誤，請重試！");
  };

  const updateAttendance = async (studentId, status) => {
    await setDoc(doc(db, `/artifacts/class-5a-app/public/data/attendance`, studentId), { status, updatedAt: serverTimestamp() });
    alert(`已標記為 ${status}`);
  };

  const handlePostAnnouncement = async () => {
    const items = announcement.split('\n').filter(i => i.trim());
    await setDoc(doc(collection(db, `/artifacts/class-5a-app/public/data/announcements`)), {
      items,
      date: new Date().toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' }),
      createdAt: serverTimestamp()
    });
    setAnnouncement("");
    alert("📢 聯絡簿已更新！");
  };

  const handleCheckin = async () => {
    const reward = 5 + (Object.values(hwChecked).filter(v => v).length * 2);
    await setDoc(doc(db, `/artifacts/class-5a-app/public/data/student_bank`, selectedStudent.id), { bronze: increment(reward), updatedAt: serverTimestamp() }, { merge: true });
    alert(`⚓ ${selectedStudent.name} 獲得 ${reward} 銅幣！`);
    setSelectedStudent(null);
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] p-6 lg:p-10 font-sans">
      <header className="flex flex-col items-center mb-12">
        <div className="flex items-center gap-8 mb-4">
          <button onClick={handleLogin}><Ship className={`w-16 h-16 ${isTeacher ? 'text-yellow-500' : 'text-sky-600'}`} /></button>
          <h1 className="text-6xl font-black text-[#0C4A6E] tracking-tighter shadow-sky-100">五年甲班打卡系統</h1>
          <Anchor className="w-16 h-16 text-sky-600" />
        </div>
        <div className="bg-white/80 backdrop-blur px-8 py-3 rounded-full shadow-lg border-2 border-sky-100 flex items-center gap-6">
          <Calendar className="text-sky-600 w-6 h-6" />
          <span className="text-3xl font-black text-slate-700">{currentTime.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</span>
          <span className="text-3xl font-mono font-bold text-sky-600 border-l-2 pl-6">{currentTime.toLocaleTimeString()}</span>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        <section className="lg:col-span-7 bg-white/60 backdrop-blur-xl rounded-[4rem] p-10 shadow-2xl border-4 border-white">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-4xl font-black text-sky-900 flex items-center gap-4"><Star className="fill-yellow-500 text-yellow-500 w-10 h-10" /> 學生打卡區</h2>
            {isTeacher && <button onClick={() => setIsTeacher(false)} className="bg-red-500 text-white px-4 py-2 rounded-xl font-bold">登出管理</button>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {STUDENTS.map(s => (
              <button key={s.id} onClick={() => setSelectedStudent(s)} disabled={attendance[s.id] && attendance[s.id] !== '出席'}
                className={`relative h-32 rounded-[2.5rem] shadow-xl transition-all active:scale-95 flex flex-col items-center justify-center border-b-8
                  ${attendance[s.id] && attendance[s.id] !== '出席' ? 'bg-slate-200 border-slate-300 opacity-60' : 'bg-white border-sky-200 hover:translate-y-2 hover:border-b-0'}`}>
                <span className="absolute top-3 left-6 text-slate-300 font-black text-xl">No.{s.id}</span>
                <span className="text-4xl font-black text-slate-700">{s.name}</span>
                {attendance[s.id] && attendance[s.id] !== '出席' && <span className="mt-2 text-red-500 font-black text-lg flex items-center gap-1"><UserX className="w-5 h-5" />{attendance[s.id]}</span>}
              </button>
            ))}
          </div>
        </section>

        <section className="lg:col-span-5 flex flex-col gap-8">
          <div className="bg-[#0C4A6E] text-white rounded-[4rem] p-10 shadow-2xl relative overflow-hidden">
            <h2 className="text-4xl font-black mb-8 flex items-center gap-4"><ScrollText className="w-10 h-10" /> 班級聯絡簿</h2>
            <div className="bg-white/10 p-8 rounded-3xl mb-8 border-2 border-white/20">
              <p className="text-yellow-400 font-black mb-4 text-xl">📅 檢核日期：{hwDate}</p>
              <ul className="space-y-4 text-2xl font-bold">
                {latestHomework.map((item, i) => <li key={i} className="flex items-start gap-3"><div className="w-3 h-3 bg-sky-400 rounded-full mt-3" /> {item}</li>)}
              </ul>
            </div>
            {isTeacher && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESET_HOMEWORK.map(h => <button key={h} onClick={() => setAnnouncement(prev => prev + h + '\n')} className="bg-sky-700 px-3 py-1 rounded-lg text-sm hover:bg-sky-600 font-bold">+{h}</button>)}
                  {PRESET_TAGS.map(t => <button key={t} onClick={() => setAnnouncement(prev => prev + t + '\n')} className="bg-yellow-600 px-3 py-1 rounded-lg text-sm hover:bg-yellow-500 font-bold">+{t.replace('：','')}</button>)}
                </div>
                <textarea value={announcement} onChange={(e) => setAnnouncement(e.target.value)} placeholder="點擊上方標籤或手動輸入作業..."
                  className="w-full h-40 bg-white/10 border-2 border-white/30 rounded-3xl p-6 text-2xl focus:outline-none focus:border-white" />
                <button onClick={handlePostAnnouncement} className="w-full py-5 bg-sky-400 hover:bg-sky-300 text-[#0C4A6E] font-black text-2xl rounded-3xl flex items-center justify-center gap-3"><Send className="w-8 h-8" /> 發布並同步作業</button>
              </div>
            )}
          </div>
        </section>
      </main>

      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[4rem] p-12 w-full max-w-2xl shadow-2xl border-t-[12px] border-sky-500">
            <h2 className="text-5xl font-black text-sky-900 mb-2 flex items-center gap-4"><Anchor className="w-12 h-12" /> 任務回報</h2>
            <p className="text-2xl text-slate-500 font-bold mb-10 border-b pb-6">座號 {selectedStudent.id}：{selectedStudent.name}</p>
            
            <div className="space-y-5 mb-12">
              <p className="font-black text-slate-400 text-xl uppercase tracking-widest flex items-center gap-3"><Megaphone className="text-sky-500" /> 昨日任務檢核 ({hwDate})</p>
              {latestHomework.map((hw, i) => (
                <label key={i} className="flex items-center gap-6 p-6 bg-slate-50 rounded-3xl cursor-pointer hover:bg-sky-50 border-2 border-transparent hover:border-sky-200">
                  <input type="checkbox" className="w-10 h-10 rounded-xl text-sky-600 focus:ring-sky-500" onChange={(e) => setHwChecked({...hwChecked, [i]: e.target.checked})} />
                  <span className="text-3xl font-black text-slate-700">{hw}</span>
                </label>
              ))}
            </div>

            {isTeacher && (
              <div className="bg-red-50 p-6 rounded-[2rem] mb-10 border-2 border-red-100">
                <p className="text-red-800 font-black mb-4 flex items-center gap-2 text-xl"><Lock className="w-5 h-5" /> 老師專屬：更改出勤狀態</p>
                <div className="grid grid-cols-3 gap-3">
                  {['出席', '事假', '病假'].map(st => (
                    <button key={st} onClick={() => updateAttendance(selectedStudent.id, st)} className="py-3 bg-white border-2 border-red-200 rounded-2xl font-black text-red-700 hover:bg-red-500 hover:text-white transition-all">{st}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              <button onClick={() => setSelectedStudent(null)} className="py-6 bg-slate-100 text-slate-500 rounded-3xl text-2xl font-black hover:bg-slate-200">取消</button>
              <button onClick={handleCheckin} className="py-6 bg-sky-600 text-white rounded-3xl text-2xl font-black shadow-xl hover:bg-sky-500 flex items-center justify-center gap-3"><CheckCircle2 className="w-8 h-8" /> 完成打卡</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
