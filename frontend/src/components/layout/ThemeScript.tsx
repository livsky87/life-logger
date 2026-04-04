import Script from "next/script";

/** FOUC 방지: 첫 페인트 전 html.dark 동기화 */
export function ThemeScript() {
  const code = `(function(){try{var k='life-logger-theme';var t=localStorage.getItem(k);if(t==='light')document.documentElement.classList.remove('dark');else document.documentElement.classList.add('dark');}catch(e){document.documentElement.classList.add('dark');}})();`;
  return <Script id="life-logger-theme" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: code }} />;
}
