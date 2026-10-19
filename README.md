# Soundmark v1.5.2 — 사전 검토판

AI 영상 제작자용 한국어·영어 CC0 효과음 탐색 사이트입니다. 100개 별도 경량 MP3 미리듣기와 개별 원본 다운로드 링크가 포함됩니다.

- 수집 후보 154개, 실제 파일 기술 검사 통과 146개, 선정 100개, 별도 MP3 생성 100개
- 파일별 원본 다운로드/디코딩/음량/해시 검사 완료
- **독립적 실제 청취 및 100개 개별 원저작권 검수는 완료되지 않았습니다.** 최종 공개 승인 0개이며 사전 검토판입니다.
- 출처: CC0 Public Domain Sounds GitHub 컬렉션 및 Moonseal 개별 CC0 출처 고지. 수집 컬렉션의 CC0 선언만으로 개별 권리가 보증되는 것은 아닙니다.

## 사용법
압축을 풀고 index.html을 실행하세요. 한국어·영어 검색, 필터, 재생, 원본 다운로드 버튼을 사용할 수 있습니다.
별도 관리자 백엔드/DB는 없습니다. data/catalog.json을 수정한 뒤 data/catalog.js를 재생성하여 정적 재배포합니다.
원본 음원을 압축에 저장하지 않았으며 assets/previews 폴더에 미리듣기 전용 MP3만 포함됩니다.
\n## 추가 검사\n100개 원본 다운로드 URL 모두 HEAD 요청에서 200으로 응답했습니다. 실제 기기·브라우저 재생 테스트는 별도입니다.\n\n## v1.5.2 Filename fix\nPreview MP3s use English descriptive filenames instead of sfx-ID; originals on creator sites remain untouched. The 100-entry ID-to-name mapping is in reports/filename-map.tsv. This is metadata-based naming, not finished semantic listening verification.\n

## Preview filename policy (v1.5.2)
Preview MP3 names are human-readable lowercase English filenames. Source creator download links and original filenames are unchanged. The mapping is in reports/filename-map.tsv. Filenames are based on source descriptive metadata, not independently completed audio-semantic listening.
