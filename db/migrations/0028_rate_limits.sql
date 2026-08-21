-- Fixed-window rate limiting for public, unauthenticated endpoints
-- (respondent session/submit/SOS). Not tenant-scoped -- keyed by
-- caller IP + route, so it lives in identity alongside other
-- access-control bookkeeping rather than under RLS-tenant-isolation.
create table identity.rate_limit_hits (
  bucket_key text not null,
  window_start timestamptz not null,
  hit_count integer not null default 1,
  primary key (bucket_key, window_start)
);

-- Buckets are only ever read/written for "now"'s window; old rows are
-- pure dead weight kept only long enough to be swept by the periodic
-- cleanup in rateLimit.ts. Index supports that sweep.
create index idx_rate_limit_hits_window on identity.rate_limit_hits(window_start);
