-- Filtered Realtime subscriptions on class_session_id / attendance_session_id need
-- full row data in the replication stream.
ALTER TABLE public.attendance_records REPLICA IDENTITY FULL;
