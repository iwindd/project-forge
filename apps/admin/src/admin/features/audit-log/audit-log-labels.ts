export const AUDIT_ACTION_LABELS: Record<string, string> = {
  USER_CREATED: "สร้างผู้ใช้งาน", USER_STATUS_CHANGED: "เปลี่ยนสถานะผู้ใช้งาน",
  USER_EMAIL_CHANGED: "เปลี่ยนอีเมลผู้ใช้งาน", USER_NAME_CHANGED: "เปลี่ยนชื่อผู้ใช้งาน",
  USER_PASSWORD_RESET: "รีเซ็ตรหัสผ่านผู้ใช้งาน", USER_ROLE_CHANGED: "เปลี่ยนบทบาทผู้ใช้งาน",
  USER_SESSIONS_REVOKED: "ยกเลิก session ผู้ใช้งาน", PROFILE_NAME_CHANGED: "แก้ชื่อบัญชีของตัวเอง",
  PROFILE_EMAIL_CHANGED: "แก้อีเมลบัญชีของตัวเอง", PROFILE_PASSWORD_CHANGED: "เปลี่ยนรหัสผ่านของตัวเอง",
  LOGIN_SUCCEEDED: "เข้าสู่ระบบสำเร็จ", LOGIN_FAILED: "เข้าสู่ระบบไม่สำเร็จ",
};

export const AUDIT_RESOURCE_TYPE_LABELS: Record<string, string> = {
  USER: "ผู้ใช้งาน", PROFILE: "บัญชีของตัวเอง", AUDIT_LOG: "ประวัติการทำรายการ",
};

const ACCOUNT_GROUP = "บัญชีและการเข้าระบบ";

function toActionGroup(action: string) {
  return action.startsWith("USER_") || action.startsWith("PROFILE_") || action.startsWith("LOGIN_")
    ? ACCOUNT_GROUP
    : AUDIT_RESOURCE_TYPE_LABELS.AUDIT_LOG;
}

export const AUDIT_ACTION_GROUPS = Object.keys(AUDIT_ACTION_LABELS).reduce<
  { group: string; items: { value: string; label: string }[] }[]
>((groups, action) => {
  const groupLabel = toActionGroup(action);
  const group = groups.find((candidate) => candidate.group === groupLabel);
  const item = { value: action, label: AUDIT_ACTION_LABELS[action] };
  if (group) group.items.push(item); else groups.push({ group: groupLabel, items: [item] });
  return groups;
}, []);

export const AUDIT_RESOURCE_TYPE_OPTIONS = Object.entries(AUDIT_RESOURCE_TYPE_LABELS).map(([value, label]) => ({ value, label }));
export const AUDIT_ACTOR_ROLE_LABELS = { ADMIN: "ผู้ดูแลระบบ", EDITOR: "ผู้ใช้งาน", USER: "ผู้ใช้งาน" } as const;
