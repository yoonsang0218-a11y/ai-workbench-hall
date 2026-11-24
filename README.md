# AI 작업대 명예의 전당

AI 에이전트(Claude Code, Codex, Aside 등)에서 스킬을 얼마나 쓰고 있는지 서로 비교하는 공개 게시판이에요.

## 참여하는 법

- **AI 작업대에서 (추천):** `명예의 전당` 화면에서 이름과 직무를 정하고 미리보기를 확인한 뒤 "올리기"를 누르면, 이 저장소에 내 기록 이슈가 1개 만들어지거나 고쳐져요.
- **직접:** 제목을 `[entry] 내 GitHub 아이디`로 하고, 본문에 아래 형식의 json 블록을 넣은 이슈를 열어도 돼요.

```json
{"v":1,"nickname":"표시 이름","role":"planner","stage":3,"level":20,"uses7":15,"uses30":60,"totalUses":200,"usedSkills":30,"installed":80,"streak":3,"active30":12,"abilities":{"research":8},"agents":["Claude Code"],"topSkills":["pptx"]}
```

직무(role): planner 기획·전략, marketer 마케팅·영업, developer 개발, designer 디자인, data 데이터 분석, ops 경영지원·인사·재무, legal 법무·행정·공공, researcher 연구·교육, creator 콘텐츠·크리에이터, general 학생·일반

## 알아 두세요

- 누가 올렸는지는 GitHub 계정(이슈 작성자)으로 확인하지만, 숫자는 각자 PC의 사용 기록으로 계산해 본인이 올린 값이에요. 따로 검증하지 않아요.
- 한 사람당 기록 1개만 쳐요(가장 최근에 고친 이슈).
- 빼고 싶으면 내 이슈를 닫으면 돼요.
- 올라가는 정보: 표시 이름, 직무, 단계, 레벨, 사용 횟수, 써 본 스킬 수, 연속 사용일, 능력별 레벨, 많이 쓴 스킬 이름(끌 수 있음). 파일 경로나 작업 내용은 올라가지 않아요.
