숲의 시선 · 도슨트 Q카드 웹앱 디자인 파일

실행 방법
1. 압축을 풉니다.
2. index.html을 브라우저로 엽니다.
3. 실제 배포 시 폴더 전체를 Vercel, Netlify, GitHub Pages 등에 업로드합니다.

구성 화면
- 대기 화면
- 명단 기입: 이름 1개 + 담당 도슨트 드롭다운
- 동선 안내: 왼쪽 아래 한 곳이 입구와 출구를 겸하며, 밖에서 들어와 시계 반대 방향으로 이동한 뒤 같은 곳으로 나감
- Q카드 6개
- 완료 화면

수정 위치
- 도슨트 이름: index.html의 <select id="docent-select">
- Q카드 문구: app.js의 qCards 배열
- 배경 이미지: assets/background.jpg
- 타이틀 이미지: assets/title.png
