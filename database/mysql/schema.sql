-- FinTrack MySQL Schema
-- Run this against your MySQL 8.0+ database before setting DB_PROVIDER=mysql

CREATE DATABASE IF NOT EXISTS financetracker
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE financetracker;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NULL,
  last_name VARCHAR(100) NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  reset_token VARCHAR(255) NULL,
  reset_token_expires_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  type ENUM('income', 'expense', 'transfer') NOT NULL DEFAULT 'expense',
  amount BIGINT NOT NULL DEFAULT 0,
  transaction JSON NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_transactions_user_date (user_id, created_at DESC),
  INDEX idx_transactions_user_type (user_id, type),
  CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NULL,
  parent_id BIGINT UNSIGNED NULL DEFAULT NULL,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'expense',
  icon JSON NULL,
  monthly_budget BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_categories_user (user_id),
  INDEX idx_categories_parent (parent_id)
);

CREATE TABLE IF NOT EXISTS wallets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NULL,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'debit',
  opening_balance BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_wallets_user (user_id)
);

CREATE TABLE IF NOT EXISTS fund_goals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  name VARCHAR(150) NOT NULL,
  target_amount BIGINT NOT NULL DEFAULT 0,
  current_amount BIGINT NOT NULL DEFAULT 0,
  monthly_contribution BIGINT NOT NULL DEFAULT 0,
  target_date VARCHAR(32) NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_fund_goals_user (user_id)
);

CREATE TABLE IF NOT EXISTS recurring_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  title VARCHAR(150) NOT NULL,
  type ENUM('income', 'expense') NOT NULL DEFAULT 'expense',
  amount BIGINT NOT NULL DEFAULT 0,
  frequency VARCHAR(20) NOT NULL DEFAULT 'monthly',
  next_due_date VARCHAR(32) NOT NULL,
  category VARCHAR(150) NOT NULL DEFAULT 'Bills & Utilities',
  wallet VARCHAR(150) NOT NULL DEFAULT 'Cash',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  auto_reserve TINYINT(1) NOT NULL DEFAULT 1,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_recurring_user_due (user_id, next_due_date)
);

CREATE TABLE IF NOT EXISTS fund_plans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  monthly_income_target BIGINT NOT NULL DEFAULT 0,
  needs_percent INT NOT NULL DEFAULT 50,
  wants_percent INT NOT NULL DEFAULT 30,
  savings_percent INT NOT NULL DEFAULT 20,
  reserve_buffer BIGINT NOT NULL DEFAULT 0,
  category_buckets JSON NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

