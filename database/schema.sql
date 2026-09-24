CREATE DATABASE IF NOT EXISTS dbBelt DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dbBelt;

DROP TABLE IF EXISTS promo_compatible_tariffs;
DROP TABLE IF EXISTS promotion_categories;
DROP TABLE IF EXISTS promotions;
DROP TABLE IF EXISTS tarifs;
DROP TABLE IF EXISTS categories;

CREATE TABLE categories (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_type ENUM('b2c', 'b2b') NOT NULL,
  code VARCHAR(45) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE tarifs (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id TINYINT UNSIGNED NOT NULL,
  code VARCHAR(45) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  base_price DECIMAL(8,2) UNSIGNED NULL,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT NULL,
  CONSTRAINT fk_tarifs_categories FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE promotions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_type ENUM('b2c', 'b2b') NOT NULL,
  number_code VARCHAR(35) NOT NULL,
  name VARCHAR(250) NOT NULL,
  description TEXT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  min_years TINYINT UNSIGNED NULL DEFAULT 0,
  allowed_conditions TEXT NULL,
  restricted_conditions TEXT NULL,
  legal_obligations TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_new_client BOOLEAN NULL COMMENT '1 — только новый, 0 — только действующий, NULL — новый и действующий',
  is_retention_only BOOLEAN NOT NULL DEFAULT FALSE,
  discount_percent DECIMAL(5,2) UNSIGNED NULL,
  duration_months TINYINT UNSIGNED NULL,
  discount_schedule TEXT NULL,
  UNIQUE KEY number_code_by_client (client_type, number_code)
) ENGINE=InnoDB;

CREATE TABLE promotion_categories (
  promotion_id INT UNSIGNED NOT NULL,
  category_id TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (promotion_id, category_id),
  FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE promo_compatible_tariffs (
  promotions_id INT UNSIGNED NOT NULL,
  tarifs_id SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (promotions_id, tarifs_id),
  FOREIGN KEY (promotions_id) REFERENCES promotions(id) ON UPDATE CASCADE ON DELETE CASCADE,
  FOREIGN KEY (tarifs_id) REFERENCES tarifs(id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;
