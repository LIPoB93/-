숲의 시선 · 도슨트 Q카드 v5

변경 사항
- 관람 시작 시간과 완료 시간을 기기에 먼저 저장
- 전송 실패 시 localStorage에 미전송 기록 보관
- 다음 접속 또는 인터넷 복구 시 자동 재전송
- 기록 ID로 구글 시트 중복 저장 방지
- JSONP로 GAS의 실제 성공 응답 확인

구성
- GitHub/Vercel: index.html, app.js, styles.css, manifest.webmanifest, service-worker.js, vercel.json, assets 폴더
- Google Apps Script: GAS_Code.gs 내용 전체 사용
