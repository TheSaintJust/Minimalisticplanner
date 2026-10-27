-- Hierarchical, source-aware knowledge base for essential information.
-- Public shared entries have owner_id NULL; user-created entries must belong to auth.uid().

create table if not exists public.essential_info_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  parent_id uuid references public.essential_info_items(id) on delete cascade,
  title text not null,
  slug text,
  item_type text not null default 'topic'
    check (item_type in ('category','topic','procedure','step','checklist','fact','contact','source')),
  summary text,
  body_md text,
  structured_data jsonb not null default '{}'::jsonb,
  source_url text,
  source_title text,
  source_checked_at timestamptz,
  verified_at timestamptz,
  review_due_at timestamptz,
  confidence text not null default 'unverified'
    check (confidence in ('unverified','official_source','cross_checked','user_confirmed')),
  status text not null default 'active'
    check (status in ('active','needs_review','archived')),
  tags text[] not null default '{}',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists essential_info_parent_idx on public.essential_info_items(parent_id);
create index if not exists essential_info_owner_idx on public.essential_info_items(owner_id);
create index if not exists essential_info_tags_idx on public.essential_info_items using gin(tags);
create index if not exists essential_info_search_idx on public.essential_info_items using gin (
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(body_md,''))
);
create unique index if not exists essential_info_shared_slug_unique
  on public.essential_info_items(slug) where owner_id is null and slug is not null;
create unique index if not exists essential_info_owned_slug_unique
  on public.essential_info_items(owner_id, slug) where owner_id is not null and slug is not null;

alter table public.essential_info_items enable row level security;
drop policy if exists "Read shared or owned essential information" on public.essential_info_items;
create policy "Read shared or owned essential information"
  on public.essential_info_items for select to authenticated
  using (owner_id is null or owner_id = (select auth.uid()));
drop policy if exists "Insert owned essential information" on public.essential_info_items;
create policy "Insert owned essential information"
  on public.essential_info_items for insert to authenticated
  with check (owner_id = (select auth.uid()));
drop policy if exists "Update owned essential information" on public.essential_info_items;
create policy "Update owned essential information"
  on public.essential_info_items for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
drop policy if exists "Delete owned essential information" on public.essential_info_items;
create policy "Delete owned essential information"
  on public.essential_info_items for delete to authenticated
  using (owner_id = (select auth.uid()));
grant select, insert, update, delete on public.essential_info_items to authenticated;

insert into public.essential_info_items
  (owner_id, title, slug, item_type, summary, body_md, structured_data, source_url, source_title, source_checked_at, review_due_at, confidence, tags, sort_order)
values
  (null, 'Russia immigration', 'russia-immigration', 'category',
   'Reference hub for immigration procedures, deadlines, documents, and official sources.',
   'Keep each immigration topic in its own branch. Confirm current rules with official sources before acting.',
   '{"country":"Russian Federation","record_kind":"knowledge_hub"}'::jsonb,
   'https://mosderm.ru/about-center/branches/order/6327', 'Mosderm online appointment page', now(), now() + interval '30 days', 'official_source',
   array['russia','immigration','essential-information'], 10),
  (null, 'Russian immigration — medical examination', 'russia-immigration-medical-test', 'topic',
   'Checklist and source notes for foreign nationals who need a medical examination in Moscow. Applicability depends on immigration status and current rules.',
   '## Before you go
- Confirm that this examination applies to your immigration category and current situation.
- Confirm the chosen clinic accepts your category and whether an appointment is required.
- Recheck price, documents, opening hours, and legal requirements on official pages before travelling.

This is an administrative checklist, not medical advice or a legal determination.',
   '{"country":"Russian Federation","city":"Moscow","subject":"medical examination for foreign nationals","appointment_url":"https://mosderm.ru/about-center/branches/order/6327","applicability":"Must be confirmed for the person’s immigration category"}'::jsonb,
   'https://mosderm.ru/for-patients/oms-foreign/', 'Mosderm — Foreign citizens', now(), now() + interval '14 days', 'official_source',
   array['russia','immigration','medical-test','moscow','checklist'], 20),
  (null, 'Medical examination — required documents', 'russia-medical-test-documents', 'checklist',
   'Documents listed by Mosderm for several foreign-national examination categories.',
   'For categories such as RVP, residence permit, citizenship, highly qualified specialist, and temporary stay without employment, Mosderm lists: identity document and copy; notarised Russian translation of the identity document and copy; migration card and copy where applicable; visa and copy where applicable; migration registration information and copy. Refugee and temporary-asylum categories have a different list. Check the official page for your category before relying on this summary.',
   '{"items":[{"item":"Identity document and copy","conditional":false},{"item":"Notarised Russian translation of identity document and copy","conditional":false},{"item":"Migration card and copy","conditional":true,"condition":"Where applicable"},{"item":"Visa and copy","conditional":true,"condition":"If entry required a visa"},{"item":"Migration registration details and copy","conditional":false}],"warning":"Document list differs for refugees and temporary-asylum categories"}'::jsonb,
   'https://mosderm.ru/for-patients/oms-foreign/', 'Mosderm — Foreign citizens', now(), now() + interval '14 days', 'official_source',
   array['russia','immigration','medical-test','documents'], 30),
  (null, 'Mosderm — medical examination price reference', 'mosderm-medical-test-price', 'fact',
   'Published price reference for examinations under the cited Ministry of Health procedure; reconfirm before booking.',
   'Mosderm’s published paid-services page lists RUB 6,800 for medical examination for foreign nationals aged 13 and older and RUB 5,800 for children under 13. Treat this as a dated reference, not a guaranteed quote; prices and applicability may change.',
   '{"currency":"RUB","price_age_13_and_older":6800,"price_under_13":5800,"price_type":"published reference; reconfirm"}'::jsonb,
   'https://mosderm.ru/for-patients/services-paid/services/inostrannym-grazhdanam/', 'Mosderm — Paid services for foreign citizens', now(), now() + interval '14 days', 'official_source',
   array['russia','immigration','medical-test','price'], 40),
  (null, 'Mosderm — appointment and clinic contacts', 'mosderm-medical-test-contacts', 'contact',
   'Official booking entry point and published clinic options in Moscow.',
   'Online booking page: https://mosderm.ru/about-center/branches/order/6327

Mosderm’s foreign-citizen information page lists the Central Department of Specialised Medical Care at Leninsky Prospekt 17 and the Sakharovo Multifunctional Migration Medical Centre. It says Sakharovo accepts all categories of foreign citizens and receives visitors without a prior appointment; confirm details before travel. Published contact details can change.',
   '{"booking_url":"https://mosderm.ru/about-center/branches/order/6327","leninsky_address":"Leninsky Prospekt 17, Moscow","sakaharovo_address":"Warsaw Highway, 64th km, property 1, building 47, Moscow","sakaharovo_appointment":"Mosderm page states no prior appointment is required"}'::jsonb,
   'https://mosderm.ru/for-patients/oms-foreign/', 'Mosderm — Foreign citizens', now(), now() + interval '14 days', 'official_source',
   array['russia','immigration','medical-test','appointment','contacts'], 50),
  (null, 'Medical examination — scope and applicability', 'russia-medical-test-scope', 'fact',
   'Scope depends on age and legal category; verify the current applicable rules.',
   'Mosderm describes examination under Ministry of Health Order No. 1079n, including checks for certain infectious diseases, HIV, and chemical-toxicological testing for specified substances. The precise tests and obligation can vary by age and legal category. Do not use this entry to self-diagnose or infer a legal obligation without checking official guidance.',
   '{"legal_reference":"Ministry of Health Order No. 1079n dated 2021-11-19","note":"Verify current law and personal applicability"}'::jsonb,
   'https://mosderm.ru/for-patients/services-paid/services/inostrannym-grazhdanam/', 'Mosderm — Paid services for foreign citizens', now(), now() + interval '14 days', 'official_source',
   array['russia','immigration','medical-test','legal-reference'], 60)
on conflict do nothing;

update public.essential_info_items child
set parent_id = parent.id
from public.essential_info_items parent
where child.slug = 'russia-immigration-medical-test'
  and parent.slug = 'russia-immigration'
  and child.parent_id is null;

update public.essential_info_items child
set parent_id = parent.id
from public.essential_info_items parent
where child.slug in ('russia-medical-test-documents','mosderm-medical-test-price','mosderm-medical-test-contacts','russia-medical-test-scope')
  and parent.slug = 'russia-immigration-medical-test'
  and child.parent_id is null;
