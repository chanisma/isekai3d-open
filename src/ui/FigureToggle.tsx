import { useSyncExternalStore } from 'react';
import { figureStyle, onFigureStyle, setFigureStyle } from '../game/gfx/figureStyle';

export const useFigureStyle = () => useSyncExternalStore(onFigureStyle, figureStyle);

/** Switches dwellers between the drawn 2D figure and the 3D dweller, on Create a Dweller and on the lot. */
export function FigureToggle({ small }: { small?: boolean }) {
  const style = useFigureStyle();
  return (
    <button
      className={`ghost${small ? ' small' : ''}`}
      title={style === '3d' ? '캐릭터를 2D 그림으로 보기' : '캐릭터를 3D로 보기'}
      onClick={() => setFigureStyle(style === '3d' ? '2d' : '3d')}
    >
      {style === '3d' ? '2D로 보기' : '3D로 보기'}
    </button>
  );
}
