-- Account self-deletion: optional profile FKs default to NO ACTION and block
-- auth.admin.deleteUser ("Database error deleting user").

ALTER TABLE public.assignment_grades
  DROP CONSTRAINT IF EXISTS assignment_grades_graded_by_fkey;

ALTER TABLE public.assignment_grades
  ADD CONSTRAINT assignment_grades_graded_by_fkey
  FOREIGN KEY (graded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_granted_by_fkey;

ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_granted_by_fkey
  FOREIGN KEY (granted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
