# Chrome·Windows PC 푸시 알림 설정

## 1. D1 테이블 추가

Cloudflare D1 `teadosa-members` → Console에서 `database/migrations/012_admin_push_subscriptions_v1.sql` 파일 안의 SQL 전체를 복사하여 한 번 실행합니다. 파일 경로 자체를 입력하면 안 됩니다.

## 2. VAPID 키 생성

프로젝트 폴더에서 다음 명령을 한 번 실행합니다.

```bash
npm install
npm run generate:vapid
```

화면에 `VAPID_PUBLIC_KEY`와 `VAPID_PRIVATE_KEY`가 출력됩니다. 두 값은 한 쌍이므로 이후 임의로 변경하지 않습니다. 비밀키는 외부에 공개하거나 GitHub 파일에 넣지 않습니다.

## 3. Cloudflare 환경변수 등록

Cloudflare Pages 프로젝트 → Settings → Variables and Secrets에서 Production 환경에 다음 세 항목을 등록합니다.

- `VAPID_PUBLIC_KEY`: 앞에서 생성된 공개키
- `VAPID_PRIVATE_KEY`: 앞에서 생성된 비밀키. 반드시 Secret/Encrypt로 등록
- `VAPID_SUBJECT`: `mailto:no-reply@kgen.kr`

등록 후 새 배포를 실행합니다.

## 4. 관리자 PC 등록

1. HTTPS로 배포된 사이트의 관리자 페이지를 Chrome에서 엽니다.
2. 상단 종 모양 알림 버튼을 누릅니다.
3. `PC 알림 받기`를 누릅니다.
4. Chrome의 알림 권한 질문에서 `허용`을 선택합니다.
5. Windows 알림센터에 `태양광도사 PC 알림 연결 완료`가 표시되는지 확인합니다.

같은 관리자 계정이라도 PC나 Chrome 프로필마다 위 등록을 한 번씩 해야 합니다. `PC 알림 해제`를 누르면 해당 PC만 해제됩니다.

## 5. Windows에서 보이지 않을 때

- Windows 설정 → 시스템 → 알림에서 Google Chrome 알림을 켭니다.
- 집중 지원 또는 방해 금지 모드를 확인합니다.
- Chrome 주소창 왼쪽 사이트 설정에서 알림이 `허용`인지 확인합니다.
- 관리자 알림센터에 `VAPID 키 설정이 필요합니다`가 나오면 환경변수와 재배포 여부를 확인합니다.
