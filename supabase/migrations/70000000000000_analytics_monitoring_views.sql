-- ==============================================================================================
-- MASTER ADMIN ANALYTICS & MONITORING VIEWS (OPTIMIZED FOR LARGE DATASETS)
-- ==============================================================================================

-- 1. Global System Summary (Cached/Fast Read for Monitoring KPIs)
CREATE OR REPLACE VIEW public.system_summary_view AS
SELECT 
    (SELECT COUNT(*) FROM public.colleges) as total_colleges,
    (SELECT COUNT(*) FROM public.users WHERE role = 'student') as total_students,
    (SELECT COUNT(*) FROM public.users WHERE role = 'teacher') as total_teachers,
    (SELECT COUNT(*) FROM public.courses) as total_courses;

-- 2. College Growth (Monthly/Yearly Aggregation)
CREATE OR REPLACE VIEW public.college_growth_view AS
SELECT 
    DATE_TRUNC('month', created_at) as period,
    COUNT(id) as new_colleges
FROM public.colleges
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY period DESC;

-- 3. Student Growth (Monthly/Yearly Aggregation by College)
CREATE OR REPLACE VIEW public.student_growth_view AS
SELECT 
    DATE_TRUNC('month', created_at) as period,
    college_id,
    COUNT(id) as new_students
FROM public.users
WHERE role = 'student'
GROUP BY DATE_TRUNC('month', created_at), college_id
ORDER BY period DESC;

-- 4. Course Popularity (Most Enrolled Courses)
CREATE OR REPLACE VIEW public.course_popularity_view AS
SELECT 
    c.id as course_id,
    c.title as course_title,
    c.college_id,
    col.name as college_name,
    COUNT(e.id) as enrollment_count
FROM public.courses c
JOIN public.colleges col ON c.college_id = col.id
LEFT JOIN public.enrollments e ON c.id = e.course_id
GROUP BY c.id, c.title, c.college_id, col.name
ORDER BY enrollment_count DESC;

-- 5. Revenue Generated (Monthly/Yearly from Invoices)
CREATE OR REPLACE VIEW public.revenue_view AS
SELECT 
    DATE_TRUNC('month', created_at) as period,
    college_id,
    SUM(total_amount) as revenue
FROM public.invoices
WHERE status = 'paid'
GROUP BY DATE_TRUNC('month', created_at), college_id
ORDER BY period DESC;

-- 6. System Health Metrics Tables (For simulating API / Active Sessions monitoring)
CREATE TABLE IF NOT EXISTS public.system_health_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name TEXT NOT NULL,
    metric_value FLOAT NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin read health metrics" ON public.system_health_metrics
FOR SELECT USING (public.get_user_role() = 'super_admin');

-- Seed initial health data explicitly
INSERT INTO public.system_health_metrics (metric_name, metric_value) 
VALUES ('api_latency_ms', 142.5), ('active_sessions_count', 1205) ON CONFLICT DO NOTHING;

-- 7. Optimized RPC for Fetching Filtered Analytics
-- This allows React to request specifically grouped data in one extremely fast network request
CREATE OR REPLACE FUNCTION public.get_master_analytics(
    p_timeframe TEXT DEFAULT 'monthly', -- 'monthly' or 'yearly'
    p_college_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'college_growth', (
            SELECT jsonb_agg(row_to_json(t)) FROM (
                SELECT 
                    TO_CHAR(DATE_TRUNC(CASE WHEN p_timeframe = 'yearly' THEN 'year' ELSE 'month' END, created_at), 
                            CASE WHEN p_timeframe = 'yearly' THEN 'YYYY' ELSE 'Mon YYYY' END) as period_label,
                    COUNT(id) as total
                FROM public.colleges
                GROUP BY DATE_TRUNC(CASE WHEN p_timeframe = 'yearly' THEN 'year' ELSE 'month' END, created_at)
                ORDER BY MIN(created_at) ASC
                LIMIT 12
            ) t
        ),
        'student_growth', (
            SELECT jsonb_agg(row_to_json(t)) FROM (
                SELECT 
                    TO_CHAR(DATE_TRUNC(CASE WHEN p_timeframe = 'yearly' THEN 'year' ELSE 'month' END, created_at), 
                            CASE WHEN p_timeframe = 'yearly' THEN 'YYYY' ELSE 'Mon YYYY' END) as period_label,
                    COUNT(id) as total
                FROM public.users
                WHERE role = 'student' AND (p_college_id IS NULL OR college_id = p_college_id)
                GROUP BY DATE_TRUNC(CASE WHEN p_timeframe = 'yearly' THEN 'year' ELSE 'month' END, created_at)
                ORDER BY MIN(created_at) ASC
                LIMIT 12
            ) t
        ),
        'revenue', (
            SELECT jsonb_agg(row_to_json(t)) FROM (
                SELECT 
                    TO_CHAR(DATE_TRUNC(CASE WHEN p_timeframe = 'yearly' THEN 'year' ELSE 'month' END, created_at), 
                            CASE WHEN p_timeframe = 'yearly' THEN 'YYYY' ELSE 'Mon YYYY' END) as period_label,
                    SUM(total_amount) as amount
                FROM public.invoices
                WHERE status = 'paid' AND (p_college_id IS NULL OR college_id = p_college_id)
                GROUP BY DATE_TRUNC(CASE WHEN p_timeframe = 'yearly' THEN 'year' ELSE 'month' END, created_at)
                ORDER BY MIN(created_at) ASC
                LIMIT 12
            ) t
        ),
        'course_popularity', (
            SELECT jsonb_agg(row_to_json(t)) FROM (
                SELECT course_title, college_name, enrollment_count 
                FROM public.course_popularity_view
                WHERE (p_college_id IS NULL OR college_id = p_college_id)
                ORDER BY enrollment_count DESC
                LIMIT 5
            ) t
        )
    ) INTO result;

    -- Handle null arrays gracefully by coalescing to empty arrays
    RETURN jsonb_build_object(
        'college_growth', COALESCE(result->'college_growth', '[]'::jsonb),
        'student_growth', COALESCE(result->'student_growth', '[]'::jsonb),
        'revenue', COALESCE(result->'revenue', '[]'::jsonb),
        'course_popularity', COALESCE(result->'course_popularity', '[]'::jsonb)
    );
END;
$$;
