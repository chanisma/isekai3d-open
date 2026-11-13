import { useEffect, useRef, useState } from 'react';
import type { ShirtPrint } from '../game/shirtPrint';
import './shirtPrint.css';

export function ShirtPrintEditor({ value, color, enabled, onChange, onColor, sessionOnly = false }: {
  value?: ShirtPrint; color: string; enabled: boolean;
  sessionOnly?: boolean;
  onChange: (value: ShirtPrint | undefined) => void; onColor: (color: string) => void;
}) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef(0);
  useEffect(() => () => { request.current++; }, []);
  useEffect(() => { request.current++; setBusy(false); }, [enabled]);
  const change = (patch: Partial<ShirtPrint>) => value && onChange({ ...value, ...patch });
  function sample() {
    request.current++;
    setBusy(false);
    setError('');
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 400;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#f0e3c6';
    ctx.fillRect(12, 12, 488, 376);
    ctx.fillStyle = '#264943';
    ctx.font = '900 110px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OFF', 256, 135);
    ctx.fillText('DUTY', 256, 248);
    ctx.fillRect(50, 278, 412, 4);
    ctx.font = '600 22px sans-serif';
    ctx.fillText('CITY CLUB / SLOW WEEKEND', 256, 330);
    onChange({ image: canvas.toDataURL('image/png'), side: 'front', x: 0, y: 0, scale: 0.65, rotation: 0 });
  }
  async function upload(file: File | undefined) {
    if (!file) return;
    const ticket = ++request.current;
    setError('');
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setError('8MB 이하의 PNG 또는 JPG 이미지를 선택해 주세요.');
      return;
    }
    setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/webp', 0.85);
      if (data.length > 400_000) throw new Error('이미지가 너무 복잡해요. 더 작은 이미지를 선택해 주세요.');
      if (ticket === request.current) onChange({ image: data, side: 'front', x: 0, y: 0, scale: 0.6, rotation: 0 });
    } catch (e) {
      if (ticket === request.current) setError(e instanceof Error && e.message.startsWith('이미지가') ? e.message : '이미지를 읽을 수 없어요. 다른 파일을 선택해 주세요.');
    } finally {
      URL.revokeObjectURL(url);
      if (ticket === request.current) setBusy(false);
    }
  }
  return (
    <section className="shirt-print" aria-label="티셔츠 프린트 디자인">
      <h3>티셔츠 프린트 스튜디오</h3>
      <p>작은 심벌부터 큰 일러스트까지, 나만의 티셔츠를 만들어요.</p>
      {!enabled && <p>상의 탭에서 티셔츠를 입어 보면 쓸 수 있어요. 넣은 그림은 다른 옷으로 갈아입어도 남아요.</p>}
      <fieldset disabled={!enabled}>
        <label>바탕색 <input type="color" value={color} onChange={(e) => onColor(e.target.value)} /></label>
        <div className="print-actions"><button type="button" onClick={sample}>OFF DUTY 샘플로 시작</button></div>
        <label className="print-upload">그림 불러오기 · PNG / JPG
          <input type="file" accept="image/png,image/jpeg" disabled={busy || !enabled} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        {busy && <p role="status">그림을 준비하고 있어요…</p>}
        {value && <>
          <div className="print-art" style={{ background: color }}><img src={value.image} alt="티셔츠에 넣을 원본 그림" /></div>
          <label>인쇄 면
            <select value={value.side} onChange={(e) => change({ side: e.target.value as ShirtPrint['side'] })}>
              <option value="front">앞면</option><option value="back">뒷면</option>
            </select>
          </label>
          {([
            ['scale', '크기', 0.2, 0.9, 0.01],
            ['x', '좌우 위치', -0.3, 0.3, 0.01],
            ['y', '위아래 위치', -0.3, 0.3, 0.01],
            ['rotation', '회전', -180, 180, 1],
          ] as const).map(([key, label, min, max, step]) => (
            <label key={key}>{label}
              <input type="range" aria-label={`프린트 ${label}`} min={min} max={max} step={step} value={value[key]} onChange={(e) => change({ [key]: Number(e.target.value) })} />
              <output>{key === 'rotation' ? `${value[key]}°` : `${Math.round(value[key] * 100)}%`}</output>
            </label>
          ))}
          <div className="print-actions">
            <button type="button" onClick={() => change({ x: 0, y: 0, scale: 0.6, rotation: 0 })}>배치 초기화</button>
            <button type="button" onClick={() => { request.current++; setBusy(false); onChange(undefined); }}>그림 지우기</button>
          </div>
          <p>{sessionOnly ? '현재 미리보기에만 적용돼요. 새로고침하면 초기화되며 게임이나 서버에 저장되지 않아요.' : '3D 캐릭터를 돌려 앞뒤를 확인하세요. 화면의 저장·완료 버튼을 누르면 캐릭터와 함께 저장돼요.'}</p>
        </>}
      </fieldset>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
