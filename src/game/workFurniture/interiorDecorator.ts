import type { InteractionDef, ObjectDef } from '../types';
const job = (id: string, label: string, icon: string, skill: NonNullable<InteractionDef['skill']>['key'], duration = 28): InteractionDef => ({
    id, label, icon, duration, requires: 'atWork', pose: 'front',
    skill: { key: skill, rate: 1 / 100 }, effects: { fun: 0.12 },
});
/** 다정 is a fictional name on the studio's samples, not a replacement workplace name. */
export const OBJECTS: ObjectDef[] = [
    { id: 'idColourWall', name: '페인트 컬러 월', price: 0, w: 2, h: 1, icon: '🎨', color: '#bc9580', category: 'skill', unlisted: true,
        interactions: [job('idMatchPalette', '팬덱으로 색상 맞추기', '🎨', 'painting')] },
    { id: 'idLightingWall', name: '조명 샘플 월', price: 0, w: 2, h: 1, icon: '💡', color: '#c9ad79', category: 'skill', unlisted: true,
        interactions: [job('idTestLighting', '색온도와 조도 비교하기', '💡', 'handiness')] },
    { id: 'idModelTable', name: '공간 모형 프레젠테이션 테이블', price: 0, w: 2, h: 1, icon: '🏠', color: '#d9c9aa', category: 'skill', unlisted: true,
        interactions: [job('idPlanLayout', '축소 모형으로 동선 검토하기', '🏠', 'logic', 32)] },
    { id: 'idFabricRack', name: '원단·벽지 롤 랙', price: 0, w: 2, h: 1, icon: '🧵', color: '#98a08b', category: 'skill', unlisted: true,
        interactions: [job('idCompareFabric', '원단과 벽지 패턴 맞추기', '🧵', 'painting', 30)] },
    { id: 'idConsultChair', name: '의뢰인 상담 테이블·의자', price: 0, w: 2, h: 2, icon: '🪑', color: '#98a08b', category: 'skill', unlisted: true,
        interactions: [job('idDesignConsult', '의뢰인 공간 상담하기', '📝', 'charisma', 32), job('idPresentBoard', '의뢰인에게 무드보드 설명하기', '🖼️', 'painting', 32)] },
    // The studio's glass front on the street (2026-11-05, the layout audit; view3d/workplaces/shopFront.ts).
    { id: 'idShopFront', name: '인테리어 사무소 유리 정면·간판', price: 0, w: 1, h: 1, icon: '🪧', color: '#3e2f28', category: 'decor', unlisted: true, interactions: [], walkable: true, flat: true },
];
