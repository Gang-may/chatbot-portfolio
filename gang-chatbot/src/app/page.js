"use client";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useChat } from "@ai-sdk/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { checkFAQ } from "@/lib/faqCache";
import { trackVisit, trackMessage, trackLimitReached } from "@/lib/dataLayer";
import dynamic from "next/dynamic";
// SkillChart: SSR 비활성화 (Chart.js는 window 객체에 의존)
const SkillChart = dynamic(() => import("@/components/SkillChart"), { ssr: false });

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────
const MAX_CHAT_COUNT = 10;
// ── 관리자 시크릿: 환경변수로 분리하여 하드코딩 노출 방지 ──────────────
// .env.local: NEXT_PUBLIC_ADMIN_SECRET=hkm712
// Vercel 대시보드: Settings > Environment Variables 에 동일하게 추가
const ADMIN_SECRET = process.env.NEXT_PUBLIC_ADMIN_SECRET || "";
const STICKER_DURATION = 10;
const TYPEWRITER_SPEED = 15; // ms/글자
const PORTFOLIO_URL = "https://gang-may.github.io/my-portfolio/";

const FALLBACK_MESSAGE =
  "현재 API 응답이 원활하지 않습니다. 새로고침 후 재시도 부탁드립니다. 만약 재시도 후 응답이 없을 시 포트폴리오 사이트에서 정보를 확인해 주세요.\n포트폴리오 사이트: https://gang-may.github.io/my-portfolio/";

// 10회 소진 후 채팅 답변으로 출력되는 안내 메시지 (배너 대신)
const LIMIT_MESSAGE = `🎯 **저와의 대화가 마무리되었습니다!**

자세한 이야기는 **면접 때 직접 만나서** 나누고 싶습니다 😊

📎 상세 포트폴리오 확인: [gang-may.github.io/my-portfolio](${PORTFOLIO_URL})

📞 연락처: 010-5540-8025
📧 이메일: kyoungmin712@naver.com

감사합니다! 연락 기다리겠습니다 🙏`;

const WELCOME_TEXT = `안녕하세요! 저는 비즈니스의 확실한 근거를 탐구하는 **데이터 분석가 황경민**의 AI 어시스턴트입니다 👋\n\n무엇이든 물어보시면 제가 답변해 드릴게요! 아래 칩을 눌러보거나 자유롭게 질문해보세요.`;

const WELCOME_MSG = {
  id: "welcome",
  role: "assistant",
  text: WELCOME_TEXT,
  done: true,
};

const SUGGESTIONS = [
  { text: "프로필", icon: "far fa-smile", color: "#0d9488" },
  { text: "프로젝트", icon: "fas fa-briefcase", color: "#16a34a" },
  { text: "인적성 결과", icon: "fas fa-clipboard-check", color: "#8b5cf6" },
  { text: "학력·경력", icon: "fas fa-graduation-cap", color: "#d946ef" },
  { text: "연락처", icon: "far fa-address-card", color: "#d97706" },
];

const historyKey = (c) => `chat_history_${c}`;

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function Home() {
  // ── 1. Refs (최상단) ──────────────────────────────────────────
  const latestStreamTextRef = useRef("");
  const pendingLimitRef = useRef(false);
  const chatEndRef = useRef(null);
  const canvasRef = useRef(null);
  const typewriterRef = useRef(null);

  // ── 2. 상태 (State) ───────────────────────────────────────────
  const [chatHistory, setChatHistory] = useState([WELCOME_MSG]);
  const [typingId, setTypingId] = useState(null);
  const [displayedText, setDisplayedText] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [theme, setTheme] = useState("dark");
  const [isChatMode, setIsChatMode] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [company, setCompany] = useState("guest");
  const [chatCount, setChatCount] = useState(0);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [showSticker, setShowSticker] = useState(false);
  const [stickerCountdown, setStickerCountdown] = useState(STICKER_DURATION);
  const [isStickerShown, setIsStickerShown] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);

  // ── 3. 헬퍼 함수 (전송/기록) ───────────────────────────────────
  // useChat보다 먼저 정의되어야 함 (onFinish 등에서 참조)
  const addToChatHistory = useCallback((msg) => {
    const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setChatHistory((prev) => [
      ...prev,
      { 
        id, 
        role: msg.role, 
        text: msg.text, 
        done: !msg.typewrite, 
        options: msg.options || null,
        chartData: msg.chartData || null 
      },
    ]);
    if (msg.typewrite && msg.role === "assistant") {
      setTypingId(id);
      setDisplayedText("");
    }
  }, []);

  // ── 4. useChat (API 통신) ──────────────────────────────────────
  const chatConfig = useChat({
    api: "/api/chat",
    onFinish: (message) => {
      let text =
        message.parts
          ?.filter((p) => p.type === "text")
          .map((p) => p.text)
          .join("") ||
        message.content ||
        "";

      if (!text || text.trim() === "") {
        text = latestStreamTextRef.current;
      }
      addToChatHistory({ role: "assistant", text, typewrite: true });
      setIsLocked(false);
      latestStreamTextRef.current = "";

      if (pendingLimitRef.current) {
        pendingLimitRef.current = false;
        setTimeout(() => {
          addToChatHistory({
            role: "assistant",
            text: LIMIT_MESSAGE,
            typewrite: true,
          });
          setIsLimitReached(true);
        }, 600);
      }
    },
    onError: (err) => {
      console.error("useChat onError:", err);
      const isRateLimit =
        err?.message?.includes("429") ||
        err?.message?.includes("RATE_LIMIT") ||
        err?.message?.toLowerCase().includes("quota");

      const errMsg = isRateLimit
        ? `⏳ **API 요청 한도에 도달했어요!**\n\n무료 티어 사용 중으로 분당 요청 한도가 제한되어 있습니다.\n잠시 후 다시 질문해 주시거나, 아래 연락처로 직접 연락 주세요 😊\n\n📞 010-5540-8025 | 📧 kyoungmin712@naver.com`
        : `현재 API 응답이 원활하지 않습니다. 새로고침 후 재시도 부탁드립니다. 만약 재시도 후 응답이 없을 시 포트폴리오 사이트에서 정보를 확인해 주세요.\n포트폴리오 사이트: ${PORTFOLIO_URL}`;

      addToChatHistory({ role: "assistant", text: errMsg, typewrite: true });
      setIsLocked(false);
      if (pendingLimitRef.current) {
        pendingLimitRef.current = false;
        setTimeout(() => {
          addToChatHistory({
            role: "assistant",
            text: LIMIT_MESSAGE,
            typewrite: true,
          });
          setIsLimitReached(true);
        }, 600);
      }
    },
  });

  const { messages: apiMessages, status, sendMessage } = chatConfig;
  
  // 디버깅을 위해 로컬 콘솔에 메서드 덤프
  console.log("useChat returns keys:", Object.keys(chatConfig));

  const isLoading = status === "streaming" || status === "submitted";

  // ── 5. Memo/Callback ─────────────────────────────────────────
  const streamingText = useMemo(() => {
    if (!isLoading) return "";
    const last = apiMessages[apiMessages.length - 1];
    if (!last || last.role !== "assistant") return "";
    return (
      last.parts
        ?.filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("") ||
      last.content ||
      ""
    );
  }, [apiMessages, isLoading]);

  // ─────────────────────────────────────────────
  // 초기화: 회사 식별, localStorage 복원, 방문 이벤트
  // ─────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("c") || "guest";
    const admin = params.get("admin") || "";
    setCompany(c);

    // ── 관리자 모드 판별 ──────────────────────────────────────
    // ?admin=hkm712 로 접속하면 카운트 제한 없이 무제한 사용 가능
    // 카운트·대화 내역을 저장하지 않아 방문자 데이터에 영향을 주지 않음
    if (ADMIN_SECRET && admin === ADMIN_SECRET) {
      setIsAdminMode(true);
      setIsStickerShown(true); // 스티커 표시 생략
      trackVisit(`${c}_admin`);

      // 테마 복원만 하고 나머지 초기화는 건너뜀
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme) {
        setTheme(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);
      }
      return; // 이하 로직(횟수·내역 복원) 건너뜀
    }

    // ── 일반(배포) 모드 ──────────────────────────────────────
    // 대화 횟수 복원
    const storedCount = parseInt(
      localStorage.getItem(`chat_count_${c}`) || "0",
      10,
    );
    setChatCount(storedCount);
    if (storedCount >= MAX_CHAT_COUNT) setIsLimitReached(true);

    // 대화 내역 복원 (새로고침해도 유지)
    try {
      const saved = localStorage.getItem(historyKey(c));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatHistory([
            WELCOME_MSG,
            ...parsed.map((m) => ({ ...m, done: true })),
          ]);
          setIsChatMode(true);
          setIsStickerShown(true);
        }
      }
    } catch {
      /* 파싱 실패 시 무시 */
    }

    // GTM 방문 이벤트
    trackVisit(c);

    // 테마 복원
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  // ─────────────────────────────────────────────
  // 대화 내역 localStorage 자동 저장
  // ─────────────────────────────────────────────
  useEffect(() => {
    // 관리자 모드: 저장하지 않음 (방문자 기록에 영향 없이 테스트 가능)
    if (!company || chatHistory.length <= 1 || isAdminMode) return;
    const toSave = chatHistory.filter(
      (m) => m.id !== "welcome" && m.done !== false,
    );
    try {
      localStorage.setItem(historyKey(company), JSON.stringify(toSave));
    } catch {
      /* 스토리지 용량 초과 등 무시 */
    }
  }, [chatHistory, company, isAdminMode]);

  // ─────────────────────────────────────────────
  // 타이프라이터 효과 (FAQ 답변, 에러, 한도 안내에 적용)
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!typingId) return;
    const target = chatHistory.find((m) => m.id === typingId);
    if (!target) return;

    const fullText = target.text;
    let idx = 0;

    if (typewriterRef.current) clearInterval(typewriterRef.current);

    typewriterRef.current = setInterval(() => {
      idx++;
      setDisplayedText(fullText.slice(0, idx));
      if (idx >= fullText.length) {
        clearInterval(typewriterRef.current);
        // 타이핑 완료: done 플래그 설정
        setChatHistory((prev) =>
          prev.map((m) => (m.id === typingId ? { ...m, done: true } : m)),
        );
        setTypingId(null);
        setDisplayedText("");
      }
    }, TYPEWRITER_SPEED);

    return () => clearInterval(typewriterRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typingId]);

  // ─────────────────────────────────────────────
  // 스티커 안내 카운트다운
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!showSticker) return;
    if (stickerCountdown <= 0) {
      setShowSticker(false);
      return;
    }
    const t = setInterval(() => setStickerCountdown((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [showSticker, stickerCountdown]);

  // ─────────────────────────────────────────────
  // 자동 스크롤
  // ─────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isLoading, displayedText]);

  // ─────────────────────────────────────────────
  // 마우스 Glow
  // ─────────────────────────────────────────────
  useEffect(() => {
    const fn = (e) => {
      document.documentElement.style.setProperty("--mouse-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--mouse-y", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", fn);
    return () => window.removeEventListener("mousemove", fn);
  }, []);

  // ─────────────────────────────────────────────
  // Matrix Rain 캔버스 (수정: 낮은 opacity, 느린 속도)
  // ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const isDark = theme === "dark";

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // 열 간격 넓혀서 밀도 낮춤 (fontSize 올림)
    const fontSize = 16;
    let columns = Math.floor(width / fontSize);
    // 전체 열 중 60%만 활성화 (더 듬성듬성)
    let drops = Array.from({ length: columns }, (_, i) =>
      i % 2 === 0 ? Math.random() * -150 : -9999,
    );

    const chars = "0123456789ABCDEF∑∫≈≠←→↑↓";

    let animId;
    const draw = () => {
      // 잔상 강도: 높을수록 글자가 빨리 사라짐 (더 옅어 보임)
      ctx.fillStyle = isDark
        ? "rgba(2, 6, 23, 0.12)"
        : "rgba(240,244,248,0.15)";
      ctx.fillRect(0, 0, width, height);

      drops.forEach((y, i) => {
        if (y < -100) return; // 비활성 열 건너뜀
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;

        // 밝은 선두 글자(5%), 나머지는 매우 옅게
        ctx.fillStyle =
          Math.random() > 0.95
            ? isDark
              ? "rgba(0, 255, 150, 0.7)"
              : "rgba(0, 120, 90, 0.5)"
            : isDark
              ? "rgba(0, 210, 100, 0.18)"
              : "rgba(0, 100, 70, 0.10)";
        ctx.font = `${fontSize}px monospace`;
        ctx.fillText(char, x, y * fontSize);

        if (y * fontSize > height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.3; // 느린 속도
      });

      animId = requestAnimationFrame(draw);
    };
    draw();

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      columns = Math.floor(width / fontSize);
      drops = Array.from({ length: columns }, (_, i) =>
        i % 2 === 0 ? Math.random() * -150 : -9999,
      );
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, [theme]);

  // ─────────────────────────────────────────────
  // 스트리밍 중인 텍스트를 실시간으로 백업
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (streamingText) {
      latestStreamTextRef.current = streamingText;
    }
  }, [streamingText]);

  // ─────────────────────────────────────────────
  // 테마 전환
  // ─────────────────────────────────────────────
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // ─────────────────────────────────────────────
  // 핵심: handleSend — 전송 인터셉터
  // ─────────────────────────────────────────────
  const handleSend = useCallback(
    (text) => {
      if (!text?.trim() || isLocked || isLoading) return;
      // 관리자 모드: 한도 제한 없이 통과
      if (!isAdminMode && isLimitReached) return;
      if (!isChatMode) setIsChatMode(true);

      // 스티커: 첫 메시지에만 1회 (관리자 모드에서는 생략)
      if (!isStickerShown && !isAdminMode) {
        setShowSticker(true);
        setStickerCountdown(STICKER_DURATION);
        setIsStickerShown(true);
      }

      setIsLocked(true);

      // 유저 메시지 즉시 표시
      addToChatHistory({ role: "user", text, typewrite: false });

      // 관리자 모드: 카운트 증가/저장/한도 체크 없이 바로 진행
      const newCount = isAdminMode ? chatCount : chatCount + 1;
      if (!isAdminMode) {
        setChatCount(newCount);
        localStorage.setItem(`chat_count_${company}`, String(newCount));
      }

      const isLast = !isAdminMode && newCount >= MAX_CHAT_COUNT;

      // GTM 이벤트
      const faqResult = checkFAQ(text);
      trackMessage(company, text, faqResult.matched);
      if (isLast) trackLimitReached(company);

      if (faqResult.matched) {
        // [A] FAQ 캐시 히트: API 호출 없이 즉시 답변
        setTimeout(() => {
          if (faqResult.type === "chart" && faqResult.chartData) {
            // ── 차트 응답: 말풍선에 Chart 컴포넌트를 직접 렌더링 ──
            const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            setChatHistory((prev) => [
              ...prev,
              {
                id,
                role: "assistant",
                text: faqResult.answer,   // 폴백 텍스트 (SR 등)
                chartData: faqResult.chartData, // 차트 데이터
                options: faqResult.options || null,
                done: true,
              },
            ]);
          } else {
            if (faqResult.chartData) {
            // ── 차트 응답: 말풍선에 Chart 컴포넌트를 직접 렌더링 ──
            const id = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            setChatHistory((prev) => [
              ...prev,
              {
                id,
                role: "assistant",
                text: faqResult.answer,
                chartData: faqResult.chartData,
                options: faqResult.options || null,
                done: true,
              },
            ]);
          } else {
            // ── 텍스트 응답: 기존 타이프라이터 로직 ──
            addToChatHistory({
              role: "assistant",
              text: faqResult.answer,
              typewrite: true,
              options: faqResult.options || null,
            });
          }
          }
          setIsLocked(false);

          if (isLast) {
            const delay = Math.min(
              (faqResult.answer?.length ?? 0) * TYPEWRITER_SPEED + 800,
              6000,
            );
            setTimeout(() => {
              addToChatHistory({
                role: "assistant",
                text: LIMIT_MESSAGE,
                typewrite: true,
              });
              setIsLimitReached(true);
            }, delay);
          }
        }, 80);
      } else {
        // [B] Gemini API 호출 (스트리밍)
        // isLast이면 onFinish에서 한도 안내 처리
        if (isLast) pendingLimitRef.current = true;
        try {
          sendMessage({ role: "user", content: text }); // 👈 수정: append 대신 sendMessage 사용 (ai@6.x 표준)
        } catch (err) {
          addToChatHistory({
            role: "assistant",
            text: `현재 API 응답이 원활하지 않습니다. 새로고침 후 재시도 부탁드립니다. 만약 재시도 후 응답이 없을 시 포트폴리오 사이트에서 정보를 확인해 주세요.\n포트폴리오 사이트: ${PORTFOLIO_URL}`,
            typewrite: true,
          });
          setIsLocked(false);
        }
      }
    },
    [
      isLocked,
      isLoading,
      isLimitReached,
      isAdminMode,
      chatCount,
      isChatMode,
      isStickerShown,
      company,
      addToChatHistory,
      sendMessage,
    ],
  );

  const onSubmitForm = (e) => {
    e.preventDefault();
    const msg = inputValue.trim();
    if (!msg) return;
    handleSend(msg);
    setInputValue("");
  };

  const isInputDisabled = isLocked || isLoading || isLimitReached;

  // ─────────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────────
  return (
    <>
      <div id="mouse-glow"></div>

      {/* Matrix Rain 배경 (opacity 조절은 CSS 변수로) */}
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: -1,
          pointerEvents: "none",
          // 다크: 은은하게, 라이트: 거의 보이지 않게
          opacity: theme === "dark" ? 0.6 : 0.4,
        }}
      />

      {/* ── 스티커 안내 모달 (첫 메시지, 10초 후 자동 사라짐) ── */}
      {showSticker && (
        <div className="sticker-overlay">
          <div className="sticker-card">
            <div className="sticker-icon">📌</div>
            <p className="sticker-text">
              <strong>잠깐!</strong> 총 <strong>10번</strong>의 메시지를 통해
              대화하실 수 있습니다.
              <br />
              저의 포트폴리오와 관련된 질문에 가장 잘 답변드릴 수 있으니,
              <br />
              유의하여 질문 부탁드립니다 🙏
            </p>
            <button
              className="sticker-btn"
              onClick={() => setShowSticker(false)}
            >
              확인했습니다 ({stickerCountdown}초)
            </button>
          </div>
        </div>
      )}

      <div className="app-container">
        {/* 상단 네비 */}
        <div className="top-nav">
          <div className="logo">
            K.M.
            {/* 관리자 모드 배지 */}
            {isAdminMode && <span className="admin-badge">🔧 ADMIN</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* ── 상세 포트폴리오 링크: 회사명 파라미터 유지 (크로스 도메인 여정) ── */}
            <a
              href={`https://gang-may.github.io/my-portfolio/?c=${company}`}
              target="_blank"
              rel="noopener noreferrer"
              className="portfolio-link-btn"
              title="메인 포트폴리오로 이동"
            >
              <i className="fas fa-external-link-alt" style={{ marginRight: "5px" }}></i>
              상세 포트폴리오
            </a>

            {/* 관리자 전용: 방문자 데이터 초기화 버튼 */}
            {isAdminMode && (
              <>
                {/* 🔄 현재 세션만 초기화 (대화 10회 테스트용) */}
                <button
                  className="icon-btn"
                  title={`현재 세션(${company}) 초기화 - 대화 다시 테스트`}
                  onClick={() => {
                    localStorage.removeItem(`chat_count_${company}`);
                    localStorage.removeItem(historyKey(company));
                    setChatCount(0);
                    setIsLimitReached(false);
                    setChatHistory([WELCOME_MSG]);
                    setIsChatMode(false);
                    setIsStickerShown(false);
                    setIsLocked(false);
                    showToast(
                      `🔄 [${company}] 세션 초기화 완료! 다시 테스트하세요.`,
                    );
                  }}
                >
                  <i
                    className="fas fa-rotate-right"
                    style={{ color: "#34d399" }}
                  ></i>
                </button>
                {/* 🗑️ 모든 방문자 데이터 초기화 */}
                <button
                  className="icon-btn"
                  title="모든 방문자 대화 횟수 초기화"
                  onClick={() => {
                    const keys = Object.keys(localStorage).filter(
                      (k) =>
                        k.startsWith("chat_count_") ||
                        k.startsWith("chat_history_"),
                    );
                    keys.forEach((k) => localStorage.removeItem(k));
                    showToast(`✅ 전체 ${keys.length}개 항목 초기화 완료`);
                  }}
                >
                  <i
                    className="fas fa-trash-alt"
                    style={{ color: "#f87171" }}
                  ></i>
                </button>
              </>
            )}
            <button onClick={toggleTheme} className="icon-btn">
              <i className={`fas fa-${theme === "dark" ? "sun" : "moon"}`}></i>
            </button>
          </div>
        </div>

        <main className="main-display" style={{ pointerEvents: "none" }}>
          {/* 그리팅 */}
          <div className={`greeting-layer ${isChatMode ? "hidden" : ""}`}>
            <h3 className="greeting-sub">
              안녕하세요, 황경민입니다. <div className="wave">👋</div>
            </h3>
            <h1 className="greeting-main">Data Analyst</h1>
            <div className="avatar-container" style={{ pointerEvents: "auto" }}>
              <img
                src="/assets/my_photo.jpg"
                alt="황경민"
                className="hero-avatar"
              />
            </div>
          </div>

          {/* 채팅 영역 */}
          <div
            className={`chat-container ${isChatMode ? "active" : ""}`}
            style={{ pointerEvents: "auto" }}
          >
            {/* 단일 소스: chatHistory 렌더링 */}
            {chatHistory.map((m) => {
              const isTyping = m.id === typingId;
              const text = isTyping ? displayedText : m.text;
              return (
                <div
                  key={m.id}
                  className={`message-row ${m.role === "user" ? "user" : "bot"}`}
                >
                  <div className="bubble markdown-body">
                    {/* 차트 데이터가 있으면 SkillChart 렌더링, 없으면 텍스트 */}
                    {m.chartData && m.done ? (
                      <>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {text}
                        </ReactMarkdown>
                        <SkillChart chartData={m.chartData} />
                      </>
                    ) : (
                      <>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {text}
                        </ReactMarkdown>
                        {isTyping && <span className="typewriter-cursor">▋</span>}
                      </>
                    )}

                    {/* 인터랙티브 다중 뎁스(Multi-depth) 옵션 카드 렌더링 (타이핑 종료 후 등장) */}
                    {m.options && m.options.length > 0 && m.done && (
                      <div className="chat-options-container">
                        {m.options.map((opt, idx) => (
                          <button 
                            key={idx} 
                            className="chat-option-card" 
                            onClick={() => handleSend(opt.value)}
                          >
                            <span className="opt-title">{opt.title}</span>
                            {opt.desc && <span className="opt-desc">{opt.desc}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* API 스트리밍 중 임시 버블 (완료되면 chatHistory로 이동, 이 버블 사라짐) */}
            {isLoading && streamingText && (
              <div className="message-row bot">
                <div className="bubble markdown-body">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {streamingText}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* 로딩 타이핑 인디케이터 (스트리밍 텍스트 없을 때) */}
            {isLoading && !streamingText && (
              <div className="message-row bot">
                <div className="bubble" style={{ padding: "14px 22px" }}>
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </main>

        {/* 하단 입력 Dock */}
        <footer className="input-dock">
          <form className="input-bar" onSubmit={onSubmitForm}>
            <input
              name="prompt"
              type="text"
              id="chat-input"
              placeholder={
                isLimitReached
                  ? "대화가 종료되었습니다."
                  : "무엇이 궁금하신가요?"
              }
              autoComplete="off"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isInputDisabled}
            />
            <button
              type="submit"
              className="send-btn"
              disabled={!inputValue?.trim() || isInputDisabled}
            >
              <i className="fas fa-arrow-right"></i>
            </button>
          </form>

          {/* 남은 횟수 배지 */}
          {!isLimitReached && (
            <p className="chat-count-badge">
              💬 남은 대화: <strong>{MAX_CHAT_COUNT - chatCount}회</strong>
            </p>
          )}

          {/* 추천 칩 */}
          <div className="suggestions-wrapper">
            <div className="suggestions">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  className="suggestion-card"
                  onClick={() => handleSend(s.text)}
                  disabled={isInputDisabled}
                >
                  <i
                    className={`${s.icon} doc-icon`}
                    style={{ color: s.color }}
                  ></i>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        </footer>
      </div>

      <div className={`toast ${toastMessage ? "show" : ""}`}>
        <i className="fas fa-check-circle"></i> {toastMessage}
      </div>
    </>
  );
}
