import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import ProgressRing from "./components/ProgressRing";

// --- 1. СЛОВАРЬ ДЛЯ ПЕРЕВОДОВ (i18n) ---
const TRANSLATIONS = {
  ru: {
    appTitle: "Circle Up",
    start: "Начать",
    settings: "Настройки",
    language: "Язык приложения",
    back: "Назад",
    createNew: "➕ Создать новую цель",
    noGoals: "У вас пока нет целей. Создайте первую!",
    mainGoalLabel: "Главная цель",
    subGoalsLabel: "Ежедневные подцели (минимум 2)",
    addSubgoal: "➕ Добавить подцель",
    save: "Сохранить цель",
    edit: "✏️ Редактировать",
    delete: "Удалить",
    subgoalPlaceholder: "Название подцели...",
    congratsTitle: "🎉 Поздравляем!",
    congratsText: "Вы достигли своей глобальной цели! Это огромный шаг.",
    finishProgress: "Завершить прогресс",
    toMenu: "В главное меню",
  },
  en: {
    appTitle: "Circle Up",
    start: "Start",
    settings: "Settings",
    language: "App Language",
    back: "Back",
    createNew: "➕ Create new goal",
    noGoals: "You have no goals yet. Create your first one!",
    mainGoalLabel: "Main goal",
    subGoalsLabel: "Daily subgoals (minimum 2)",
    addSubgoal: "➕ Add subgoal",
    save: "Save goal",
    edit: "✏️ Edit",
    delete: "Delete",
    subgoalPlaceholder: "Subgoal name...",
    congratsTitle: "🎉 Congratulations!",
    congratsText: "You have achieved your main goal! That's a huge step.",
    finishProgress: "Finish progress",
    toMenu: "To main menu",
  }
};

// Палитра цветов для кругов
const COLORS = ["#EF4444", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316", "#6366F1", "#84CC16"];

function App() {
  // --- 2. ГЛОБАЛЬНЫЕ СОСТОЯНИЯ ---
  const [lang, setLang] = useState(() => localStorage.getItem("lang") || "ru");
  const [screen, setScreen] = useState("menu"); // 'menu', 'settings', 'list', 'create', 'diagram'
  
  // Массив всех созданных целей
  const [goals, setGoals] = useState(() => {
    const saved = localStorage.getItem("goals");
    return saved ? JSON.parse(saved) : [];
  });

  const [showCongrats, setShowCongrats] = useState(false);

  const [activeGoalId, setActiveGoalId] = useState(null);
  const t = TRANSLATIONS[lang];

  useEffect(() => {
    localStorage.setItem("lang", lang);
    localStorage.setItem("goals", JSON.stringify(goals));
  }, [lang, goals]);

  const fireSmallConfetti = (x = 0.5, y = 0.5) => {
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { x, y },
      colors: ['#4F46E5', '#10B981', '#F59E0B']
    });
  };

  const fireBigFireworks = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) {
        return clearInterval(interval);
      }
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: 0.1, y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: 0.9, y: Math.random() - 0.2 } });
    }, 250);
  };

  // --- 3. ФУНКЦИИ УПРАВЛЕНИЯ ЦЕЛЯМИ ---
  const handleSaveGoal = (goalData) => {
    if (activeGoalId) {
      setGoals(goals.map(g => g.id === activeGoalId ? { ...goalData, id: activeGoalId } : g));
    } else {
      const newGoal = { ...goalData, id: Date.now().toString() };
      setGoals([...goals, newGoal]);
    }
    setScreen("list");
  };

  const handleDeleteGoal = (id) => {
    if(window.confirm(lang === 'ru' ? "Удалить эту цель?" : "Delete this goal?")) {
      setGoals(goals.filter(g => g.id !== id));
    }
  };

  const toggleSubgoal = (goalId, subId, event) => {
    let isNowCompleted = false;

    let confettiX = 0.5;
    let confettiY = 0.5;
    
    if (event && event.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      confettiX = (rect.left + rect.width / 2) / window.innerWidth;
      confettiY = (rect.top + rect.height / 2) / window.innerHeight;
    }

    const updatedGoals = goals.map(g => {
      if (g.id === goalId) {
        const updatedSubgoals = g.subgoals.map(s => {
          if (s.id === subId) {
            const newState = !s.completed;
            if (newState) fireSmallConfetti(confettiX, confettiY); 
            return { ...s, completed: newState };
          }
          return s;
        });

        if (updatedSubgoals.length > 0 && updatedSubgoals.every(s => s.completed)) {
          isNowCompleted = true;
        }
        return { ...g, subgoals: updatedSubgoals };
      }
      return g;
    });

    setGoals(updatedGoals);

    if (isNowCompleted) {
      fireBigFireworks();
      setTimeout(() => setShowCongrats(true), 500);
    }
  };

  // --- 4. ЭКРАНЫ ---

  // ЭКРАН 1: Главное меню
  const renderMenu = () => (
    <div style={styles.centerScreen}>
      <h1 style={{ fontSize: "32px", marginBottom: "40px", color: "#4F46E5" }}>{t.appTitle}</h1>
      <button style={styles.primaryBtn} onClick={() => setScreen("list")}>{t.start}</button>
      <button style={styles.secondaryBtn} onClick={() => setScreen("settings")}>{t.settings}</button>
    </div>
  );

  // ЭКРАН 2: Настройки
  const renderSettings = () => (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => setScreen("menu")}>← {t.back}</button>
        <h2>{t.settings}</h2>
        <div style={{width: 60}}></div>
      </div>
      <div style={styles.content}>
        <label style={{ fontWeight: "bold", marginBottom: "10px", display: "block" }}>{t.language}:</label>
        <div style={{ display: "flex", gap: "10px" }}>
          <button 
            style={{...styles.langBtn, backgroundColor: lang === "ru" ? "#4F46E5" : "#e5e7eb", color: lang === "ru" ? "white" : "black"}}
            onClick={() => setLang("ru")}
          >Русский 🇷🇺</button>
          <button 
            style={{...styles.langBtn, backgroundColor: lang === "en" ? "#4F46E5" : "#e5e7eb", color: lang === "en" ? "white" : "black"}}
            onClick={() => setLang("en")}
          >English 🇬🇧</button>
        </div>
      </div>
    </div>
  );

  // ЭКРАН 3: Список целей
  const renderList = () => (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => setScreen("menu")}>← {t.back}</button>
        <h2>Мои цели</h2>
        <div style={{width: 60}}></div>
      </div>
      <div style={styles.content}>
        <button style={styles.primaryBtn} onClick={() => { setActiveGoalId(null); setScreen("create"); }}>
          {t.createNew}
        </button>
        
        {goals.length === 0 && <p style={{ textAlign: "center", color: "gray", marginTop: "20px" }}>{t.noGoals}</p>}

        {goals.map(goal => (
          <div key={goal.id} style={styles.card}>
            <div onClick={() => { setActiveGoalId(goal.id); setScreen("diagram"); }} style={{ cursor: "pointer", flex: 1 }}>
              <h3 style={{ margin: "0 0 10px 0" }}>{goal.mainGoal}</h3>
              <p style={{ margin: 0, fontSize: "12px", color: "gray" }}>Подцелей: {goal.subgoals.length}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <button style={styles.iconBtn} onClick={() => { setActiveGoalId(goal.id); setScreen("create"); }}>✏️</button>
              <button style={{...styles.iconBtn, color: "red"}} onClick={() => handleDeleteGoal(goal.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ЭКРАН 4: Создание и редактирование цели
  const renderCreateForm = () => {
    const initialData = activeGoalId 
      ? goals.find(g => g.id === activeGoalId) 
      : { mainGoal: "", subgoals: [{ id: 1, label: "", color: COLORS[0], completed: false }, { id: 2, label: "", color: COLORS[1], completed: false }] };
    
    return (
      <GoalForm 
        t={t} 
        initialData={initialData} 
        onSave={handleSaveGoal} 
        onCancel={() => setScreen("list")} 
      />
    );
  };

  // ЭКРАН 5: Диаграмма с кругами
  const renderDiagram = () => {
    const goal = goals.find(g => g.id === activeGoalId);
    if (!goal) return null;

    const doneCount = goal.subgoals.filter(s => s.completed).length;
    const overallProgress = (doneCount / goal.subgoals.length) * 100;
    const orbitRadius = 140;
    const centerX = 200;
    const centerY = 200;

    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => setScreen("list")}>← {t.back}</button>
          <h2 style={{ fontSize: "16px", margin: 0, color: "#374151" }}>Прогресс</h2>
          <div style={{width: 60}}></div>
        </div>
        
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ position: "relative", width: 400, height: 400, transform: "scale(0.9)" }}>
            
            <div style={{ position: "absolute", top: 130, left: 130, width: 140, height: 140 }}>
              <ProgressRing size={140} strokeWidth={14} progress={overallProgress} color="#4F46E5" />
              <div style={{ 
                position: "absolute", top: 0, left: 0, width: "100%", height: "100%", 
                display: "flex", justifyContent: "center", alignItems: "center", 
                padding: "25px", boxSizing: "border-box", textAlign: "center" 
              }}>
                <p style={{ margin: 0, fontWeight: "bold", fontSize: 13, color: "#1f2937", wordBreak: "break-word", lineHeight: "1.2" }}>
                  {goal.mainGoal}
                </p>
              </div>
            </div>

            {goal.subgoals.map((sub, index) => {
              const angle = (index / goal.subgoals.length) * 2 * Math.PI - Math.PI / 2;
              const x = centerX + orbitRadius * Math.cos(angle) - 40;
              const y = centerY + orbitRadius * Math.sin(angle) - 40;

              return (
                <div 
                  key={sub.id} 
                  onClick={(e) => toggleSubgoal(goal.id, sub.id, e)} 
                  style={{ position: "absolute", left: x, top: y, cursor: "pointer", textAlign: "center", width: 80 }}
                >
                  <ProgressRing size={80} strokeWidth={8} progress={sub.completed ? 100 : 0} color={sub.color} />
                  <p style={{ fontSize: 11, marginTop: 8, marginBottom: 0, fontWeight: "600", color: "#4B5563", wordBreak: "break-word", lineHeight: "1.2" }}>
                    {sub.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ padding: "20px", display: "flex", justifyContent: "flex-start" }}>
          <button 
            style={{ ...styles.secondaryBtn, width: "auto", padding: "12px 24px", display: "inline-block", fontSize: "14px" }} 
            onClick={() => { setActiveGoalId(goal.id); setScreen("create"); }}
          >
            {t.edit}
          </button>
        </div>
      </div>
    );
  };

  // --- 5. РОУТИНГ И МОДАЛЬНОЕ ОКНО ---
  return (
    <>
      <div style={{ backgroundColor: "#f9fafb", minHeight: "100vh", fontFamily: "sans-serif", display: "flex", flexDirection: "column" }}>
        {screen === "menu" && renderMenu()}
        {screen === "settings" && renderSettings()}
        {screen === "list" && renderList()}
        {screen === "create" && renderCreateForm()}
        {screen === "diagram" && renderDiagram()}
      </div>

      {/* МОДАЛЬНОЕ ОКНО */}
      <AnimatePresence>
        {showCongrats && (
          <motion.div 
            style={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              style={styles.modalContent}
              initial={{ scale: 0.8, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 50, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
            >
              <h2 style={{ marginTop: 0, color: "#4F46E5" }}>{t.congratsTitle}</h2>
              <p style={{ color: "#4B5563", marginBottom: "25px" }}>{t.congratsText}</p>
              
              <button 
                style={styles.primaryBtn} 
                onClick={() => {
                  setGoals(goals.filter(g => g.id !== activeGoalId));
                  setShowCongrats(false);
                  setScreen("menu");
                }}
              >
                {t.finishProgress}
              </button>
              
              <button 
                style={styles.secondaryBtn} 
                onClick={() => {
                  setShowCongrats(false);
                  setScreen("menu");
                }}
              >
                {t.toMenu}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// --- 6. ОТДЕЛЬНЫЙ КОМПОНЕНТ ДЛЯ ФОРМЫ ---
function GoalForm({ t, initialData, onSave, onCancel }) {
  const [mainGoal, setMainGoal] = useState(initialData.mainGoal);
  const [subgoals, setSubgoals] = useState(initialData.subgoals);

  const updateSubgoalLabel = (id, text) => {
    setSubgoals(subgoals.map(s => s.id === id ? { ...s, label: text } : s));
  };

  const addSubgoal = () => {
    const newId = Date.now();
    const newColor = COLORS[subgoals.length % COLORS.length];
    setSubgoals([...subgoals, { id: newId, label: "", color: newColor, completed: false }]);
  };

  const removeSubgoal = (id) => {
    if (subgoals.length <= 2) return;
    setSubgoals(subgoals.filter(s => s.id !== id));
  };

  const handleSubmit = () => {
    if (!mainGoal.trim()) return alert("Введите главную цель!");
    const validSubgoals = subgoals.filter(s => s.label.trim() !== "");
    if (validSubgoals.length < 2) return alert("Нужно минимум 2 заполненные подцели!");
    
    onSave({ mainGoal, subgoals: validSubgoals });
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={onCancel}>← {t.back}</button>
        <h2>Настройка</h2>
        <div style={{width: 60}}></div>
      </div>
      
      <div style={{ ...styles.content, overflowY: "auto", paddingBottom: "100px" }}>
        <label style={{ fontWeight: "bold", display: "block", marginBottom: "8px" }}>{t.mainGoalLabel}</label>
        <input 
          type="text" 
          value={mainGoal} 
          onChange={(e) => setMainGoal(e.target.value)}
          style={styles.input}
          placeholder="..."
        />

        <label style={{ fontWeight: "bold", display: "block", margin: "20px 0 8px 0" }}>{t.subGoalsLabel}</label>
        
        {subgoals.map((sub) => (
          <div key={sub.id} style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: sub.color, marginTop: "15px" }}></div>
            <input 
              type="text" 
              value={sub.label} 
              onChange={(e) => updateSubgoalLabel(sub.id, e.target.value)}
              style={styles.input}
              placeholder={t.subgoalPlaceholder}
            />
            <button 
              onClick={() => removeSubgoal(sub.id)}
              disabled={subgoals.length <= 2}
              style={{ ...styles.iconBtn, opacity: subgoals.length <= 2 ? 0.3 : 1 }}
            >❌</button>
          </div>
        ))}

        <button style={styles.secondaryBtn} onClick={addSubgoal}>{t.addSubgoal}</button>
        <button style={{ ...styles.primaryBtn, marginTop: "30px" }} onClick={handleSubmit}>{t.save}</button>
      </div>
    </div>
  );
}

// --- 7. СТИЛИ ---
const styles = {
  centerScreen: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "20px" },
  container: { flex: 1, display: "flex", flexDirection: "column", maxWidth: "500px", margin: "0 auto", width: "100%" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px 20px", backgroundColor: "white", borderBottom: "1px solid #e5e7eb" },
  content: { padding: "20px", flex: 1 },
  primaryBtn: { width: "100%", padding: "15px", backgroundColor: "#4F46E5", color: "white", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", marginBottom: "10px" },
  secondaryBtn: { width: "100%", padding: "15px", backgroundColor: "white", color: "#4F46E5", border: "2px solid #4F46E5", borderRadius: "10px", fontSize: "16px", fontWeight: "bold", cursor: "pointer" },
  backBtn: { background: "none", border: "none", color: "#4F46E5", fontSize: "14px", fontWeight: "bold", cursor: "pointer", padding: "5px" },
  card: { backgroundColor: "white", padding: "15px", borderRadius: "10px", marginTop: "15px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" },
  iconBtn: { background: "none", border: "none", fontSize: "18px", cursor: "pointer" },
  input: { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "16px", boxSizing: "border-box", flex: 1 },
  langBtn: { flex: 1, padding: "12px", border: "none", borderRadius: "8px", fontSize: "16px", fontWeight: "bold", cursor: "pointer", transition: "0.2s" },
  
  modalOverlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex", justifyContent: "center", alignItems: "center",
    zIndex: 1000, padding: "20px"
  },
  modalContent: {
    backgroundColor: "white", padding: "30px", borderRadius: "20px",
    textAlign: "center", maxWidth: "350px", width: "100%",
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
  }
};

export default App;