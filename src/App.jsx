import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, query, where, orderBy, limit, serverTimestamp, getDocs, writeBatch } from 'firebase/firestore';
import { Ship, ScrollText, ChevronLeft, ChevronRight, XCircle, Clock, UserCheck, Plus, Minus, Trash2, LayoutDashboard, Calendar, Trophy, XOctagon, CheckCircle2, Smile, Lock, Unlock, ArrowUp, ArrowDown, Printer, UserMinus, Type, GripVertical } from 'lucide-react';

const APP_VERSION = "v14.7.260222_Perfect_Edition";
const firebaseConfig = { apiKey: "AIzaSyArwz6gPeW9lNq_8LOfnKYwZmkRN-Wgtb8", authDomain: "class-5a-app.firebaseapp.com", projectId: "class-5a-app", storageBucket: "class-5a-app.firebasestorage.app", messagingSenderId: "828328241350", appId: "1:828328241350:web:5d39d529209f87a2540fc7" };
const STUDENTS = [{ id: '1', name: '陳昕佑' }, { id: '2', name: '徐偉綸' }, { id: '3', name: '蕭淵群' }, { id: '4', name: '吳秉晏' }, { id: '5', name: '呂秉蔚' }, { id: '6', name: '吳家昇' }, { id: '7', name: '翁芷儀' }, { id: '8', name: '鄭筱妍' }, { id: '9', name: '周筱涵' }, { id: '10', name: '李婕妤' }];
const SPECIAL_IDS = ['5', '7', '8'];
const QUICK_TAGS = ["預習數課", "數習", "數八", "背成+小+寫", "國甲", "國乙", "國丙", "閱讀A", "閱讀B", "國預習單", "朗讀", "解釋單", "國練卷", "符號本", "帶學用品", "訂正功課"];

const formatDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const maskName = (n) => n ? n[0] + "O" + (n[2] || "") : "";

const App = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [user, setUser] = useState(null);
  const [viewDate, setViewDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [displayItems, setDisplayItems] = useState([]);
  const [announcementText, setAnnouncementText] = useState("");
  const [attendance, setAttendance] = useState({});
  const [activeStudent, setActiveStudent] = useState(null);
  const [viewOnlyStudent, setViewOnlyStudent] = useState(null);
  const [prevTasks, setPrevTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState({});
  const [fontSize, setFontSize] = useState(48);
  const [lineHeight, setLineHeight] = useState(1.1);
  const [useBiauKai, setUseBiauKai] = useState(false);
  const [recordedDates, setRecordedDates] = useState([]);
  const [activeStatMonth, setActiveStatMonth] = useState(`${new Date().getMonth() + 1}月`);
  const [monthlyStats, setMonthlyStats] = useState({});
  
  // 版面拖拉狀態
  const [w1, setW1] = useState(25);
  const [w2, setW2] = useState(25);

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    setDb(getFirestore(app));
    setAuth(getAuth(app));
    onAuthStateChanged(getAuth(app), (u) => setUser(u));
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!db) return;
    onSnapshot(collection(db, "announcements"), (snap) => setRecordedDates(snap.docs.map(d => d.id).sort()));
  }, [db]);

  // 主視窗資料監聽
  useEffect(() => {
    if (!db) return;
    const dateKey = formatDate(viewDate);
    const m = `${viewDate.getMonth() + 1}月`;
    if (activeStatMonth !== m) setActiveStatMonth(m);

    onSnapshot(doc(db, "announcements", dateKey), (snap) => {
      const items = snap.exists() ? snap.data().items || [] : [];
      setDisplayItems(items);
      if (!isEditing) setAnnouncementText(items.join('\n'));
    });
    onSnapshot(collection(db, `attendance_${dateKey}`), (snap) => {
      const data = {};
      snap.forEach(d => data[d.id] = d.data());
      setAttendance(data);
    });
    const fetchPrev = async () => {
      const q = query(collection(db, "announcements"), where("date", "<", dateKey), orderBy("date", "desc"), limit(1));
      const snap = await getDocs(q);
      setPrevTasks(!snap.empty ? snap.docs[0].data().items : []);
    };
    fetchPrev();
  }, [db, viewDate, isEditing]);

  // 背景靜默計算每月報表
  useEffect(() => {
    if (!db || recordedDates.length === 0) return;
    let isMounted = true;
    const fetchMonth = async () => {
      const monthStr = activeStatMonth.replace('月', '').padStart(2, '0');
      const targetDates = recordedDates.filter(d => d.split('-')[1] === monthStr);
      const stats = {};
      STUDENTS.forEach(s => stats[s.id] = { onTime: 0, late: 0, absent: 0, fullDone: 0, issues: [] });

      for (const dKey of targetDates) {
        const attSnap = await getDocs(collection(db, `attendance_${dKey}`));
        const annSnap = await getDocs(query(collection(db, "announcements"), where("date", "==", dKey)));
        const dailyTasks = !annSnap.empty ? annSnap.docs[0].data().items : [];

        attSnap.forEach(doc => {
          const sid = doc.id;
          if (!stats[sid]) return;
          const d = doc.data();
          
          if (d.status === 'present') {
            const status = getAttStatus(sid, d.checkinTime);
            if (status === 'on-time') stats[sid].onTime++;
            else if (status === 'late') stats[sid].late++;
          } else if (d.status === 'sick' || d.status === 'personal') {
            stats[sid].absent++;
          }
          
          if (dailyTasks.length > 0) {
            const hw = d.completedTasks || {};
            let allDone = true;
            dailyTasks.forEach(t => {
              const cleanTask = t.trim();
              if (!hw[t] && !hw[cleanTask]) {
                allDone = false;
                stats[sid].issues.push(`${dKey.slice(5)}: ${cleanTask} (缺交)`);
              } else if (isTaskLate(sid, d.lastActionTime)) {
                stats[sid].issues.push(`${dKey.slice(5)}: ${cleanTask} (遲交)`);
              }
            });
            if (allDone) stats[sid].fullDone++;
          }
        });
      }
      if (isMounted) setMonthlyStats(stats);
    };
    fetchMonth();
    return () => { isMounted = false; };
  }, [db, activeStatMonth, recordedDates, attendance]);

  const getAttStatus = (id, time) => {
    if (!time) return 'absent';
    const [h, m, s] = time.split(':').map(Number);
    const totalS = h * 3600 + m * 60 + (s || 0);
    if (SPECIAL_IDS.includes(id)) return totalS >= 8 * 3600 + 10 * 60 + 30 ? 'late' : 'on-time'; // >= 08:10:30 遲到
    return totalS >= 7 * 3600 + 40 * 60 + 1 ? 'late' : 'on-time'; // >= 07:40:01 遲到
  };

  const isTaskLate = (id, actionTime) => {
    if (!actionTime) return false;
    const [h, m, s] = actionTime.split(':').map(Number);
    const totalS = h * 3600 + m * 60 + (s || 0);
    if (SPECIAL_IDS.includes(id)) return totalS > 8 * 3600 + 15 * 60; // > 08:15:00 遲交
    return totalS >= 7 * 3600 + 40 * 60 + 1; // >= 07:40:01 遲交
  };

  const submitCheckin = async (status = 'present') => {
    const dateKey = formatDate(viewDate);
    const nowTime = new Date().toLocaleTimeString('zh-TW', { hour12: false });
    await setDoc(doc(db, `attendance_${dateKey}`, activeStudent.id), {
      name: activeStudent.name, status, completedTasks: selectedTasks, checkinTime: attendance[activeStudent.id]?.checkinTime || nowTime, lastActionTime: nowTime, timestamp: serverTimestamp()
    }, { merge: true });
    setActiveStudent(null);
  };

  const handleDeleteDate = async (dateStr) => {
    if (!user) return;
    if (window.confirm(`確定要刪除 ${dateStr} 的紀錄與標籤嗎？`)) {
      const batch = writeBatch(db);
      batch.delete(doc(db, "announcements", dateStr));
      const attDocs = await getDocs(collection(db, `attendance_${dateStr}`));
      attDocs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      if (dateStr === formatDate(viewDate)) {
        setDisplayItems([]); setAnnouncementText(""); setAttendance({});
      }
    }
  };

  const isPublished = recordedDates.includes(formatDate(viewDate));

  return (
    <div className="min-h-screen bg-[#F0F9FF] flex flex-col font-sans select-none overflow-x-hidden">
      {/* Header */}
      <header className="bg-white border-b-2 border-sky-100 shadow-sm sticky top-0 z-[100] print:hidden">
        <div className="px-8 py-4 flex items-center justify-between border-b border-sky-50">
          <div className="flex items-center gap-6">
            <Ship className="w-16 h-16 text-sky-600" />
            <div className="flex items-baseline gap-4">
              <h1 className="text-6xl font-black text-sky-900 leading-none">五甲航海日誌</h1>
              <span className="text-lg font-bold text-slate-300">Ver {APP_VERSION}</span>
              <button onClick={() => user ? signOut(auth) : signInWithEmailAndPassword(auth, prompt("Email"), prompt("密碼"))} className={`ml-4 px-4 py-2 rounded-xl text-xl font-bold flex items-center gap-2 ${user ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                {user ? <Unlock size={24}/> : <Lock size={24}/>} {user ? '教師模式' : '學生模式'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-10">
            <span className="text-4xl font-bold text-slate-500">{currentTime.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })}</span>
            <span className="text-8xl font-mono font-black text-blue-700 drop-shadow-md">{currentTime.toLocaleTimeString('zh-TW', { hour12: false })}</span>
          </div>
        </div>

        <div className="px-8 py-3 flex items-center justify-between bg-sky-50/40">
          <div className="flex items-center gap-4">
            <span className="font-bold text-sky-700 text-2xl mr-2">航行日：</span>
            <div className="flex items-center gap-2 overflow-x-auto max-w-[50vw] scrollbar-hide py-1">
              {recordedDates.filter(d => parseInt(d.split('-')[1]) === parseInt(activeStatMonth)).map(d => (
                <button key={d} onClick={(e) => { if(user && e.altKey) handleDeleteDate(d); else setViewDate(new Date(d)); }} title={user ? "按住 Alt 點擊可刪除" : ""}
                  className={`px-6 py-2 rounded-2xl text-2xl font-black transition-all shrink-0 ${formatDate(viewDate) === d ? 'bg-sky-600 text-white shadow-lg scale-105' : 'bg-white text-sky-400 border border-sky-100 hover:bg-sky-50'}`}>
                  {d.split('-')[2]}
                </button>
              ))}
            </div>
          </div>
          
          {user && (
            <div className="flex items-center gap-3">
              <div className="flex bg-white p-1.5 rounded-2xl items-center shadow-inner border border-sky-100">
                <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() - 1)))} className="p-2 hover:bg-sky-50 rounded-xl transition-all"><ChevronLeft size={36}/></button>
                <span className="text-3xl font-black px-6 text-sky-800">{formatDate(viewDate)}</span>
                <button onClick={() => setViewDate(new Date(viewDate.setDate(viewDate.getDate() + 1)))} className="p-2 hover:bg-sky-50 rounded-xl transition-all"><ChevronRight size={36}/></button>
              </div>
              <button onClick={() => handleDeleteDate(formatDate(viewDate))} className="p-3 bg-rose-100 text-rose-600 rounded-2xl hover:bg-rose-500 hover:text-white transition-all shadow-sm" title="刪除當前日期"><Trash2 size={32}/></button>
              <button onClick={() => setDoc(doc(db, "announcements", formatDate(viewDate)), { date: formatDate(viewDate), items: displayItems }, {merge:true})} className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm" title="新增/儲存日期"><Plus size={32}/></button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden p-4 h-[calc(100vh-250px)] print:hidden relative">
        {/* 1. 簽到區 */}
        <div style={{ width: `${w1}%` }} className="bg-white rounded-[3rem] shadow-sm p-4 flex flex-col border border-sky-50 h-full overflow-hidden shrink-0">
          <h2 className="text-3xl font-black mb-4 text-sky-800 flex items-center gap-3 px-2 shrink-0"><UserCheck size={40}/> 航海員簽到</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {STUDENTS.map(s => {
              const d = attendance[s.id];
              const attStat = getAttStatus(s.id, d?.checkinTime);
              let color = 'bg-slate-50 text-slate-300 border-slate-100';
              if (!isPublished) color = 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed';
              else if (d?.status === 'present') color = attStat === 'late' ? 'bg-pink-100 text-pink-600 border-pink-200 shadow-sm' : 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm';
              else if (d?.status === 'sick' || d?.status === 'personal') color = 'bg-slate-600 text-white border-slate-700 shadow-inner';
              
              return (
                <button key={s.id} disabled={!isPublished} onClick={() => { setSelectedTasks(d?.completedTasks || {}); setActiveStudent(s); }} className={`h-24 rounded-[1.8rem] flex flex-col items-center justify-center transition-all border-b-8 active:border-b-0 ${color}`}>
                  <span className="text-5xl font-black">{maskName(s.name)}</span>
                  {d?.checkinTime && <span className={`text-2xl font-black mt-1 ${attStat === 'late' ? 'text-pink-700' : 'text-emerald-100'}`}>{d?.status === 'present' ? d.checkinTime : (d.status === 'sick' ? '病假' : '事假')}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* 拉桿 1 */}
        <div className="w-4 mx-1 cursor-col-resize flex items-center justify-center hover:bg-sky-200 rounded-full transition-colors z-50 group"
          onMouseDown={(e) => {
            const startX = e.clientX; const startW = w1;
            const move = (ev) => setW1(Math.max(15, Math.min(startW + ((ev.clientX - startX) / window.innerWidth) * 100, 40)));
            const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
            document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
          }}><GripVertical className="text-sky-300 group-hover:text-sky-600"/></div>

        {/* 2. 進度區 */}
        <div style={{ width: `${w2}%` }} className="bg-white rounded-[3rem] shadow-sm p-4 flex flex-col border border-sky-50 h-full overflow-hidden shrink-0">
          <h2 className="text-3xl font-black mb-4 text-sky-800 flex items-center gap-3 px-2 shrink-0"><LayoutDashboard size={40}/> 今日任務進度</h2>
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3">
            {STUDENTS.map(s => {
              const hw = attendance[s.id]?.completedTasks || {};
              const comp = Object.values(hw).filter(v => v).length;
              const total = prevTasks.length;
              const isFull = comp === total && total > 0;
              return (
                <div key={s.id} onClick={() => setViewOnlyStudent({ student: s, tasks: hw })} className={`flex items-center p-3 rounded-[1.5rem] border transition-all cursor-pointer ${isFull ? 'bg-emerald-50 border-emerald-200' : 'bg-sky-50/30 border-sky-100 hover:bg-sky-100'}`}>
                  <span className="text-3xl font-black text-sky-900 w-32 truncate">{maskName(s.name)}</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded-full mx-4 overflow-hidden shadow-inner"><div className="h-full bg-sky-500 transition-all duration-700" style={{ width: `${total > 0 ? (comp / total) * 100 : 0}%` }}></div></div>
                  <span className="text-3xl font-black text-sky-600 w-24 text-right">{comp}/{total}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 拉桿 2 */}
        <div className="w-4 mx-1 cursor-col-resize flex items-center justify-center hover:bg-sky-200 rounded-full transition-colors z-50 group"
          onMouseDown={(e) => {
            const startX = e.clientX; const startW = w2;
            const move = (ev) => setW2(Math.max(15, Math.min(startW + ((ev.clientX - startX) / window.innerWidth) * 100, 40)));
            const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
            document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
          }}><GripVertical className="text-sky-300 group-hover:text-sky-600"/></div>

        {/* 3. 任務區 */}
        <div style={{ width: `${100 - w1 - w2}%` }} className="bg-[#0C4A6E] rounded-[3rem] shadow-xl p-8 text-white flex flex-col h-full overflow-hidden shrink-0">
          <div className="flex justify-between items-center mb-4 border-b border-white/20 pb-4 shrink-0">
            <h2 className="text-4xl font-black flex items-center gap-4 text-amber-400 drop-shadow-md"><ScrollText size={48}/> 任務發布區</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl shadow-inner">
                <button onClick={() => setUseBiauKai(!useBiauKai)} className={`p-2 rounded-xl transition-all ${useBiauKai ? 'bg-sky-500' : 'hover:bg-white/20'}`} title="切換標楷體"><Type size={24}/></button>
                <div className="w-px h-6 bg-white/20 mx-1" />
                <button onClick={() => setFontSize(f => Math.max(20, f-4))} className="p-2 hover:bg-white/20 rounded-xl transition-all"><Minus/></button>
                <button onClick={() => setFontSize(f => Math.min(100, f+4))} className="p-2 hover:bg-white/20 rounded-xl transition-all"><Plus/></button>
                <div className="w-px h-6 bg-white/20 mx-1" />
                <button onClick={() => setLineHeight(l => Math.max(0.7, l-0.1))} className="p-2 hover:bg-white/20 rounded-xl transition-all"><ArrowDown size={24}/></button>
                <button onClick={() => setLineHeight(l => Math.min(3.0, l+0.1))} className="p-2 hover:bg-white/20 rounded-xl transition-all"><ArrowUp size={24}/></button>
              </div>
              {user && <button onClick={() => isEditing ? (setIsEditing(false), setDoc(doc(db, "announcements", formatDate(viewDate)), { items: announcementText.split('\n').filter(Boolean), date: formatDate(viewDate) }, {merge:true})) : setIsEditing(true)} className="bg-emerald-500 px-8 py-3 rounded-2xl font-black text-2xl shadow-lg transition-transform active:scale-95 text-white">{isEditing ? '儲存' : '編輯'}</button>}
            </div>
          </div>
          {isEditing && (
            <div className="flex flex-wrap gap-2 mb-4 animate-fade-in max-h-[120px] overflow-y-auto pr-2 custom-scrollbar shrink-0">
              {QUICK_TAGS.map(t => <button key={t} onClick={() => setAnnouncementText(p => p ? p + '\n' + t : t)} className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-xl font-bold hover:bg-white/30 transition-all">{t}</button>)}
            </div>
          )}
          <div className="flex-1 bg-black/20 rounded-[2.5rem] p-8 overflow-y-auto custom-scrollbar border border-white/5 shadow-inner">
            {isEditing ? (
              <textarea value={announcementText} onChange={e => setAnnouncementText(e.target.value)} className={`flex-1 bg-transparent text-white font-black outline-none leading-relaxed text-4xl w-full h-full ${useBiauKai ? 'font-[BiauKai]' : ''}`} />
            ) : (
              <div className={`font-black ${useBiauKai ? 'font-[BiauKai]' : ''}`} style={{ fontSize: `${fontSize}px`, lineHeight: lineHeight }}>
                {displayItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-8 border-b border-white/5 pb-2 mb-2 last:border-0 last:mb-0 transition-all">
                    <span className="flex-shrink-0 w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white text-2xl shadow-lg border-4 border-orange-200/50 font-sans">{i+1}</span>
                    <span className="text-white drop-shadow-sm pt-1">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 每月分析報表 */}
      <section className="mx-4 mb-8 bg-white rounded-[3rem] p-6 shadow-2xl border-4 border-sky-100 flex flex-col shrink-0 min-h-[300px] print:hidden">
        <div className="flex justify-between items-center mb-4 px-2">
          <h3 className="text-4xl font-black text-sky-900 flex items-center gap-5"><Calendar size={48} className="text-sky-600"/> 📅 {activeStatMonth} 分析報表</h3>
          <div className="flex gap-4 items-center">
            <select value={activeStatMonth} onChange={(e) => setActiveStatMonth(e.target.value)} className="bg-sky-50 border-2 border-sky-200 text-sky-700 rounded-2xl px-6 py-2 font-black text-2xl outline-none shadow-sm cursor-pointer hover:bg-sky-100 transition-colors">
              {["2月", "3月", "4月", "5月", "6月", "7月"].map(m => <option key={m} value={m}>{m} 統計</option>)}
            </select>
            {user && <button onClick={() => window.print()} className="flex items-center gap-3 bg-indigo-600 text-white px-6 py-2.5 rounded-2xl font-black text-xl hover:bg-indigo-500 shadow-xl transition-all active:scale-95"><Printer size={24}/> 列印報表</button>}
          </div>
        </div>
        <div className="flex-1 overflow-auto rounded-[2rem] border-2 border-sky-50 relative custom-scrollbar">
          <table className="w-full text-center table-fixed border-collapse">
            <thead className="sticky top-0 z-40 bg-sky-700 text-white shadow-md">
              <tr className="text-2xl font-black"><th className="p-4 bg-sky-800 border-r border-sky-600 sticky left-0 z-50 w-64 text-left pl-10">姓名</th><th className="p-4 bg-cyan-600 border-r border-sky-500">出席狀況</th><th className="p-4 bg-indigo-600">作業齊全天數</th></tr>
            </thead>
            <tbody className="divide-y divide-sky-100">
              {STUDENTS.map(s => {
                const sData = monthlyStats[s.id];
                return (
                  <tr key={s.id} className="hover:bg-sky-50/50 transition-colors">
                    <td className="p-4 text-3xl font-black text-sky-900 border-r-2 border-sky-50 sticky left-0 z-10 bg-white text-left pl-10">{maskName(s.name)}</td>
                    <td className="p-4 border-r-2 border-sky-50">
                      <div className="flex justify-center items-center gap-8 text-2xl font-black">
                        <div className="flex items-center gap-2 text-emerald-600"><CheckCircle2 size={32}/> 準時: {sData ? sData.onTime : '--'}</div>
                        <div className="flex items-center gap-2 text-pink-500"><Clock size={32}/> 遲到: {sData ? sData.late : '--'}</div>
                        <div className="flex items-center gap-2 text-slate-400"><UserMinus size={32}/> 假別: {sData ? sData.absent : '--'}</div>
                      </div>
                    </td>
                    <td className="p-4 text-sky-600 text-3xl font-black"><Trophy size={36} className="inline mr-3"/> 齊全: {sData ? sData.fullDone : '--'} 天</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 彈窗系統 */}
      {(activeStudent || viewOnlyStudent) && (
        <div className="fixed inset-0 bg-sky-900/95 backdrop-blur-xl z-[300] flex items-center justify-center p-8 print:hidden">
          <div className="bg-white rounded-[4rem] w-full max-w-[90vw] p-10 shadow-2xl relative flex flex-col max-h-[90vh] border-[12px] border-sky-100/50">
            <div className="flex justify-between items-center mb-6 border-b-4 border-sky-50 pb-6 shrink-0">
              <h3 className="text-6xl font-black text-sky-900 leading-none">
                {maskName(activeStudent?.name || viewOnlyStudent?.student.name)} 
                <span className="text-2xl text-sky-500 ml-6 font-bold tracking-widest bg-sky-50 px-4 py-2 rounded-full border border-sky-100">任務確認 - {formatDate(viewDate)}</span>
              </h3>
              <button onClick={() => { setActiveStudent(null); setViewOnlyStudent(null); }} className="text-slate-300 hover:text-red-500 transition-all transform hover:rotate-90 bg-slate-50 rounded-full p-2"><XCircle size={64}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
              <div className="grid grid-cols-3 gap-6">
                {activeStudent ? prevTasks.map((t, idx) => (
                  <label key={idx} className={`p-6 rounded-[2rem] border-4 flex items-center gap-6 transition-all active:scale-95 cursor-pointer shadow-sm ${selectedTasks[t] ? 'bg-emerald-500 border-emerald-600 text-white shadow-inner' : 'bg-white border-slate-300 text-slate-700 hover:border-emerald-300 hover:bg-slate-50'}`}>
                    <input type="checkbox" checked={!!selectedTasks[t]} onChange={(e) => setSelectedTasks({...selectedTasks, [t]: e.target.checked})} className="w-10 h-10 accent-emerald-600 cursor-pointer" />
                    <span className="text-4xl font-black leading-tight">{t}</span>
                  </label>
                )) : (
                  <div className="col-span-3 flex flex-col items-center justify-center py-10 w-full h-full">
                    {prevTasks.length > 0 && prevTasks.every(t => viewOnlyStudent.tasks[t]) ? (
                      <div className="flex flex-col items-center gap-6 animate-fade-in my-auto">
                        <Smile size={200} className="text-emerald-500 drop-shadow-xl animate-bounce" />
                        <p className="text-6xl font-black text-emerald-600 tracking-wider">今日任務已繳交</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-6 w-full px-4">
                        <div className="col-span-3 border-b-4 border-red-100 pb-4 mb-4 flex items-center gap-4">
                          <XOctagon size={48} className="text-red-600" />
                          <p className="text-5xl font-black text-red-600">目前尚有缺交任務：</p>
                        </div>
                        {prevTasks.filter(t => !viewOnlyStudent.tasks[t]).map((t, idx) => (
                          <div key={idx} className="p-8 bg-red-50 border-[3px] border-red-500 rounded-[2.5rem] flex items-center gap-6 shadow-sm"><span className="text-4xl font-black text-red-700">{t}</span></div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {activeStudent && (
              <div className="grid grid-cols-3 gap-6 shrink-0 h-28 mt-8 border-t-4 border-slate-50 pt-8">
                <button onClick={() => submitCheckin('present')} className="bg-sky-500 text-white rounded-[2rem] text-4xl font-black shadow-xl hover:bg-sky-600 transition-all active:scale-95">確認打卡</button>
                <button onClick={() => submitCheckin('sick')} className="bg-rose-500 text-white rounded-[2rem] text-4xl font-black hover:bg-rose-600 transition-all shadow-md active:scale-95">病假</button>
                <button onClick={() => submitCheckin('personal')} className="bg-amber-500 text-white rounded-[2rem] text-4xl font-black hover:bg-amber-600 transition-all shadow-md active:scale-95">事假</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 列印報表區域 (純淨黑白高對比版) */}
      <div className="hidden print:block p-8 bg-white text-black font-sans">
        <h1 className="text-center text-4xl font-bold mb-8 border-b-4 border-black pb-4">五年甲班 {activeStatMonth} 生活與學習表現統計表</h1>
        <div className="grid grid-cols-2 gap-8">
          {STUDENTS.map(s => {
            const sd = monthlyStats[s.id] || { onTime: 0, late: 0, absent: 0, fullDone: 0, issues: [] };
            return (
              <div key={s.id} className="border-2 border-black p-6 rounded-xl break-inside-avoid">
                <h3 className="text-2xl font-bold border-b-2 border-slate-300 pb-2 mb-4">五年甲班 {s.name} {activeStatMonth} 表現紀錄</h3>
                <div className="space-y-2 mb-4 text-lg">
                  <p>● <span className="font-bold">出席：</span> 準時 {sd.onTime} 天 / 遲到 {sd.late} 天 / 假別 {sd.absent} 天</p>
                  <p>● <span className="font-bold">作業：</span> 齊全 {sd.fullDone} 天</p>
                </div>
                <div className="text-base mt-4 border-t-2 border-slate-100 pt-4">
                  <p className="font-bold mb-2">● 需補交/補正任務明細：</p>
                  <div className="pl-4 space-y-1">
                    {sd.issues.length > 0 ? sd.issues.map((iss, i) => <p key={i}>· {iss}</p>) : <p className="text-slate-500 italic">目前各項任務皆已齊全</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default App;
