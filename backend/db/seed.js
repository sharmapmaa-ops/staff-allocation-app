const bcrypt = require('bcryptjs');

/**
 * Idempotent seed: every insert uses ON CONFLICT DO NOTHING keyed on the
 * table's natural unique column, so running this multiple times (e.g. by
 * clicking "Run Migration" again) never duplicates rows.
 * Returns an array of { step, status, detail } log lines for the UI.
 */
async function seed(client) {
  const log = [];
  const run = async (step, sql, params) => {
    try {
      const res = await client.query(sql, params);
      log.push({ step, status: 'ok', detail: `${res.rowCount} row(s) affected` });
    } catch (err) {
      log.push({ step, status: 'error', detail: err.message });
    }
  };

  // ---------- Workspace + default users ----------
  let workspaceId;
  const wsRes = await client.query(`SELECT id FROM workspaces LIMIT 1`);
  if (wsRes.rows.length) {
    workspaceId = wsRes.rows[0].id;
    log.push({ step: 'Workspace', status: 'ok', detail: 'Using existing workspace' });
  } else {
    const ins = await client.query(
      `INSERT INTO workspaces (name) VALUES ($1) RETURNING id`,
      ['Acme Workspace']
    );
    workspaceId = ins.rows[0].id;
    log.push({ step: 'Workspace', status: 'ok', detail: 'Created "Acme Workspace"' });
  }

  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);
  const defaultUsers = [
    { code: 'EMP001', name: 'John Doe', email: 'john.doe@example.com', role: 'Admin' },
    { code: 'EMP002', name: 'Sarah Johnson', email: 'sarah.johnson@example.com', role: 'User' },
  ];
  for (const u of defaultUsers) {
    await run(
      `User ${u.email}`,
      `INSERT INTO users (workspace_id, employee_code, full_name, email, password_hash, role, is_verified)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE)
       ON CONFLICT (email) DO NOTHING`,
      [workspaceId, u.code, u.name, u.email, defaultPasswordHash, u.role]
    );
  }

  // ---------- Lookup / settings tables ----------
  const departments = [
    ['FIN', 'Finance', 'Handles accounting, billing and financial reporting'],
    ['OPS', 'Operations', 'Manages day-to-day operational activities'],
    ['PRJ', 'Projects', 'Oversees project delivery and execution'],
    ['SALES', 'Sales', 'Drives client acquisition and revenue growth'],
    ['HR', 'Human Resources', 'Manages workforce, hiring and employee relations'],
    ['IT', 'Information Technology', 'Maintains systems, infrastructure and tools'],
    ['MKT', 'Marketing', 'Handles branding, campaigns and outreach'],
  ];
  for (const [code, name, desc] of departments) {
    await run(`Department ${code}`, `INSERT INTO departments (code,name,description) VALUES ($1,$2,$3) ON CONFLICT (code) DO NOTHING`, [code, name, desc]);
  }

  const designations = [
    ['MGR', 'Manager', 'Manages team and ensures targets are met'],
    ['SMGR', 'Senior Manager', 'Leads multiple teams and drives performance'],
    ['GMGR', 'General Manager', 'Overall responsibility for business unit'],
    ['TRN', 'Trainee', 'Undergoing training and learning phase'],
    ['TRNR', 'Trainer', 'Provides training and knowledge to team members'],
    ['DOER', 'Doer', 'Executes tasks and delivers work'],
    ['REV', 'Reviewer', 'Reviews work and ensures quality'],
    ['AMGR', 'Assistant Manager', 'Supports managers in planning and execution'],
    ['ASSOC', 'Associate', 'Contributes to projects and work assignments'],
    ['SASSOC', 'Senior Associate', 'Experienced associate with advanced skills'],
    ['VP', 'Vice President', 'Vice President level role'],
    ['AVP', 'Assistant Vice President', 'Supports VP in managing functions'],
    ['SVP', 'Senior Vice President', 'Senior Vice President level role'],
    ['TL', 'Team Leader', 'Leads a team and ensures task completion'],
    ['STL', 'Senior Team Leader', 'Senior Team Leader overseeing multiple teams'],
  ];
  for (const [code, name, desc] of designations) {
    await run(`Designation ${code}`, `INSERT INTO designations (code,name,description) VALUES ($1,$2,$3) ON CONFLICT (code) DO NOTHING`, [code, name, desc]);
  }

  const currencies = [
    ['USD', 'US Dollar', '$', 1.0000, true],
    ['EUR', 'Euro', '€', 0.9156, false],
    ['GBP', 'British Pound', '£', 0.7865, false],
    ['AUD', 'Australian Dollar', 'A$', 1.5273, false],
    ['CAD', 'Canadian Dollar', 'C$', 1.3648, false],
    ['INR', 'Indian Rupee', '₹', 83.1250, false],
    ['AED', 'UAE Dirham', 'د.إ', 3.6725, false],
  ];
  for (const [code, name, symbol, rate, isBase] of currencies) {
    await run(`Currency ${code}`, `INSERT INTO currencies (code,name,symbol,rate,is_base) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (code) DO NOTHING`, [code, name, symbol, rate, isBase]);
  }

  const locations = [
    ['NYC', 'New York', 'United States', 'EST (UTC-05:00)', 'New York office and project site'],
    ['LDN', 'London', 'United Kingdom', 'GMT (UTC+00:00)', 'London office'],
    ['SYD', 'Sydney', 'Australia', 'AEST (UTC+10:00)', 'Sydney office'],
    ['DXB', 'Dubai', 'United Arab Emirates', 'GST (UTC+04:00)', 'Dubai office'],
    ['SIN', 'Singapore', 'Singapore', 'SGT (UTC+08:00)', 'Singapore office'],
    ['BER', 'Berlin', 'Germany', 'CET (UTC+01:00)', 'Berlin office'],
    ['TOR', 'Toronto', 'Canada', 'EST (UTC-05:00)', 'Toronto office'],
    ['BLR', 'Bangalore', 'India', 'IST (UTC+05:30)', 'Bangalore office'],
    ['HYD', 'Hyderabad', 'India', 'IST (UTC+05:30)', 'Hyderabad office'],
  ];
  for (const [code, name, country, tz, desc] of locations) {
    await run(`Location ${code}`, `INSERT INTO locations (code,name,country,time_zone,description) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (code) DO NOTHING`, [code, name, country, tz, desc]);
  }

  const categories = [
    ['FIN', 'Finance', 'Projects related to finance and accounting activities'],
    ['IT', 'Information Technology', 'Projects related to IT systems and technology'],
    ['OPS', 'Operations', 'Projects related to day-to-day operations'],
    ['HR', 'Human Resources', 'Projects related to HR and workforce management'],
    ['MKT', 'Marketing', 'Projects related to marketing and branding'],
    ['ADM', 'Administration', 'Projects related to administration and support'],
    ['LEGAL', 'Legal', 'Projects related to legal and compliance'],
  ];
  for (const [code, name, desc] of categories) {
    await run(`Category ${code}`, `INSERT INTO project_categories (code,name,description) VALUES ($1,$2,$3) ON CONFLICT (code) DO NOTHING`, [code, name, desc]);
  }

  const types = [
    ['FIX', 'Fixed Price', 'Projects with a fixed price regardless of time or resources'],
    ['T&M', 'Time & Materials', 'Projects billed based on actual time and materials used'],
    ['FP', 'Fixed Price with Milestones', 'Fixed price projects with milestone-based billing'],
    ['CP', 'Cost Plus', 'Projects billed on cost plus a fee or margin'],
    ['RET', 'Retainer', 'Ongoing engagement under a retainer agreement'],
    ['NTE', 'Not to Exceed', 'Projects with a maximum cap on total charges'],
  ];
  for (const [code, name, desc] of types) {
    await run(`Project Type ${code}`, `INSERT INTO project_types (code,name,description) VALUES ($1,$2,$3) ON CONFLICT (code) DO NOTHING`, [code, name, desc]);
  }

  const basis = [
    ['HRLY', 'Hourly', 'Billing based on the number of hours worked'],
    ['DAILY', 'Daily', 'Billing based on the number of days worked'],
    ['WEEKLY', 'Weekly', 'Billing based on the number of weeks'],
    ['MONTHLY', 'Monthly', 'Billing based on the number of months'],
    ['FIXED', 'Fixed Price', 'Billing as a fixed amount regardless of time'],
    ['MILESTONE', 'Milestone Based', 'Billing based on project milestones'],
  ];
  for (const [code, name, desc] of basis) {
    await run(`Billing Basis ${code}`, `INSERT INTO billing_basis (code,name,description) VALUES ($1,$2,$3) ON CONFLICT (code) DO NOTHING`, [code, name, desc]);
  }

  const freqs = [
    ['HOURLY', 'Hourly', 'Invoices generated every hour based on hours worked', 'Every 1 hour'],
    ['DAILY', 'Daily', 'Invoices generated every day', 'Every 1 day'],
    ['WEEKLY', 'Weekly', 'Invoices generated every week', 'Every 1 week'],
    ['BIWEEKLY', 'Bi-Weekly', 'Invoices generated every two weeks', 'Every 2 weeks'],
    ['MONTHLY', 'Monthly', 'Invoices generated every month', 'Every 1 month'],
    ['QUARTERLY', 'Quarterly', 'Invoices generated every quarter', 'Every 3 months'],
  ];
  for (const [code, name, desc, rule] of freqs) {
    await run(`Billing Frequency ${code}`, `INSERT INTO billing_frequencies (code,name,description,next_invoice_rule) VALUES ($1,$2,$3,$4) ON CONFLICT (code) DO NOTHING`, [code, name, desc, rule]);
  }

  // ---------- Employees ----------
  const employees = [
    ['EMP001', 'John Doe', 'Finance', 'Manager', '1988-06-15', 'Male', '+91 987 654 3210', 'john.doe@example.com', '2022-01-01', 'Full Time', 'Bangalore', 75000, 'Active', 'Admin'],
    ['EMP002', 'Sarah Johnson', 'Operations', 'Senior Manager', '1990-08-22', 'Female', '+91 912 345 6780', 'sarah.johnson@example.com', '2021-03-15', 'Full Time', 'Hyderabad', 68000, 'Active', 'User'],
    ['EMP003', 'Robert Brown', 'Projects', 'Associate', '1989-12-10', 'Male', '+91 998 877 6655', 'robert.brown@example.com', '2021-07-10', 'Part Time', 'Bangalore', 40000, 'Active', 'User'],
    ['EMP004', 'Emily Davis', 'Finance', 'Senior Associate', '1992-03-05', 'Female', '+91 900 123 4567', 'emily.davis@example.com', '2020-06-01', 'Contractor', 'Bangalore', 55000, 'Active', 'User'],
    ['EMP005', 'David Wilson', 'Sales', 'Manager', '1987-11-18', 'Male', '+91 934 567 8901', 'david.wilson@example.com', '2019-09-12', 'Full Time', 'Hyderabad', 72000, 'On Leave', 'Admin'],
    ['EMP006', 'Lisa Martinez', 'HR', 'Associate', '1991-04-27', 'Female', '+91 987 321 6540', 'lisa.martinez@example.com', '2022-02-05', 'Contractor', 'Bangalore', 72000, 'Active', 'User'],
    ['EMP007', 'James Anderson', 'Projects', 'Senior Manager', '1986-09-30', 'Male', '+91 976 543 2109', 'james.anderson@example.com', '2018-11-20', 'Full Time', 'Hyderabad', 80000, 'Active', 'Admin'],
    ['EMP008', 'Laura Wilson', 'Finance', 'Associate', '1993-01-08', 'Female', '+91 910 111 2222', 'laura.wilson@example.com', '2023-04-17', 'Full Time', 'Bangalore', 90000, 'Active', 'User'],
    ['EMP009', 'Michael Smith', 'IT', 'Doer', '1990-07-12', 'Male', '+91 981 234 5678', 'michael.smith@example.com', '2020-08-01', 'Full Time', 'Hyderabad', 85000, 'Inactive', 'User'],
    ['EMP010', 'Sophia Lee', 'Marketing', 'Associate', '1994-02-21', 'Female', '+91 989 876 5432', 'sophia.lee@example.com', '2022-10-11', 'Full Time', 'Bangalore', 50000, 'Active', 'User'],
  ];
  const employeeIds = {};
  for (const e of employees) {
    const [code, name, dept, desig, dob, gender, contact, email, joining, payroll, location, salary, status, access] = e;
    const res = await client.query(
      `INSERT INTO employees (employee_code, full_name, department, designation, dob, gender, contact_number, email, joining_date, payroll_type, location, gross_salary, status, access_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (employee_code) DO UPDATE SET full_name = EXCLUDED.full_name
       RETURNING id`,
      [code, name, dept, desig, dob, gender, contact, email, joining, payroll, location, salary, status, access]
    );
    employeeIds[code] = res.rows[0].id;
    log.push({ step: `Employee ${code}`, status: 'ok', detail: `${name}` });
  }
  // Link EMP001/EMP002 to the seeded user accounts
  await client.query(`UPDATE employees SET user_id = (SELECT id FROM users WHERE email=$1) WHERE employee_code=$2`, ['john.doe@example.com', 'EMP001']);
  await client.query(`UPDATE employees SET user_id = (SELECT id FROM users WHERE email=$1) WHERE employee_code=$2`, ['sarah.johnson@example.com', 'EMP002']);

  // ---------- Projects ----------
  const projects = [
    ['PRJ001', 'Financial Reporting - May 2025', 'Global Retail Ltd.', 'Finance', 'Fixed Price', 'Monthly', true, 'John Doe', 'Time & Materials', 160, 25, 100, 'USD', 'Monthly financial reporting services', '2025-05-31'],
    ['PRJ002', 'Lease Abstraction - Phase 2', 'Core Property Group', 'Legal', 'Fixed Price', 'Monthly', true, 'Sarah Johnson', 'Fixed Price', 100, 30, 85, 'USD', 'Lease abstraction and data entry', '2025-04-15'],
    ['PRJ003', 'Yardi Data Migration', 'Alpha Realty', 'Information Technology', 'Fixed Price', 'One Time', true, 'Michael Smith', 'Time & Materials', 80, 20, 90, 'USD', 'Data migration from old system to Yardi', '2025-05-01'],
    ['PRJ004', 'AP Process Optimization', 'Beta Developers', 'Operations', 'Time & Materials', 'Monthly', true, 'John Doe', 'Time & Materials', 120, 22, 95, 'USD', 'Optimize AP processes', '2025-05-30'],
    ['PRJ005', 'Adhoc Support - May', 'Delta Holdings', 'Operations', 'Time & Materials', 'Monthly', false, 'Sarah Johnson', 'Time & Materials', 50, 18, 80, 'USD', 'Adhoc support services', '2025-05-01'],
    ['PRJ006', 'Training & Development', 'Internal', 'Human Resources', 'Fixed Price', 'One Time', false, 'Michael Smith', 'Fixed Price', 40, 15, 70, 'USD', 'Employee training program', '2025-05-05'],
    ['PRJ007', 'System Maintenance', 'Internal', 'Information Technology', 'Time & Materials', 'Monthly', false, 'John Doe', 'Time & Materials', 90, 20, 85, 'USD', 'Routine system maintenance', '2025-05-01'],
    ['PRJ008', 'Documentation', 'Internal', 'Operations', 'Fixed Price', 'One Time', false, 'Sarah Johnson', 'Fixed Price', 30, 15, 60, 'USD', 'Process documentation', '2025-05-03'],
  ];
  const projectIds = {};
  for (const p of projects) {
    const [code, name, client_name, category, type, billFreq, sow, manager, billBasis, capping, gp, rate, currency, desc, start] = p;
    const res = await client.query(
      `INSERT INTO projects (project_code, project_name, client_name, category, project_type, billing_frequency, sow_available, project_manager, billing_basis, hours_capping, gp_margin, rate, currency, description, start_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (project_code) DO UPDATE SET project_name = EXCLUDED.project_name
       RETURNING id`,
      [code, name, client_name, category, type, billFreq, sow, manager, billBasis, capping, gp, rate, currency, desc, start]
    );
    projectIds[code] = res.rows[0].id;
    log.push({ step: `Project ${code}`, status: 'ok', detail: name });
  }

  // ---------- Sample time entries (so Reports have data to aggregate) ----------
  const existingEntries = await client.query('SELECT COUNT(*)::int AS c FROM time_entries');
  if (existingEntries.rows[0].c === 0) {
    const sampleEntries = [
      ['EMP001', 'PRJ001', '2025-05-12', 8, true],
      ['EMP001', 'PRJ001', '2025-05-13', 8, true],
      ['EMP001', 'PRJ004', '2025-05-14', 4, true],
      ['EMP002', 'PRJ002', '2025-05-12', 6, true],
      ['EMP002', 'PRJ005', '2025-05-13', 3, true],
      ['EMP003', 'PRJ003', '2025-05-12', 5, true],
      ['EMP003', 'PRJ003', '2025-05-13', 5, true],
      ['EMP007', 'PRJ001', '2025-05-14', 6, true],
      ['EMP009', 'PRJ007', '2025-05-12', 4, false],
      ['EMP006', 'PRJ006', '2025-05-13', 3, false],
    ];
    for (const [empCode, projCode, date, hours, billable] of sampleEntries) {
      if (!employeeIds[empCode] || !projectIds[projCode]) continue;
      await client.query(
        `INSERT INTO time_entries (employee_id, project_id, work_date, hours, billable) VALUES ($1,$2,$3,$4,$5)`,
        [employeeIds[empCode], projectIds[projCode], date, hours, billable]
      );
    }
    log.push({ step: 'Sample time entries', status: 'ok', detail: `${sampleEntries.length} row(s) inserted` });
  } else {
    log.push({ step: 'Sample time entries', status: 'ok', detail: 'Already present, skipped' });
  }

  // ---------- Sample notifications ----------
  const adminUser = await client.query(`SELECT id FROM users WHERE email='john.doe@example.com'`);
  if (adminUser.rows.length) {
    const notifCount = await client.query('SELECT COUNT(*)::int AS c FROM notifications');
    if (notifCount.rows[0].c === 0) {
      const notes = [
        ['Timesheet Reminder', 'Please submit your timesheet for this week.'],
        ['New Project Assigned', 'You were added to "Yardi Data Migration".'],
        ['Leave Approved', "David Wilson's leave request was approved."],
      ];
      for (const [title, message] of notes) {
        await client.query(`INSERT INTO notifications (user_id, title, message) VALUES ($1,$2,$3)`, [adminUser.rows[0].id, title, message]);
      }
      log.push({ step: 'Sample notifications', status: 'ok', detail: `${notes.length} row(s) inserted` });
    }
  }

  return log;
}

module.exports = { seed };
