/**
 * Which answer is the honest one, for the work questions that are honesty dilemmas (ours, at the
 * user's request: 정직 is known of the player, not grown in a dweller; docs/ref-game/09-mental-competencies.md).
 * Only clear dilemmas are listed: truth vs hiding, reporting vs keeping quiet, rules and a
 * customer's real interest vs a shortcut or undue gain.
 */
export const HONEST_CHOICE: Record<string, number> = {
  ath_injury: 0, // 숨긴 부상을 알려 안전을 지킴
  biz_tip: 1, // 내부 정보 투자를 거부함
  cul_ingredient: 0, // 손님 안전 위해 의심 재료 교체
  pnt_spill: 1, // 자기 실수를 솔직히 사과함
  pnt_forgery: 1, // 위작 의뢰를 거절함
  spy_files: 1, // 기밀을 엿보지 않고 규정대로 넘김
  nur_family: 0, // 규정대로 선물을 거절함
  law_client: 0, // 거짓 진술 압박을 거절함
  fas_measure: 1, // 치수 실수를 인정하고 다시 잼
  pho_scoop: 0, // 사생활을 지켜 찍지 않음
  hair_bangs: 1, // 실수를 꾸며내지 않고 사과함
  pil_vip: 0, // 팁보다 안전 원칙을 지킴
  pol2_bribe: 0, // 뇌물성 봉투를 돌려보냄
  cri_bad: 0, // 리뷰를 솔직하게 씀
  cri_free: 0, // 리뷰 대가 선물을 거절함
  sm_typo: 0, // 오류를 숨기지 않고 해명함
  sm_fake: 0, // 가짜 팔로워 구매를 거절함
  eng_safety: 0, // 안전 문제를 덮지 않고 고침
  dip_leak: 0, // 비공개 내용을 이득 위해 흘리지 않음
  str_sponsor: 0, // 수상한 도박 광고 돈을 거절함
  toy_safety: 0, // 출하보다 아이들 안전을 지킴
  pha_trial: 0, // 임상 결과를 포장 없이 보고함
  rea_leak: 0, // 집의 하자를 숨기지 않고 알림
  rea_shady: 0, // 하자 은폐 부탁을 거절함
  mec_upsell: 0, // 불필요한 부품 교체를 권하지 않음
  gra_copy: 0, // 표절 시안을 그대로 내지 않음
  opt_eye: 0, // 판매보다 손님의 눈 건강을 먼저 알림
  ele_safety: 0, // 안전 규정 위반을 그냥 두지 않음
  wal_pattern: 0, // 가려지는 결함도 숨기지 않고 고침
  wal_mold: 0, // 곰팡이를 덮지 않고 사실대로 설명
};
