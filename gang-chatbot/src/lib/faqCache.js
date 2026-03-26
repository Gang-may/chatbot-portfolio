/**
 * faqCache.js
 * ------------------------------------------------------------------
 * FAQ 인터셉터 캐시 모듈
 * 사용자 입력에 특정 키워드가 포함되어 있으면 Gemini API를 호출하지 않고
 * 미리 준비한 답변을 즉시 반환하여 API 크레딧 소모를 줄입니다.
 *
 * [고도화 v2] 정규식 + 최장 키워드 우선 매칭
 * - 단순 includes() 대신 정규표현식 \b(단어 경계)로 정밀 매칭
 * - 동일 질문에 여러 키워드가 매칭될 때, 가장 긴(구체적인) 키워드를
 *   가진 엔트리에 우선순위 부여 → '장점' vs '장단점' 충돌 해소
 * 
 * [고도화 v3] 인터랙티브 다중 뎁스(Multi-depth) 옵션 카드 지원
 * - options 배열 존재 시 클라이언트(page.js) 말풍선 하단에 클릭형 카드 렌더링
 * ------------------------------------------------------------------
 */

/**
 * FAQ_MAP
 * type 필드:
 *   "text"  - 기본 마크다운 텍스트 응답
 *   "chart" - page.js에서 Chart 컴포넌트로 렌더링
 *             chartData 필드에 Chart.js용 데이터 정의
 * options 필드 (optional):
 *   Array<{ title: string, desc?: string, value: string }>
 *   클릭 가능한 인터랙티브 카드로 렌더링됨
 */
const FAQ_MAP = [
  // ─── 0. 지원동기 / 강점 / 약점 (기존 유지) ──────────────────────────
  {
    keywords: ["연봉", "급여", "연봉협상", "희망연봉", "연봉은", "페이", "월급"],
    type: "text",
    answer: `💰 **희망 연봉에 대해서**\n\n저는 연봉보다 **성장 가능성과 팀 문화**를 우선시합니다!\n\n구체적인 수치는 직무 범위와 복지 조건을 파악한 뒤 협의하고 싶습니다. 합리적인 수준에서 유연하게 조율할 수 있습니다 😊\n\n자세한 이야기는 면접 자리에서 나눠보면 좋겠습니다!`,
  },
  {
    keywords: ["야근", "야간", "워라밸", "초과근무", "오버타임", "근무시간", "근무 시간"],
    type: "text",
    answer: `⚖️ **워라밸에 대해서**\n\n저는 **효율적인 업무 진행**을 통해 정해진 시간 내에 성과를 내는 것을 지향합니다.\n\n물론 중요한 마감이나 프로젝트 일정에 따라 유연하게 대응할 수 있습니다. 다만 야근이 일상이 되는 구조보다는, 합리적인 업무 분배가 팀 전체의 지속 가능성을 높인다고 생각합니다 💪`,
  },
  {
    keywords: ["연락처", "전화", "연락", "전화번호", "연락방법", "이메일", "email", "contact"],
    type: "text",
    answer: `📞 **연락처 정보**\n\n- 📱 전화: **010-5540-8025**\n- 📧 이메일: **kyoungmin712@naver.com**\n- 🌐 포트폴리오: [gang-may.github.io/my-portfolio](https://gang-may.github.io/my-portfolio/)\n\n편하신 방법으로 연락 주시면 신속하게 응대하겠습니다!`,
  },
  {
    keywords: ["장단점"],
    type: "text",
    answer: `✨ **저의 핵심 강점 3가지**\n\n1. **📊 데이터 기반 문제해결력**\n   비즈니스의 불확실성을 데이터로 해소하는 과정을 즐깁니다. 단순 분석에 그치지 않고 비즈니스 인사이트까지 연결합니다.\n\n2. **🎯 주도적 실행력 (ESTJ)**\n   계획을 수립하고 끝까지 완수하는 성향입니다. 5개 이상의 프로젝트를 리드하며 입증했습니다.\n\n3. **🔗 도메인 융합 역량**\n   데이터 분석 + 마케팅 + 군수·방위 등 다양한 도메인 경험으로 폭넓은 문제에 대응합니다.\n\n---\n\n🤔 **저의 단점과 개선 노력**\n\n저는 **완벽주의 성향**이 있어 때로는 속도보다 정확성에 집착하는 경향이 있습니다.\n\n이를 보완하기 위해 **'80% 완성 후 피드백'** 원칙을 실천하며, 완벽한 결과보다 빠른 검증과 반복 개선이 더 효과적임을 배워가고 있습니다 📈`,
  },
  {
    keywords: ["장점", "강점", "잘하는것", "잘하는 것", "특기", "어필", "셀링포인트"],
    type: "text",
    answer: `✨ **저의 핵심 강점 3가지**\n\n1. **📊 데이터 기반 문제해결력**\n   비즈니스의 불확실성을 데이터로 해소하는 과정을 즐깁니다. 단순 분석에 그치지 않고 비즈니스 인사이트까지 연결합니다.\n\n2. **🎯 주도적 실행력 (ESTJ)**\n   계획을 수립하고 끝까지 완수하는 성향입니다. 5개 이상의 프로젝트를 리드하며 입증했습니다.\n\n3. **🔗 도메인 융합 역량**\n   데이터 분석 + 마케팅 + 군수·방위 등 다양한 도메인 경험으로 폭넓은 문제에 대응합니다.`,
  },
  {
    keywords: ["단점", "약점", "부족한점", "부족한 점", "개선점", "아쉬운점"],
    type: "text",
    answer: `🤔 **저의 단점과 개선 노력**\n\n저는 **완벽주의 성향**이 있어 때로는 속도보다 정확성에 집착하는 경향이 있습니다.\n\n이를 보완하기 위해 **'80% 완성 후 피드백'** 원칙을 실천하며, 완벽한 결과보다 빠른 검증과 반복 개선이 더 효과적임을 배워가고 있습니다 📈`,
  },
  {
    keywords: ["학력", "학교", "졸업", "대학", "전공", "학점", "gpa"],
    type: "text",
    answer: `🎓 **학력 사항**\n\n- **강서대학교** G2빅데이터경영학과 졸업 (2020.03 ~ 2026.02)\n  - 학점: **3.99 / 4.5** 🏆\n  - 마케팅 & 회계, 빅데이터 트랙 이수\n\n- **한국표준협회** 스마트 국방 데이터 분석과정 수료 (2024.07 ~ 2025.01)\n  - Python, SQL, 머신러닝, 딥러닝 등 실무 중심 교육`,
  },
  {
    keywords: ["자격증", "certification"],
    type: "text",
    answer: `📜 **보유 자격증**\n\n| 자격증 | 발급기관 | 취득연도 |\n|---|---|---|\n| 데이터분석준전문가 (ADsP) | 한국데이터산업진흥원 | 2025 |\n| Google Analytics Certification | Google | 2026 |\n| 유통관리사 3급 | 대한상공회의소 | 2023 |\n| 자동차운전면허 1종보통 | 경찰청 | 2020 |`,
  },
  {
    keywords: ["수상", "최우수상"],
    type: "text",
    answer: `🏆 **수상 이력**\n\n- **스마트 국방 데이터 분석과정 최우수상**\n  - 주관: 한화에어로스페이스 × 한국표준협회\n  - 수상일: 2025년 1월\n  - TERRA 프로젝트(AI & GIS 전술 지원 시스템)로 수상했습니다!`,
  },
  {
    keywords: ["지원동기", "지원 동기"],
    type: "text",
    answer: `💡 **지원 동기에 대해서**\n\n저는 **"데이터가 비즈니스의 불확실성을 해소하는 가장 확실한 근거"** 라고 믿습니다.\n\n단순한 분석 결과 도출이 아닌, 실제 의사결정에 영향을 미치는 분석가가 되고 싶습니다.\n귀사의 데이터 환경에서 제 역량을 발휘하고 싶어 지원했습니다 🎯`,
  },
  {
    keywords: ["입사후", "입사 후", "목표", "비전", "계획", "하고싶은것", "하고 싶은 것"],
    type: "text",
    answer: `🚀 **입사 후 목표**\n\n**단기 (1년)**: 팀의 데이터 파이프라인과 분석 환경을 빠르게 파악하고, 즉시 기여할 수 있는 분석 과제를 선제적으로 발굴합니다.\n\n**중기 (3년)**: 비즈니스 도메인 전문성과 데이터 역량을 결합해, 경영진이 믿고 의지하는 **데이터 기반 의사결정 파트너**로 성장합니다.\n\n**장기**: AI 기반 분석 자동화 시스템을 구축해 팀 전체의 생산성을 높이는 데 기여하고 싶습니다 💪`,
  },

  // ─── 1. 스킬 차트 ──────────────────────────────────────────
  {
    keywords: ["스킬", "기술스택", "기술 스택", "역량", "기술역량", "언어", "툴", "tool", "python", "sql", "tableau"],
    type: "chart",
    chartData: {
      chartType: "radar",
      title: "🛠️ 기술 역량 차트",
      labels: ["Python/R", "SQL", "머신러닝/딥러닝", "데이터 시각화", "마케팅 분석"],
      datasets: [
        {
          label: "황경민의 역량 지수",
          data: [90, 85, 80, 88, 75],
          backgroundColor: "rgba(13, 148, 136, 0.2)",
          borderColor: "rgba(13, 148, 136, 1)",
          pointBackgroundColor: "rgba(13, 148, 136, 1)",
          borderWidth: 2,
        },
      ],
    },
    answer: `🛠️ **기술 스택**\n\n**언어 & 분석**\n\`Python\` \`R\` \`SQL (Oracle, MySQL)\`\n\n**라이브러리**\n\`Pandas\` \`Numpy\` \`BeautifulSoup\` \`Scikit-learn\`\n\n**AI / ML**\n\`머신러닝 (분류·회귀·클러스터링)\` \`딥러닝 (YOLOv11s)\` \`LDA 토픽 모델링\` \`SARIMAX 시계열\`\n\n**시각화**\n\`Tableau\` \`Matplotlib\` \`대화형 대시보드\``,
  },

  // ─── 2. 프로젝트 (Multi-depth Funnel) ──────────────────────
  {
    keywords: ["프로젝트", "포트폴리오", "작업물", "깃허브", "github"],
    type: "text",
    answer: `제 프로젝트는 크게 2가지 도메인으로 나뉩니다. 어떤 분야가 궁금하신가요?`,
    options: [
      { title: "📊 데이터 분석", desc: "머신러닝, 자연어처리 등", value: "데이터 분석 프로젝트" },
      { title: "📈 마케팅", desc: "시크릿 데이터, 브랜딩", value: "마케팅 프로젝트" }
    ]
  },
  {
    keywords: ["데이터 분석 프로젝트", "데이터분석", "분석 프로젝트"],
    type: "text",
    answer: `데이터 분석 관련 주요 프로젝트 5가지입니다. 궁금한 프로젝트를 선택해 주세요!`,
    options: [
      { title: "휴머노이드 뉴스 분석", value: "휴머노이드 뉴스 분석 프로젝트 안내" },
      { title: "MSA 군수품 대시보드", value: "MSA 군수품 대시보드 프로젝트 안내" },
      { title: "서울시 노인 복지", value: "서울시 노인 복지 데이터 분석 안내" },
      { title: "골든제주 시니어 여행", value: "골든제주 시니어 여행 분석 안내" },
      { title: "TERRA 전술 시스템", desc: "🏆 최우수상 수상", value: "TERRA 전술 시스템 안내" },
    ]
  },
  {
    keywords: ["마케팅 프로젝트", "마케팅"],
    type: "text",
    answer: `마케팅 도메인 관련 주요 프로젝트 4가지입니다. 알아보고 싶은 프로젝트를 선택해 주세요!`,
    options: [
      { title: "BAE JUICE 마케팅사례 분석", value: "BAE JUICE 프로젝트 안내" },
      { title: "Next-Gen Retail(무인점포확대전략)", value: "Next-Gen Retail 프로젝트 안내" },
      { title: "부영 리브랜딩", value: "부영 리브랜딩 기획 안내" },
      { title: "Notion 광고제작", value: "Notion 광고 캠페인 안내" },
    ]
  },
  // 상세 프로젝트 응답 (공통 폴백 대신 간단한 안내)
  {
    keywords: [
      "휴머노이드 뉴스 분석 프로젝트 안내", "MSA 군수품 대시보드 프로젝트 안내", 
      "서울시 노인 복지 데이터 분석 안내", "골든제주 시니어 여행 분석 안내", "TERRA 전술 시스템 안내",
      "BAE JUICE 프로젝트 안내", "Next-Gen Retail 프로젝트 안내", "부영 리브랜딩 기획 안내", "Notion 광고 캠페인 안내"
    ],
    type: "text",
    answer: `자세한 기획 배경, 분석 과정 및 도출된 인사이트(해결책)는 상단의 **[상세 포트폴리오]** 버튼을 통해 전체 문서를 확인하실 수 있습니다!\n\n포트폴리오 페이지에서 해당 프로젝트 카드를 클릭해 보세요 🚀`
  },

  // ─── 3. 인적성 검사 결과 (Multi-depth Funnel) ──────────────────────
  {
    keywords: ["인적성결과", "인적성 결과", "인적성", "인적성검사", "검사 결과"],
    type: "text",
    answer: `제 역량을 객관적으로 증명하기 위해 외부 전문 기관의 유료 인적성 검사를 진행했습니다.\n\n어떤 데이터가 궁금하신가요?`,
    options: [
      { title: "🧠 인성 검사 결과", value: "인성 검사 결과" },
      { title: "💡 적성 검사 결과", value: "적성 검사 결과" }
    ]
  },
  {
    keywords: ["인성 검사 결과", "인성검사", "인성결과"],
    type: "text",
    answer: `🧠 **인성 검사 결과: EBR (사회적인 관리자) 유형**\n\n- **체계성:** 83점\n- **주도성:** 80점\n- **비관습성:** 73점\n\n데이터 분석가로서 외향성과 성실성이 높아, 수동적인 분석에 그치지 않고 **주도적인 인사이트 도출** 및 **타 부서와의 원활한 소통**에 강점이 있습니다.`
  },
  {
    keywords: ["적성 검사 결과", "적성검사", "적성결과", "인지능력"],
    type: "text",
    answer: `💡 **적성 검사 결과**\n\n- **인지능력 종합:** 63.80점\n- **수리 능력:** 70점\n- **추리 능력:** 66점\n\nIT개발·데이터 직군 평균(60.74점)을 크게 상회하며 연구/R&D 직군 기준을 충족합니다. **논리적 문제 해결과 수치 데이터 해석**에 최적화되어 있습니다.`
  }
];

/**
 * buildKeywordPattern(keyword)
 * ------------------------------------------------------------------
 * 한국어는 영어처럼 단어 경계(\b)가 명확하지 않으므로,
 * 아래 두 가지 전략을 조합합니다.
 *
 * 1. 영문 키워드 → \b 단어 경계 적용:  \bpython\b
 * 2. 한글 키워드 → 앞뒤에 비단어문자(공백·구두점 등) 또는 문자열 시작/끝을
 *    뜻하는 (?<![가-힣]) / (?![가-힣]) 로 경계 처리
 * ------------------------------------------------------------------
 */
function buildKeywordPattern(keyword) {
  const isEnglish = /^[a-zA-Z\s]+$/.test(keyword);
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (isEnglish) {
    return new RegExp(`\\b${escaped}\\b`, "i");
  }
  return new RegExp(`(?<![가-힣a-zA-Z])${escaped}(?![가-힣a-zA-Z])`);
}

/**
 * checkFAQ(rawText)
 * ------------------------------------------------------------------
 * 알고리즘 (최장 키워드 우선 매칭):
 * 1. rawText를 공백 제거 + 소문자 변환으로 정규화
 * 2. FAQ_MAP 전체를 순회하여 각 엔트리의 키워드가 매칭되는지 정규식 확인
 * 3. 매칭된 엔트리 중 "가장 긴 키워드"를 최종 선택
 *
 * @param {string} rawText
 * @returns {{ matched: boolean, answer: string | null, type: string, chartData?: object, options?: array }}
 * ------------------------------------------------------------------
 */
export function checkFAQ(rawText) {
  const normalized = rawText.replace(/\s+/g, "").toLowerCase();

  let bestMatch = null;
  let bestKeywordLen = -1;

  for (const faq of FAQ_MAP) {
    for (const keyword of faq.keywords) {
      const normalizedKeyword = keyword.replace(/\s+/g, "").toLowerCase();
      const pattern = buildKeywordPattern(normalizedKeyword);

      if (pattern.test(normalized)) {
        if (normalizedKeyword.length > bestKeywordLen) {
          bestKeywordLen = normalizedKeyword.length;
          bestMatch = faq;
        }
        break;
      }
    }
  }

  if (!bestMatch) return { matched: false, answer: null, type: "text" };

  return {
    matched: true,
    answer: bestMatch.answer,
    type: bestMatch.type || "text",
    chartData: bestMatch.chartData || null,
    options: bestMatch.options || null, // 인터랙티브 카드 배열
  };
}
