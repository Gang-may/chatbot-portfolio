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
            GTM (Google Tag Manager) 스니펫
            ▶ GTM ID 발급 후 'GTM-XXXXXX' 자리를 교체하세요.
            ▶ 발급처: https://tagmanager.google.com
            ============================================================ */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // dataLayer 미리 초기화 (GTM 로드 전 이벤트 유실 방지)
              window.dataLayer = window.dataLayer || [];

              /* GTM 스니펫 - GTM ID 교체 후 주석 해제하여 사용하세요
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-XXXXXX');
              */
            `,
          }}
        />
      </head>
      <body>
        {/* ============================================================
            GTM noscript 태그 (JavaScript 비활성화 환경 대응)
            GTM ID 교체 후 주석 해제하여 사용하세요.
            ============================================================
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXX"
            height="0" width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        */}

        {children}

        {/* ============================================================
            MS Clarity 세션 녹화 & 히트맵 추적 스크립트
            ▶ Clarity ID 발급 후 'YOUR_CLARITY_ID' 자리를 교체하세요.
            ▶ 발급처: https://clarity.microsoft.com
            ▶ strategy="afterInteractive": 페이지 로드 후 삽입 (성능 최적화)
            ============================================================ */}
        <Script id="ms-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "YOUR_CLARITY_ID");
          `}
        </Script>
      </body>
    </html>
  );
}
