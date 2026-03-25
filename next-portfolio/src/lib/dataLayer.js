/**
 * dataLayer.js
 * ------------------------------------------------------------------
 * GTM / GA4 이벤트 트래킹 래퍼 모듈
 * window.dataLayer.push()를 직접 호출하는 대신 이 모듈을 사용하면
 * - 타입 안정성 확보
 * - 이벤트 명세 한 곳에서 관리
 * - GTM이 로드되지 않은 경우에도 안전하게 fallback 처리
 * ------------------------------------------------------------------
 */

/**
 * 내부 헬퍼: window.dataLayer 초기화 + 이벤트 push
 * @param {Object} payload - dataLayer에 push할 객체
 */
function push(payload) {
  // GTM이 아직 로드되지 않은 경우를 대비해 배열 초기화
  if (typeof window !== "undefined") {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    // 개발 환경에서만 콘솔 로그 출력 (디버깅용)
    if (process.env.NODE_ENV === "development") {
      console.log("[DataLayer]", payload);
    }
  }
}

/**
 * 챗봇 사이트 방문 이벤트
 * 사용 위치: page.js 마운트 시 (useEffect, 의존성 배열 [])
 * @param {string} company - URL ?c= 파라미터 값 (없으면 'guest')
 */
export function trackVisit(company) {
  push({
    event: "chat_site_visit",
    visitor_company: company,
  });
}

/**
 * 메시지 전송 이벤트
 * 사용 위치: handleSend 함수 내, FAQ 여부와 무관하게 전송마다 호출
 * @param {string} company     - 방문 회사명
 * @param {string} questionText - 사용자가 입력한 질문 원문
 * @param {boolean} isFaqHit   - FAQ 캐시 히트 여부 (API 미호출이면 true)
 */
export function trackMessage(company, questionText, isFaqHit = false) {
  push({
    event: "chat_message_sent",
    visitor_company: company,
    question_text: questionText,
    is_faq_hit: isFaqHit, // 추가 분석: FAQ vs API 비율 파악용
  });
}

/**
 * 대화 횟수 제한 도달 이벤트
 * 사용 위치: chatCount가 MAX_CHAT_COUNT(10)에 도달했을 때
 * @param {string} company - 방문 회사명
 */
export function trackLimitReached(company) {
  push({
    event: "chat_limit_reached",
    visitor_company: company,
  });
}
