# Supabase Database Setup & Integration Guide
**Project**: MIS TA-DA Enterprise Management Portal  
**Document**: `Setup/Supabase-Setup.md`  
**Purpose**: Step-by-step instructions to connect Supabase PostgreSQL as your primary or hybrid database for personal account setup.

---

## 1. Why Use Supabase with This Portal?

[Supabase](https://supabase.com) provides a free, hosted **PostgreSQL database** with instant REST APIs, row-level security (RLS), and real-time capabilities.

### Key Benefits:
* **True Relational Database**: PostgreSQL ACID compliance with zero sheet cell limits.
* **Dual-Sync (Hybrid)**: The portal can save claims to Google Sheets for accounting while simultaneously writing to Supabase for instant analytics and SQL queries.
* **Completely Free Tier**: 500MB database, 50,000 monthly active users, and unlimited API requests on Supabase's free plan.
* **No Google Workspace Lock-In**: Perfect for running the web app on your personal account.

---

## 2. Step 1: Create a Free Supabase Project

1. Navigate to **[supabase.com](https://supabase.com)** and sign in with GitHub or your personal email.
2. Click **New Project**.
3. Fill in the project details:
   - **Name**: `MIS TA-DA Portal`
   - **Database Password**: *(Save this in a password manager)*
   - **Region**: Choose closest to you (e.g. `ap-south-1 (Mumbai)` for India).
4. Click **Create new project** and wait ~1 minute for Supabase to provision your PostgreSQL database.

---

## 3. Step 2: Create the `ta_claims` Table in Supabase

1. In your Supabase Dashboard, click **SQL Editor** on the left navigation sidebar.
2. Click **New query** and paste the following SQL script:

```sql
-- ====================================================================
-- 1. Create TA Claims Table in Supabase PostgreSQL
-- ====================================================================
CREATE TABLE IF NOT EXISTS ta_claims (
  id TEXT PRIMARY KEY,
  s_no INT,
  emp_code TEXT NOT NULL,
  sales_person_name TEXT NOT NULL,
  state TEXT NOT NULL,
  ta_bill NUMERIC(12, 2) NOT NULL DEFAULT 0,
  month TEXT NOT NULL,
  full_and_final TEXT DEFAULT 'No',
  submission_date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source_sheet TEXT
);

-- ====================================================================
-- 2. Create High-Performance Query Indexes
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_ta_claims_month ON ta_claims(month);
CREATE INDEX IF NOT EXISTS idx_ta_claims_state ON ta_claims(state);
CREATE INDEX IF NOT EXISTS idx_ta_claims_emp ON ta_claims(emp_code);

-- ====================================================================
-- 3. Configure Row Level Security (RLS)
-- ====================================================================
ALTER TABLE ta_claims ENABLE ROW LEVEL SECURITY;

-- Allow portal client to read and write claim records
CREATE POLICY "Allow public read and write for TA Portal" 
  ON ta_claims 
  FOR ALL 
  USING (true);
```

3. Click **Run** (or `Ctrl + Enter`). You will see `Success. No rows returned.`

---

## 4. Step 3: Copy Your API Credentials

In your Supabase project dashboard:
1. Click the **Project Settings** (gear icon) in the bottom-left corner.
2. Click **API** under Configuration.
3. Copy the following two values:
   - **Project URL**: e.g., `https://abcdefghijklmno.supabase.co`
   - **Project API Keys ➔ `anon` `public`**: e.g., `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## 5. Step 4: Configure Supabase in Admin Settings

1. Open your MIS TA-DA Portal in your browser.
2. Go to **Settings & Permissions** ➔ **⚡ Supabase Database** tab.
3. Toggle **"Enable Supabase Integration"** to **ON**.
4. Fill in your credentials:
   - **Database Sync Mode**: Choose **"Dual-Sync: Google Sheets + Supabase PostgreSQL (Recommended)"**.
   - **Supabase Project URL**: Paste your Project URL.
   - **Supabase Anon Public API Key**: Paste your `anon` key.
   - **Target Table Name**: Keep as `ta_claims`.
5. Click **Test Connection**:
   - The portal will test connectivity live. When verified, a green badge will appear:  
     `● Connected successfully! Supabase table "ta_claims" is reachable & ready.`
6. Click **Save Supabase Settings**.

---

## 6. Step 5: Delegating Supabase Management Permissions

By default, only the **System Administrator** can access and edit Supabase connection credentials.

If you want to allow a coordinator (e.g. Bharti or Bhawna) to manage Supabase settings:
1. In the portal, navigate to **Settings & Permissions** ➔ **User Permissions** tab.
2. Select the coordinator (**Bharti** or **Bhawna**).
3. Under **Functionality & Data Actions**, turn ON:  
   👉 **"Manage Supabase Database Setup"** *(Allow user to configure Supabase URL, API keys, and cloud database sync)*.
4. Click **Save All Permissions**.

---

## 7. Database Sync Modes Explained

| Sync Mode | How It Works | Best Used For |
| :--- | :--- | :--- |
| **Dual-Sync (Hybrid)** *(Default)* | Saves claims into Google Sheets for accounting workflows, and simultaneously mirrors the row into Supabase PostgreSQL. | **Recommended**: You get the spreadsheet familiarity of Google Sheets with the speed and reliability of PostgreSQL. |
| **Supabase Only** | Saves and queries claims directly from Supabase PostgreSQL, bypassing Google Sheets. | Personal account setups with no Google Sheets dependencies. |
| **Google Sheets Only** | Uses standard Google Sheets API exclusively (Supabase disabled). | Standard corporate Workspace configuration. |
