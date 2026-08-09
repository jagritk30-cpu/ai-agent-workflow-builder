-- Demo Data Seed
-- Insert Organizations
INSERT INTO public.organizations (id, name, slug, quota_limit) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Org A', 'org-a', 5000),
  ('b2222222-2222-2222-2222-222222222222', 'Org B', 'org-b', 1000)
ON CONFLICT DO NOTHING;

-- Insert Org Members (Placeholder UUIDs)
INSERT INTO public.org_members (org_id, user_id, role) VALUES
  ('a1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'owner'),
  ('b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', 'owner')
ON CONFLICT DO NOTHING;

-- Insert Workflows
INSERT INTO public.workflows (id, org_id, name, description, created_by) VALUES
  ('c3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 'Demo Workflow A', 'A demo workflow for Org A', '00000000-0000-0000-0000-000000000001'),
  ('d4444444-4444-4444-4444-444444444444', 'b2222222-2222-2222-2222-222222222222', 'Demo Workflow B', 'A demo workflow for Org B', '00000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- Insert Workflow Steps
INSERT INTO public.workflow_steps (workflow_id, step_order, name, type, config) VALUES
  ('c3333333-3333-3333-3333-333333333333', 1, 'First Step', 'llm_call', '{"prompt": "Hello"}'),
  ('d4444444-4444-4444-4444-444444444444', 1, 'Initial Step', 'http_request', '{"url": "https://example.com"}')
ON CONFLICT DO NOTHING;

-- Insert Workflow Triggers
INSERT INTO public.workflow_triggers (workflow_id, trigger_type, config) VALUES
  ('c3333333-3333-3333-3333-333333333333', 'manual', '{}'),
  ('d4444444-4444-4444-4444-444444444444', 'webhook', '{"token": "demo-token"}')
ON CONFLICT DO NOTHING;
