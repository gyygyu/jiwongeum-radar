# 지원금다모아 이슈 레이더 (루틴 작업 저장소)

지원금다모아의 "화제의 지원금"을 Claude 루틴이 조사해 쓰는 곳입니다. 작업 지시는 [ROUTINE_PROMPT.md](ROUTINE_PROMPT.md).

- `pending/` 뉴스에서 감지한 새 후보 (본 저장소가 매시간 추가)
- `issues/` 루틴이 쓴 이슈 원본 — 본 저장소가 매시간 형식 검사 후 가져가 근거 대조를 거쳐 사이트에 게시
- `rejected/` 거절한 후보
- `posts/` 루틴이 쓴 가이드 글 원본 — 형식 검사 후 가져가 자동 검사(공식 출처·숫자 대조·베끼기)를 거쳐 하루 1편 게시
- `import-report.md`, `post-report.md` 가져가지 못한 이슈·글과 이유 (있을 때만)
- `tools/`, `ROUTINE_PROMPT.md`, `README.md` — 자동 생성 — 고치지 마세요. 본 저장소(jiwongeum-damoa)가 매시간 덮어씁니다.
- 그 밖의 파일·폴더는 매시간 지워집니다.
