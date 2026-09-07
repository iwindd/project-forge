# Phase 1 requirements

## Scope

ระบบภายในที่ผู้ใช้ login ด้วย GitHub เท่านั้น ขอสิทธิ์เข้าใช้งาน รอ admin อนุมัติ และเมื่อ approved จึงสร้าง/แก้ไข/archive project metadata ได้

## Functional requirements

- `PF-AUTH-001`: ผู้ใช้เริ่ม login ได้จาก GitHub OAuth เท่านั้น
- `PF-AUTH-002`: API ตรวจ OAuth state, แลก code ฝั่ง server และออก HttpOnly app session
- `PF-ACCESS-001`: ผู้ใช้ใหม่มีสถานะ `PENDING` และมี AccessRequest ที่ไม่ซ้ำกัน
- `PF-ACCESS-002`: ผู้ใช้ `PENDING`, `REJECTED` หรือ `SUSPENDED` เข้า project routes ไม่ได้
- `PF-ADMIN-001`: เฉพาะ `ADMIN` ที่ active เท่านั้นที่จัดการ users และ access requests ได้
- `PF-ADMIN-002`: Admin approve/reject/suspend/reactivate/change role/revoke sessions ได้ตาม policy
- `PF-ADMIN-003`: ห้าม admin suspend ตัวเองหรือทำให้ admin ที่ active เหลือศูนย์
- `PF-PROJECT-001`: Approved user สร้าง project จาก GitHub HTTPS URL ได้
- `PF-PROJECT-002`: API normalize owner/repository และ reject credential, query/hash, host หรือ path ที่ไม่รองรับ
- `PF-PROJECT-003`: Project แก้ไข name, branches, Node version และ archive ได้โดย owner
- `PF-PROJECT-004`: Environment response มีเพียง metadata ว่า key ถูกตั้งค่าแล้ว ห้ามส่งค่า secret กลับ web
- `PF-AUDIT-001`: ทุก user/access/project mutation เขียน audit actor, target, action, before/after และ reason เมื่อมี

## Explicit non-goals

การเพิ่มหรือแก้ project ใน phase นี้ห้าม clone repository, สร้าง sandbox, install dependency, build, เรียก Hermes, สร้าง chat หรือเขียน GitHub Issues/PRs

## Verification

- API health ตอบ `status=ok`
- API project route ที่ไม่มี session ตอบ `401 UNAUTHENTICATED`
- PostgreSQL migration สร้าง 7 domain tables และ migration record
- API project URL unit tests ผ่าน
- API/web typecheck, lint และ production build ผ่าน
