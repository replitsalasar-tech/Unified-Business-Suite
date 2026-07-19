/**
 * Seed script — creates one demo company + admin user + departments + employees
 * Run: pnpm --filter @workspace/api-server run seed
 */
import { db } from "@workspace/db";
import {
  companiesTable,
  usersTable,
  departmentsTable,
  jobTitlesTable,
  employeesTable,
  leavePoliciesTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import { createId } from "@paralleldrive/cuid2";

async function main() {
  console.log("🌱 Seeding database...");

  // ── Company ───────────────────────────────────────────────────────────────
  const [company] = await db
    .insert(companiesTable)
    .values({
      name: "Acme India Pvt Ltd",
      slug: "acme-india",
      plan: "GROWTH",
      fiscalYearStart: 4,
      currency: "INR",
      timezone: "Asia/Kolkata",
    })
    .onConflictDoNothing()
    .returning();

  if (!company) {
    console.log("Company already exists, skipping seed.");
    process.exit(0);
  }

  // ── Admin User ────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("Admin@1234", 12);
  const [adminUser] = await db
    .insert(usersTable)
    .values({
      companyId: company.id,
      email: "admin@acme-india.com",
      passwordHash,
      role: "ADMIN",
      firstName: "Priya",
      lastName: "Sharma",
    })
    .returning();

  // ── Departments ───────────────────────────────────────────────────────────
  const deptData = [
    { name: "Engineering", code: "ENG" },
    { name: "Human Resources", code: "HR" },
    { name: "Finance", code: "FIN" },
    { name: "Sales", code: "SAL" },
    { name: "Operations", code: "OPS" },
  ];

  const departments = await db
    .insert(departmentsTable)
    .values(deptData.map((d) => ({ ...d, companyId: company.id })))
    .returning();

  // ── Job Titles ────────────────────────────────────────────────────────────
  const titleData = [
    { title: "Software Engineer", level: 2 },
    { title: "Senior Software Engineer", level: 3 },
    { title: "Engineering Manager", level: 4 },
    { title: "HR Executive", level: 2 },
    { title: "HR Manager", level: 3 },
    { title: "Accountant", level: 2 },
    { title: "Finance Manager", level: 3 },
    { title: "Sales Executive", level: 2 },
    { title: "Operations Analyst", level: 2 },
  ];

  const jobTitles = await db
    .insert(jobTitlesTable)
    .values(titleData.map((t) => ({ ...t, companyId: company.id })))
    .returning();

  // ── Admin Employee record ─────────────────────────────────────────────────
  const hrDept = departments.find((d) => d.code === "HR")!;
  const hrMgrTitle = jobTitles.find((t) => t.title === "HR Manager")!;

  const [adminEmployee] = await db
    .insert(employeesTable)
    .values({
      companyId: company.id,
      userId: adminUser.id,
      employeeCode: "EMP0001",
      firstName: "Priya",
      lastName: "Sharma",
      email: "admin@acme-india.com",
      departmentId: hrDept.id,
      jobTitleId: hrMgrTitle.id,
      hireDate: "2022-04-01",
      baseSalary: "120000",
      currency: "INR",
      status: "ACTIVE",
      employmentType: "FULL_TIME",
    })
    .returning();

  // ── Sample employees ──────────────────────────────────────────────────────
  const engDept = departments.find((d) => d.code === "ENG")!;
  const seTitle = jobTitles.find((t) => t.title === "Software Engineer")!;
  const sseTitle = jobTitles.find((t) => t.title === "Senior Software Engineer")!;

  const sampleEmployees = [
    { firstName: "Rahul", lastName: "Verma", email: "rahul.v@acme-india.com", deptId: engDept.id, titleId: sseTitle.id, salary: "95000", code: "EMP0002" },
    { firstName: "Anjali", lastName: "Singh", email: "anjali.s@acme-india.com", deptId: engDept.id, titleId: seTitle.id, salary: "75000", code: "EMP0003" },
    { firstName: "Karthik", lastName: "Nair", email: "karthik.n@acme-india.com", deptId: engDept.id, titleId: seTitle.id, salary: "72000", code: "EMP0004" },
    { firstName: "Meera", lastName: "Iyer", email: "meera.i@acme-india.com", deptId: departments.find(d=>d.code==="FIN")!.id, titleId: jobTitles.find(t=>t.title==="Accountant")!.id, salary: "65000", code: "EMP0005" },
  ];

  for (const emp of sampleEmployees) {
    const hash = await bcrypt.hash("Employee@1234", 12);
    const [user] = await db.insert(usersTable).values({
      companyId: company.id,
      email: emp.email,
      passwordHash: hash,
      role: "EMPLOYEE",
      firstName: emp.firstName,
      lastName: emp.lastName,
    }).returning();

    await db.insert(employeesTable).values({
      companyId: company.id,
      userId: user.id,
      employeeCode: emp.code,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      departmentId: emp.deptId,
      jobTitleId: emp.titleId,
      managerId: adminEmployee.id,
      hireDate: "2023-07-01",
      baseSalary: emp.salary,
      currency: "INR",
      status: "ACTIVE",
      employmentType: "FULL_TIME",
    });
  }

  // ── Leave Policies ────────────────────────────────────────────────────────
  await db.insert(leavePoliciesTable).values([
    { companyId: company.id, name: "Annual Leave", type: "ANNUAL", daysPerYear: 21, carryForward: true, maxCarryForward: 5, accrualMethod: "UPFRONT" },
    { companyId: company.id, name: "Sick Leave", type: "SICK", daysPerYear: 12, carryForward: false, accrualMethod: "UPFRONT" },
    { companyId: company.id, name: "Casual Leave", type: "CASUAL", daysPerYear: 8, carryForward: false, accrualMethod: "UPFRONT" },
    { companyId: company.id, name: "Maternity Leave", type: "MATERNITY", daysPerYear: 182, carryForward: false, accrualMethod: "UPFRONT" },
    { companyId: company.id, name: "Paternity Leave", type: "PATERNITY", daysPerYear: 15, carryForward: false, accrualMethod: "UPFRONT" },
  ]);

  console.log("✅ Seed complete!");
  console.log(`Company: ${company.name} (slug: ${company.slug})`);
  console.log(`Admin login: admin@acme-india.com / Admin@1234`);
  console.log(`Employee login: rahul.v@acme-india.com / Employee@1234`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
