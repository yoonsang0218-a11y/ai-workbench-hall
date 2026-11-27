/*
 * Firebase 웹앱 설정
 * ─────────────────────────────────────────────────────────────
 * Firebase 콘솔 > 프로젝트 설정 > 내 앱 > SDK 설정 및 구성 에서
 * "구성"을 골라 아래 값을 그대로 채우면 실시간 연결이 켜집니다.
 *
 * 값이 비어 있으면 페이지는 "로컬 모드"(이 브라우저에만 저장)로 동작합니다.
 * 아래 apiKey 등은 클라이언트 공개용 식별자이며, 보안은 Realtime Database
 * 규칙으로 관리합니다. 개인정보(이메일·전화번호·주소·비밀번호)는 절대 넣지 마세요.
 */
window.PJO_FIREBASE = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
