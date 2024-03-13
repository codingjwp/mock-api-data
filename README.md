# Challenge 용 Mock API

## login 및 회원가입 부분

- `/signin :` **POST**
  - body로 `nick`과 `password` 값을 받아옵니다.
- `/signup :` **POST**
  - body로 `nick`과 `password`, `confirm` 값을 받아옵니다.

## 게시물 관련 부분

- `/challenge :` **GET** 게시글 가져오기
  - query string으로 `status(챌린지, 성공, 실패)`와 `userId` 받아옵니다.
- `/challenge :` **POST** 게시글 생성
  - body로 `userId`, `title`, `imgSrc`, `description`, `startDate`, `endDate` 값을 받아옵니다.
- `/challenge/:id :` **POST** 게시글 수정
  - body로 `userId`, `title`, `imgSrc`, `description`, `startDate`, `endDate` 값을 받아옵니다.
- `/challenge :` **PUT** 게시글 상태 변경
  - body로 `userId`, `postId`, `status` 값을 받아옵니다.
- `/challenge/:id :` **DELETE** 게시글 삭제
  - body로 `userId` 값을 받아옵니다.

## 이미지 가져오기

- `/v2/image`: **GET** 이미지 가져오기

## 대쉬보드용 데이터 가져오기

- `/dashboard/:id` **GET** 대쉬보드용 데이터 가져오기
