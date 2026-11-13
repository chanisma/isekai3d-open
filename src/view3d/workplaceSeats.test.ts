import { describe, expect, it } from 'vitest';
import { ALL_WORK_LOTS } from '../game/workplace';
import { workLayout } from '../game/workplaceKit';
import { seatBeside, seatKey } from './waitSeats';

/**
 * Everyone who comes in to a workplace sits while they wait or watch (2026-10-26, at the user's
 * request: the comedy club's audience stood): each client spot has a seat of its own beside it —
 * except where people stand by nature (a dance floor, a shop's counter, a class on its feet).
 */
const OUTDOOR = '바깥 마당에서 서서 기다려요';
const STANDING: Record<string, string> = {
  'dj:클럽 손님': '춤추러 왔어요',
  'actor:팬': '촬영장 정문 밖 대기선에 서서 기다려요',
  'proGamer:팬': '게임단 사옥 문 앞 보도에서 잠깐 기다려요',
  'dancer:수강생': '서서 배우는 수업이에요',
  'yogaInstructor:회원': '매트 위에서 해요',
  'retail:쇼핑 손님': '매장을 둘러봐요',
  'convenienceManager:편의점 손님': '계산대 앞에 서요',
  'baker:빵집 손님': '진열대 앞에 서요',
  'pharmacist:손님': '약국 창구 앞에 서요',
  'optician:안경원 손님': '진열대 앞에 서요',
  'farmer:농산물 손님': '가판대 앞에 서요',
  'fisher:수산물 상인': OUTDOOR,
  'busDriver:승객': OUTDOOR,
  'subwayDriver:승객': '승강장에서 열차를 기다려요',
  'taxiDriver:승객': OUTDOOR,
  'drivingInstructor:수강생': OUTDOOR,
  'forester:등산객': OUTDOOR,
  'haenyeo:관광객': OUTDOOR,
  'fishFarmer:활어 상인': '출하장에서 선별한 고기를 서서 봐요',
  'manualLabor:집주인': OUTDOOR,
  'sanitationWorker:주민': OUTDOOR,
  'greenEnergy:견학 손님': OUTDOOR,
  'welder:현장 감독': OUTDOOR,
  'wallpaperer:집주인': '시공 현장을 둘러봐요',
  'gardener:방문객': '온실을 둘러봐요',
  'extremeAthlete:체험객': '몸으로 하는 체험이에요',
  'athletic:팬': '사인회 날 훈련장 펜스 밖에서 기다려요',
  'photographer:촬영 손님': '카메라 앞에서 포즈를 잡아요',
  'fashionDesigner:고객': '가봉하며 서 있어요',
  'customsOfficer:입국 여행객': '세관 검사대 앞에 서요',
  'dietitian:급식 이용자': '식판을 들고 배식대 앞에 줄을 서요',
  'securityGuard:방문객': '빌딩 로비 안내 데스크 앞에 서서 출입증을 받아요',
  // Seen to at the bed or table beside them.
  'doctor:환자': '진료대 옆',
  'nurse:환자': '병상 옆',
  'dentist:환자': '진료 의자 옆',
  'vet:보호자': '진료대에 동물을 올려놓고 서요',
  'conservationist:견학 온 학생': '터치 수조와 전시판 앞에 서서 봐요',
  'physicalTherapist:재활 환자': '재활 기구 옆',
  'koreanMedicine:한의원 환자': '치료 침대 옆',
  // Little ones at play.
  'babysitter:어린이': '놀고 있어요',
  'childcareTeacher:어린이': '놀고 있어요',
  'childcareTeacher:학부모': '현관에서 아이를 맡기고 데려가요',
  'kindergartenTeacher:어린이': '놀고 있어요',
};

describe('seats for who comes in', () => {
  it('every client spot has a seat of its own beside it', () => {
    const missing: string[] = [];
    for (const [key, def] of Object.entries(ALL_WORK_LOTS)) {
      const id = key.split('@')[0];
      if (!def.clients?.length) continue;
      const objects = workLayout(def).objects.map((o, i) => ({ ...o, uid: i + 1 }));
      for (const c of def.clients) {
        if (STANDING[`${id}:${c.noun}`]) continue;
        const taken = new Set<string>();
        for (const [x, y] of c.spots) {
          const seat = seatBeside(objects, { x, y }, taken);
          if (seat) taken.add(seatKey(seat));
          else missing.push(`${id} ${def.name} ${c.noun} (${x},${y})`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
