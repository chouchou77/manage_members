-- إضافة عمود الملاحظات لكل طلب انضمام
alter table public.club_applications
  add column if not exists note text;
