import {
  pgTable,
  text,
  timestamp,
  numeric,
  boolean,
  pgEnum,
  date,
  jsonb,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { companiesTable } from "./companies";
import { employeesTable } from "./employees";

export const performanceRatingEnum = pgEnum("performance_rating", [
  "OUTSTANDING",
  "EXCEEDS_EXPECTATIONS",
  "MEETS_EXPECTATIONS",
  "BELOW_EXPECTATIONS",
  "UNSATISFACTORY",
]);

export const reviewCyclesTable = pgTable("review_cycles", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // "Q1 2025 Performance Review"
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const performanceReviewsTable = pgTable("performance_reviews", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  companyId: text("company_id")
    .notNull()
    .references(() => companiesTable.id, { onDelete: "cascade" }),
  cycleId: text("cycle_id")
    .notNull()
    .references(() => reviewCyclesTable.id, { onDelete: "cascade" }),
  employeeId: text("employee_id")
    .notNull()
    .references(() => employeesTable.id),
  reviewerId: text("reviewer_id")
    .notNull()
    .references(() => employeesTable.id),
  rating: performanceRatingEnum("rating"),
  score: numeric("score", { precision: 4, scale: 2 }), // 0–100
  goals: jsonb("goals"), // [{goal, weight, score}]
  strengths: text("strengths"),
  improvements: text("improvements"),
  comments: text("comments"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ReviewCycle = typeof reviewCyclesTable.$inferSelect;
export type InsertReviewCycle = typeof reviewCyclesTable.$inferInsert;
export type PerformanceReview = typeof performanceReviewsTable.$inferSelect;
export type InsertPerformanceReview = typeof performanceReviewsTable.$inferInsert;
