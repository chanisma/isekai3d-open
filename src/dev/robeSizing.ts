/** Local prototype sizes. Reject unknown metadata instead of using adult geometry. */
export function robeSize(file: string) {
  const match = /^(male|female)-(toddler|child|teen|adult|elder)-/.exec(file);
  if (!match) throw new Error('샤워가운 사이즈를 찾을 수 없는 모델입니다.');
  return `${match[1]}-${match[2]}`;
}
export function robeAsset(file: string, format: 'vrm' | 'glb' = 'vrm') {
  return `/prototypes/generated/robe-01-${robeSize(file)}${format === 'glb' ? '-outfit.glb' : '.vrm'}`;
}
export function robeLabel(file: string) {
  const [sex, age] = robeSize(file).split('-');
  const ages: Record<string, string> = { toddler: '유아', child: '아동', teen: '청소년', adult: '성인', elder: '노년' };
  return `${sex === 'male' ? '남성' : '여성'} · ${ages[age]}`;
}
