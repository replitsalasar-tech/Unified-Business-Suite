import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  date,
  numeric,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { companiesTable } from "./companies";
import { employeesTable } from "./employees";
import { departmentsTable } from "./departments";

export const jobsTable = pgTable("jobs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  departmentId: text("department_id").references(() => departmentsTable.id),
  hiringManagerId: text("hiring_manager_id").references(() => employeesTable.id),
  description: text("description").notNull(),
  requirements: text("requirements").notNull(),
  type: text("type").notNull().default("FULL_TIME"), // FULL_TIME, PART_TIME, CONTRACT
  location: text("location"),
  salaryMin: numeric("salary_min", { precision: 15, scale: 2 }),
  salaryMax: numeric("salary_max", { precision: 15, scale: 2 }),
  isPublished: boolean("is_published").notNull().default(false),
  closingDate: date("closing_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const applicationsTable = pgTable("applications", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  jobId: text("job_id")
    .notNull()
    .references(() => jobsTable.id, { onDelete: "cascade" }),
  candidateName: text("candidate_name").notNull(),
  candidateEmail: text("candidate_email").notNull(),
  phone: text("phone"),
  resumeUrl: text("resume_url"),
  coverLetter: text("cover_letter"),
  status: text("status").notNull().default("NEW"), // NEW, SCREENING, INTERVIEW, OFFER, HIRED, REJECTED
  stage: integer("stage").notNull().default(1),
  notes: text("notes"),
  appliedAt: timestamp("applied_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const interviewsTable = pgTable("interviews", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  applicationId: text("application_id")
    .notNull()
    .references(() => applicationsTable.id, { onDelete: "cascade" }),
  scheduledAt: timestamp("scheduled_at").notNull(),
  durationMins: integer("duration_mins").notNull().default(60),
  type: text("type").notNull().default("VIDEO"), // PHONE, VIDEO, IN_PERSON, TECHNICAL
  location: text("location"),
  meetingLink: text("meeting_link"),
  feedback: text("feedback"),
  rating: integer("rating"), // 1–5
  status: text("status").notNull().default("SCHEDULED"), // SCHEDULED, COMPLETED, CANCELLED
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Job = typeof jobsTable.$inferSelect;
export type InsertJob = typeof jobsTable.$inferInsert;
export type Application = typeof applicationsTable.$inferSelect;
export type InsertApplication = typeof applicationsTable.$inferInsert;
export type Interview = typeof interviewsTable.$inferSelect;
export type InsertInterview = typeof interviewsTable.$inferInsert;
