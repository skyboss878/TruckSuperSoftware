create table if not exists company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default 'Smith''s Freight',
  address text, city text, state text, zip text,
  phone text, email text, logo_url text,
  invoice_prefix text default 'SMF-',
  next_invoice_number integer default 1,
  payment_terms text default 'Net 30',
  tax_rate numeric(5,2) default 0,
  invoice_notes text,
  bank_name text, bank_account text, bank_routing text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into company_settings (company_name)
select 'Smith''s Freight'
where not exists (select 1 from company_settings);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  customer_id uuid references customers(id),
  customer_name text, customer_email text, customer_address text,
  ticket_id uuid references tickets(id),
  driver_id uuid references drivers(id),
  line_items jsonb default '[]',
  subtotal numeric(10,2) default 0,
  tax_rate numeric(5,2) default 0,
  tax_amount numeric(10,2) default 0,
  total numeric(10,2) default 0,
  status text default 'draft',
  payment_terms text default 'Net 30',
  due_date date, paid_at timestamptz, sent_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table company_settings enable row level security;
alter table invoices enable row level security;
drop policy if exists "service role full access" on company_settings;
drop policy if exists "service role full access" on invoices;
create policy "service role full access" on company_settings using (true);
create policy "service role full access" on invoices using (true);
