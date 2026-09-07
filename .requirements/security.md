# Phase 1 security requirements

- Identity ใช้ immutable GitHub numeric user ID ไม่ใช้ login name เป็น primary identity
- Session token เก็บใน HttpOnly cookie และเก็บเฉพาะ SHA-256 hash ใน database
- OAuth access token เก็บเป็น AES-256-GCM ciphertext ด้วย `SESSION_SECRET` และไม่ส่งให้ browser
- `SESSION_SECRET`, GitHub client secret และ database URL อยู่ใน environment เท่านั้น
- Backend guard ตรวจ session, active state, access status และ admin role ทุกครั้ง ไม่พึ่ง navigation ที่ซ่อนใน UI
- Admin action ห้าม suspend ตัวเองหรือปิด admin คนสุดท้าย
- Project environment เก็บเฉพาะชื่อ key ที่ถูก mask เป็น `configured`
- Phase 1 ไม่มี public registration ที่เข้าใช้งานได้ทันที และไม่มี public AI endpoint
