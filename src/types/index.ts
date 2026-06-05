// 공유 도메인 타입 (DB 스키마와 일치) — Phase 1

export type Role = "employee" | "accountant" | "manager" | "admin" | "kiosk"

export type EmployeeStatus = "재직" | "휴직" | "퇴사"

export interface Employee {
  id: string
  employee_no: string | null
  name: string
  email: string
  phone: string | null
  profile_image_url: string | null
  hire_date: string | null
  status: EmployeeStatus
  position: string | null
  employment_type: string | null
  department_id: string | null
  role: Role
  annual_leave_total: number
  annual_leave_used: number
  must_change_password: boolean
  signature_image_url: string | null
  created_at: string
  updated_at: string
}

export interface CompanySettings {
  id: number
  work_start_time: string
  work_end_time: string
  late_grace_minutes: number
  allowed_ip_ranges: string[]
  report_deadline_time: string
  seal_image_url: string | null
  updated_at: string
}

export type AttendanceStatus =
  | "정상"
  | "지각"
  | "조기퇴근"
  | "결근"
  | "휴가"

export interface Attendance {
  id: string
  employee_id: string
  work_date: string
  check_in_at: string | null
  check_out_at: string | null
  work_minutes: number | null
  check_in_ip: string | null
  check_out_ip: string | null
  check_in_method: string | null
  device_info: string | null
  status: AttendanceStatus
  is_late: boolean
  is_early_leave: boolean
  note: string | null
  created_at: string
}

export type LeaveType =
  | "연차"
  | "오전반차"
  | "오후반차"
  | "병가"
  | "경조사"
  | "공가"
  | "무급"

export type ApprovalStatus = "대기" | "승인" | "반려"

export interface Leave {
  id: string
  employee_id: string
  leave_type: LeaveType
  start_date: string
  end_date: string
  days: number
  reason: string | null
  status: ApprovalStatus
  approved_by: string | null
  created_at: string
}

export interface Project {
  id: string
  name: string
  tag: string | null
  overview: string | null
  status: string
  status_light: "green" | "yellow" | "red"
  parent_project_id: string | null
  progress: number
  start_date: string | null
  end_date: string | null
  created_at: string
}

export type ReportType = "daily" | "weekly" | "monthly"

export type FieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "multiselect"
  | "progress"

export interface TemplateField {
  key: string
  label: string
  type: FieldType
  required: boolean
  options?: string[]
}

export interface ReportTemplate {
  id: string
  report_type: ReportType
  fields: TemplateField[]
  is_active: boolean
  updated_at: string
}

export interface Report {
  id: string
  employee_id: string
  report_type: ReportType
  report_date: string | null
  period_start: string | null
  period_end: string | null
  content: Record<string, unknown>
  status: "임시저장" | "제출"
  submitted_at: string | null
  created_at: string
}

export type MissionStatus = "작성" | "승인" | "진행" | "완료"

export interface Mission {
  id: string
  employee_id: string
  period_type: "weekly" | "monthly"
  period_start: string | null
  period_end: string | null
  title: string
  target_metric: string | null
  achievement_criteria: string | null
  priority: "상" | "중" | "하"
  progress: number
  status: MissionStatus
  created_by: string | null
  approved_by: string | null
  self_evaluation: string | null
  manager_evaluation: string | null
  result: string | null
  created_at: string
}

export interface AppNotification {
  id: string
  recipient_id: string
  type: string | null
  title: string | null
  message: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

// ── 예산(자금 현황 모니터링) — 회계담당/관리자 전용 ──
export type BudgetAccountKind = "bank" | "card" | "cash"

export interface BudgetAccount {
  id: string
  name: string
  kind: BudgetAccountKind
  opening_balance: number
  is_active: boolean
  sort: number
  note: string | null
  created_at: string
}

export type TxnDirection = "in" | "out"

export interface BudgetTransaction {
  id: string
  txn_date: string
  direction: TxnDirection
  amount: number
  category: string | null
  summary: string | null
  counterparty: string | null
  account_id: string | null
  note: string | null
  created_by: string | null
  created_at: string
}

export interface BudgetSalesTarget {
  id: string
  year: number
  item: string
  annual_target: number
  monthly_targets: Record<string, number>
  sort: number
  created_at: string
}

// ── 게시판 ──
export type BoardCategory = "공지" | "자유" | "건의"

export interface BoardPost {
  id: string
  category: BoardCategory
  title: string
  body: string | null
  author_id: string
  is_pinned: boolean
  is_required: boolean
  is_popup: boolean
  publish_at: string | null
  view_count: number
  created_at: string
  updated_at: string
}

export interface BoardComment {
  id: string
  post_id: string
  author_id: string
  parent_comment_id: string | null
  content: string
  created_at: string
}

// ── 자료공유 ──
export interface FileFolder {
  id: string
  name: string
  parent_id: string | null
  sort: number
  created_at: string
}

export interface SharedFile {
  id: string
  folder_id: string | null
  name: string
  storage_path: string | null
  external_url: string | null
  mime_type: string | null
  size_bytes: number | null
  visibility: "all" | "restricted"
  uploaded_by: string | null
  created_at: string
}

// ── 캘린더 ──
export type CalendarEventType = "personal" | "company" | "project" | "meeting"

export interface CalendarEvent {
  id: string
  title: string
  event_type: CalendarEventType
  start_date: string
  end_date: string | null
  all_day: boolean
  start_time: string | null
  end_time: string | null
  owner_id: string | null
  visibility: "private" | "shared"
  note: string | null
  created_at: string
}

// ── 전자결재 ──
export type ApprovalFormType = "leave" | "expense" | "purchase" | "general"
export type ApprovalDecision = "대기" | "승인" | "반려" | "회수"

export interface Approval {
  id: string
  form_type: ApprovalFormType
  title: string
  content: Record<string, unknown>
  applicant_id: string
  approver_id: string | null
  status: ApprovalDecision
  reject_reason: string | null
  attachment_path: string | null
  linked_leave_id: string | null
  decided_by: string | null
  decided_at: string | null
  created_at: string
}

export interface ApprovalComment {
  id: string
  approval_id: string
  author_id: string
  content: string
  created_at: string
}
