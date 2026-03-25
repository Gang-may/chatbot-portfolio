import Script from 'next/script';
import './globals.css';

export const metadata = {
  title: '황경민 | AI Portfolio',
  description: '데이터 분석가 황경민의 인터랙티브 AI 포트폴리오입니다. 무엇이든 물어보세요!',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko" data-theme="dark">
      <head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

        {/* ============================================================
            GTM (Google Tag Manager) Head 스니펫
            ▶ ID: GTM-MZG8GG9F
            ▶ dataLayer 미리 초기화 → GTM 번들이 로드되기 전에
              dataLayer.push() 해도 이벤트가 유실되지 않음
            ============================================================ */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-MZG8GG9F');
            `,
          }}
        />
      </head>
      <body>
        {/* ============================================================
            GTM noscript 태그 (JavaScript 비활성화 환경 대응)
            반드시 <body> 바로 아래에 위치해야 합니다.
            ============================================================ */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-MZG8GG9F"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>

        {children}

        {/* ============================================================
            MS Clarity 세션 녹화 & 히트맵 추적 스크립트
            ▶ ID: w1ghlhj185
            ▶ strategy="afterInteractive" → 메인 번들 후 비동기 로딩
              (Core Web Vitals에 영향을 주지 않음)
            ============================================================ */}
        <Script id="ms-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "w1ghlhj185");
          `}
        </Script>
      </body>
    </html>
  );
}
