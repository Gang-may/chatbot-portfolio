document.addEventListener('DOMContentLoaded', () => {

// --- 1. THEME LOGIC ---
const themeToggleBtn = document.getElementById("theme-toggle");
const htmlElement = document.documentElement;

const savedTheme = localStorage.getItem("theme");
if (savedTheme) htmlElement.setAttribute("data-theme", savedTheme);

themeToggleBtn.addEventListener("click", () => {
    const currentTheme = htmlElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    htmlElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    
    // update charts if any are rendered
    Chart.instances.forEach(chart => {
        updateChartTheme(chart, newTheme);
    });
});

// --- 2. DATA SOURCE (Knowledge Base) ---
const myData = {
    greetings: "안녕하세요! 저는 비즈니스의 확실한 근거를 탐구하는 **데이터 분석가 황경민**의 AI 어시스턴트입니다 👋 무엇이든 물어보시면 제가 답변해 드릴게요!",
    profile: `
        <h3><i class="fas fa-user-circle"></i> 황경민 프로필 요약</h3>
        <p>비즈니스의 불확실성을 해소하는 확실한 '근거'인 데이터를 다루는 분석가입니다.</p>
        <br>
        <p>📧 <strong>이메일:</strong> <a href="#" onclick="copyEmail(event)" style="color:var(--accent-color); text-decoration:underline;">kyoungmin712@naver.com</a> (클릭하여 복사)</p>
        <p>📞 <strong>연락처:</strong> 010-5540-8025</p>
        <br>
        <a href="./assets/resume.pdf" download="황경민_이력서.pdf" class="card-link" style="display:inline-block; padding:8px 16px; background:var(--text-primary); color:var(--bg-color); border-radius:20px; text-decoration:none;"><i class="fas fa-arrow-down"></i> 이력서 다운로드</a>
    `,
    education: `
        <h3><i class="fas fa-graduation-cap"></i> 학력 및 교육 이력</h3>
        <ul>
            <li><strong>스마트 국방 데이터 분석과정 (수료)</strong><br>- 한화에어로스페이스 & 한국표준협회 (25.07 ~ 26.01)</li>
            <li><strong>강서대학교 (졸업)</strong><br>- G2빅데이터경영학과 (학점 3.99/4.5) (20.03 ~ 26.02)</li>
            <li><strong>산호세대학교 ESL Center</strong><br>- 어학연수 (24.01 ~ 26.01)</li>
        </ul>
        <p><strong>자격증:</strong> 데이터분석준전문가(ADsP), 구글 애널리틱스 인증 등</p>
    `,
    experience: `
        <h3><i class="fas fa-briefcase"></i> 사회 경험</h3>
        <ul>
            <li><strong>글로벌넥트웍스</strong> (알뜰폰 개통팀) - '24.11 ~ '25.07</li>
            <li><strong>해외봉사 (일본 나가노)</strong> - 더 멋진 세상 (수해 복구 자원봉사) - '19.11</li>
            <li>기타 서비스직 아르바이트를 통한 소통 능력 향상.</li>
        </ul>
    `,
    skills: `
        <h3><i class="fas fa-laptop-code"></i> 스킬 및 기술 역량</h3>
        <div style="margin-bottom: 15px;">
            <span class="tech-tag">Python</span>
            <span class="tech-tag">SQL</span>
            <span class="tech-tag">R</span>
            <span class="tech-tag">Pandas</span>
            <span class="tech-tag">Machine Learning</span>
        </div>
        <p>파이썬과 SQL을 활용한 데이터 수집, 전처리, 머신러닝 및 시각화 역량을 보유하고 있습니다. 제 <b>핵심 역량 차트</b>를 띄워드릴게요!</p>
        <div class="chat-chart-wrapper"><canvas id="chatChart"></canvas></div>
    `,
    projects: `
        <h3><i class="fas fa-project-diagram"></i> 주요 프로젝트</h3>
        <div class="cards-grid">
            <div class="project-card">
                <h4>AI & GIS 전술 기반 교전 지원 시스템</h4>
                <div><span class="tech-tag">Python</span><span class="tech-tag">AI Model</span></span><span class="tech-tag">GIS</span></div>
                <p>전장 실시간 지리정보(GIS)와 AI 분석을 결합한 시뮬레이션 시스템 기획.</p>
                <a href="https://lilac-abacus-fc4.notion.site/AI-GIS-30c687ae97ff8061a253c78e4a19551f" target="_blank" class="card-link">노션에서 보기 ↗</a>
            </div>
            <div class="project-card">
                <h4>군수품 입찰 현황 대시보드</h4>
                <div><span class="tech-tag">Tableau</span><span class="tech-tag">SQL</span></div>
                <p>방위사업청 데이터를 정제하여 지역/품목별 입찰 현황 시각화.</p>
                <a href="https://lilac-abacus-fc4.notion.site/30c687ae97ff80de9548e0afeba65302" target="_blank" class="card-link">노션에서 보기 ↗</a>
            </div>
            <div class="project-card">
                <h4>휴먼노이드 뉴스 기사 크롤링</h4>
                <div><span class="tech-tag">Python</span><span class="tech-tag">Pandas</span></div>
                <p>특정 키워드와 관련된 뉴스 기사를 자동으로 수집하여 빈도를 분석.</p>
                <a href="https://lilac-abacus-fc4.notion.site/30c687ae97ff802087b0cfcbc90c392c" target="_blank" class="card-link">노션에서 보기 ↗</a>
            </div>
        </div>
    `
};

const SUGGESTIONS = [
    { text: "프로필 요약 보기", intent: "profile" },
    { text: "주요 역량과 차트 📊", intent: "skills" },
    { text: "진행한 프로젝트", intent: "projects" },
    { text: "학력과 경력", intent: "education_experience" }
];

// --- 3. CHAT CONTROLLER ---

const greetingLayer = document.getElementById('greeting-layer');
const chatContainer = document.getElementById('chat-container');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const suggestionsContainer = document.getElementById('suggestions-container');
let hasStartedChat = false;

function initChat() {
    renderSuggestions();
}

function renderSuggestions() {
    suggestionsContainer.innerHTML = '';
    SUGGESTIONS.forEach(sug => {
        const btn = document.createElement('button');
        btn.className = 'chip';
        btn.textContent = sug.text;
        btn.onclick = () => handleUserInput(sug.text, sug.intent);
        suggestionsContainer.appendChild(btn);
    });
}

function transformToChatMode() {
    if(!hasStartedChat) {
        hasStartedChat = true;
        greetingLayer.classList.add('hidden'); // Hide the huge greeting text
        chatContainer.classList.add('active'); // Fade in chat
        
        // Push initial greeting from AI instantly
        addBotMessage(myData.greetings, false);
    }
}

function handleUserInput(text, intent = null) {
    if(!text.trim()) return;
    
    transformToChatMode(); // Ensure chat mode is active
    
    // 1. Render User Message
    addUserMessage(text);
    chatInput.value = '';
    sendBtn.disabled = true;
    
    // 2. Hide suggestions temporarily
    suggestionsContainer.style.display = 'none';

    // 3. Determine Bot Response
    const responseData = matchIntent(text, intent);

    // 4. Show Typing Indicator
    const typingId = showTypingIndicator();
    
    // Simulate API delay
    const delay = Math.random() * 800 + 600; 
    
    setTimeout(() => {
        removeTypingIndicator(typingId);
        addBotMessage(responseData.html, true, responseData.postRender);
        suggestionsContainer.style.display = 'flex'; // show again
        
        // Hide the specific chip was clicked? Or just keep them. We keep them.
    }, delay);
}

function matchIntent(text, intent) {
    let lower = text.toLowerCase();
    
    if (intent === 'profile' || lower.includes('프로필') || lower.includes('누구')) return { html: myData.profile };
    if (intent === 'skills' || lower.includes('역량') || lower.includes('스킬') || lower.includes('차트')) 
        return { html: myData.skills, postRender: renderChart };
    if (intent === 'projects' || lower.includes('프로젝트') || lower.includes('포트폴리오')) return { html: myData.projects };
    if (intent === 'education_experience' || lower.includes('학력') || lower.includes('학교') || lower.includes('경력')) 
        return { html: myData.education + "<br>" + myData.experience };
    if (intent === 'download' || lower.includes('이력서') || lower.includes('다운로드')) {
        const a = document.createElement('a');
        a.href = "./assets/resume.pdf";
        a.download = "황경민_이력서.pdf";
        a.click();
        return { html: "이력서 다운로드를 시작했습니다! 바로 검토해 보실 수 있습니다." };
    }
    
    // Default Fallback
    return { html: `
        제가 잘 모르는 내용이에요. 아래의 추천 질문 칩을 이용해주시거나, "프로젝트", "스킬", "이력서" 등을 입력해 보세요.
    `};
}

// --- UI HELPERS ---

function addUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'message-row user';
    div.innerHTML = `<div class="bubble">${escapeHtml(text)}</div>`;
    chatContainer.appendChild(div);
    scrollToBottom();
}

function addBotMessage(html, trackEvent=true, postRenderCallback=null) {
    const div = document.createElement('div');
    div.className = 'message-row bot';
    div.innerHTML = `<div class="bubble">${html}</div>`;
    chatContainer.appendChild(div);
    
    if(postRenderCallback) {
        setTimeout(() => postRenderCallback(div), 50);
    }
    scrollToBottom();
}

function showTypingIndicator() {
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = 'message-row bot';
    div.innerHTML = `
        <div class="bubble" style="padding: 14px 22px;">
            <div class="typing-indicator"><span></span><span></span><span></span></div>
        </div>
    `;
    chatContainer.appendChild(div);
    scrollToBottom();
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if(el) el.remove();
}

function scrollToBottom() {
    // Add small delay to ensure rendering completes
    setTimeout(() => {
        chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior: 'smooth'
        });
    }, 100);
}

function escapeHtml(unsafe) {
    return unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

window.copyEmail = function(e) {
    e.preventDefault();
    const email = e.target.textContent;
    navigator.clipboard.writeText(email).then(() => {
        const toast = document.getElementById("toast");
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3000);
    });
};

/* --- CHART LOGIC INSIDE CHAT --- */
let activeChart = null;

function renderChart(containerEl) {
    const canvas = containerEl.querySelector('#chatChart');
    if(!canvas) return;
    
    const uniqueId = 'chart-' + Date.now();
    canvas.id = uniqueId;
    
    const ctx = document.getElementById(uniqueId).getContext('2d');
    const theme = document.documentElement.getAttribute("data-theme");
    
    const textColor = theme === "dark" ? "#e2e8f0" : "#334155";
    const gridColor = theme === "dark" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)";

    Chart.defaults.color = textColor;
    Chart.defaults.font.family = "'Inter', 'Pretendard Variable', sans-serif";

    activeChart = new Chart(ctx, {
        type: "radar",
        data: {
             labels: ["체계성", "주도성", "비관습성", "사교성", "이타성"],
             datasets: [{
               label: "Score",
               data: [83, 80, 73, 69, 69],
               backgroundColor: "rgba(56, 189, 248, 0.4)",
               borderColor: "#38bdf8",
               borderWidth: 2,
               pointBackgroundColor: "#38bdf8",
               pointRadius: 4,
               pointHoverRadius: 6
             }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: gridColor }, grid: { color: gridColor },
                    pointLabels: { color: textColor, font: { size: 12, weight: 600 } },
                    min: 20, max: 100, ticks: { display: false }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function updateChartTheme(chart, theme) {
    const textColor = theme === "dark" ? "#e2e8f0" : "#334155";
    const gridColor = theme === "dark" ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)";
    chart.options.scales.r.angleLines.color = gridColor;
    chart.options.scales.r.grid.color = gridColor;
    chart.options.scales.r.pointLabels.color = textColor;
    chart.update();
}

// --- EVENT LISTENERS FOR INPUT ---
chatInput.addEventListener('input', () => {
    sendBtn.disabled = chatInput.value.trim() === '';
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleUserInput(chatInput.value);
});

sendBtn.addEventListener('click', () => {
    handleUserInput(chatInput.value);
});

// Initialization
initChat();

});
