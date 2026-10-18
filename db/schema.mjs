import {sqliteTable,text,integer,primaryKey} from 'drizzle-orm/sqlite-core';
export const quizzes=sqliteTable('quizzes',{id:text().primaryKey(),topic_key:text().notNull().unique(),spec:text().notNull(),created_at:integer().notNull()});
export const research=sqliteTable('research_v2',{conversation_id:text().primaryKey(),session_id:text().notNull(),content:text().notNull(),updated_at:integer().notNull()});
export const completions=sqliteTable('completions',{session_id:text().notNull(),quiz_id:text().notNull(),version:text().notNull(),completed_at:integer().notNull()},t=>[primaryKey({columns:[t.session_id,t.quiz_id,t.version]})]);
export const feedback=sqliteTable('feedback',{session_id:text().notNull(),quiz_id:text().notNull(),value:text().notNull(),updated_at:integer().notNull()},t=>[primaryKey({columns:[t.session_id,t.quiz_id]})]);
export const starts=sqliteTable('attempt_starts',{session_id:text().notNull(),quiz_id:text().notNull(),version:text().notNull(),started_at:integer().notNull()},t=>[primaryKey({columns:[t.session_id,t.quiz_id,t.version]})]);
export const comparisons=sqliteTable('comparison_rooms',{token:text().primaryKey(),creator_id:text().notNull(),guest_id:text(),snapshot:text().notNull(),creator_result:text().notNull(),guest_result:text(),created_at:integer().notNull(),expires_at:integer().notNull(),revoked:integer().notNull().default(0)});
export const conversations=sqliteTable('conversation_state',{id:text().primaryKey(),owner:text().notNull(),content:text().notNull(),expires_at:integer().notNull()});
export const budget=sqliteTable('ai_budget',{key:text().primaryKey(),calls:integer().notNull().default(0)});
