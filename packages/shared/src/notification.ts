export type NotificationKind = 'course' | 'certificate' | 'assignment' | 'webinar' | 'system';

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
}
