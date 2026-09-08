# Notes

## `next-env.d.ts` และ Git

Next.js อาจเขียน `next-env.d.ts` ใหม่เมื่อสลับระหว่าง `next dev` และ `next build` ทำให้ path ของ generated types เปลี่ยนระหว่าง `.next/dev/types` และ `.next/types` และไฟล์แสดงเป็น modified ใน Git

เครื่องนี้ตั้งค่าไฟล์ดังกล่าวเป็น local `skip-worktree` แล้ว เพื่อไม่ให้ generated changes กระทบ `git status`:

```powershell
git update-index --skip-worktree next-env.d.ts
```

หากต้องการให้ Git กลับมาติดตามไฟล์ตามปกติ ให้ยกเลิกด้วย:

```powershell
git update-index --no-skip-worktree next-env.d.ts
```
