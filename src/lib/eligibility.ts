/**
 * 기자재 대여 자격 표시 문구 (순수 모듈 — 서버·클라이언트 공용).
 *
 * 일부 기자재는 규정상 자격이 "학년"이 아니라 "이수 과목"으로 정해져 있어
 * 학년 근사값(minGrade)으로는 정확히 안내되지 않는다. 아래 표에 있는 기자재는
 * 학년 대신 지정된 문구로 표시한다.
 *
 * 주의: 이것은 표시 문구만 바꾼다. 실제 대여 가능 여부는 여전히 minGrade 로
 * 판정하므로, 문구를 바꿔도 검증 로직에는 영향이 없다.
 */
const CUSTOM_ELIGIBILITY_LABEL: Record<string, string> = {
  '소니 FX3': '촬영기초, 심화 이수자',
}

/** 대여 자격 표시 문구. 커스텀 지정이 있으면 그 문구를, 없으면 "N학년 이상". */
export function eligibilityLabel(equipmentName: string, minGrade: number): string {
  return CUSTOM_ELIGIBILITY_LABEL[equipmentName] ?? `${minGrade}학년 이상`
}
