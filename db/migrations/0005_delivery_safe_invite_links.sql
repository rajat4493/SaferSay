alter table identity.invite_outbox
  add column if not exists respondent_path text;

create index if not exists invite_outbox_cycle_delivery_status_idx
  on identity.invite_outbox (tenant_id, cycle_id, delivery_type, delivery_status);
