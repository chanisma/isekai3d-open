import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// Fonts come with the game (OFL), so they show without the internet too.
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
// Headings in Hahmlet Bold (OFL), a sturdy serif after the title art's heavy lettering; one weight
// (every heading is 700), 220 KB of Hangul where Gowun Batang's two weights were 940 KB.
import '@fontsource/hahmlet/korean-700.css';
import '@fontsource/hahmlet/latin-700.css';
import './styles.css';
import './design.css';

// Development builds get a check for hard-to-read text in the console: __contrast() (src/dev/contrast.ts).
if (import.meta.env.DEV) void import('./dev/contrast').then((m) => ((window as unknown as { __contrast?: typeof m.auditContrast }).__contrast = m.auditContrast));

// The canvas draws emoji too: ask for the emoji font up front so it doesn't wait on the page.
void document.fonts?.load('16px "Dwellers Fluent Emoji"', '\u{1F642}');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
