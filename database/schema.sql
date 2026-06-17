CREATE DATABASE IF NOT EXISTS retail_inventory
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE retail_inventory;

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('Super Admin', 'Employee') NOT NULL DEFAULT 'Employee',
  status ENUM('Aktif', 'Nonaktif') NOT NULL DEFAULT 'Aktif',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE suppliers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(40) NULL,
  address TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE products (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_id BIGINT UNSIGNED NULL,
  category VARCHAR(120) NOT NULL,
  name VARCHAR(180) NOT NULL,
  unit ENUM('sak', 'karton/dus', 'jligen', 'kg', 'liter', 'pcs') NOT NULL DEFAULT 'pcs',
  unit_content DECIMAL(14,2) NOT NULL DEFAULT 1,
  base_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  base_price_ecer DECIMAL(14,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(14,2) GENERATED ALWAYS AS (
    CASE
      WHEN unit_content > 0 THEN base_price / unit_content
      ELSE 0
    END
  ) STORED,
  sale_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  profit_per_unit DECIMAL(14,2) GENERATED ALWAYS AS (sale_price - cost_price) STORED,
  stock DECIMAL(14,2) NOT NULL DEFAULT 0,
  photo_path VARCHAR(255) NULL,
  barcode VARCHAR(120) NULL,
  qr_code VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_products_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  INDEX idx_products_category (category),
  INDEX idx_products_name (name)
) ENGINE=InnoDB;

CREATE TABLE purchases (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  supplier_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  invoice_number VARCHAR(120) NULL,
  invoice_photo_path VARCHAR(255) NULL,
  total DECIMAL(14,2) NOT NULL DEFAULT 0,
  purchased_at DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_purchases_supplier
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_purchases_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  INDEX idx_purchases_date (purchased_at)
) ENGINE=InnoDB;

CREATE TABLE purchase_details (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  purchase_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  quantity DECIMAL(14,2) NOT NULL,
  unit_price DECIMAL(14,2) NOT NULL,
  subtotal DECIMAL(14,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_purchase_details_purchase
    FOREIGN KEY (purchase_id) REFERENCES purchases(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_purchase_details_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE price_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  purchase_id BIGINT UNSIGNED NULL,
  base_price DECIMAL(14,2) NOT NULL,
  unit_content DECIMAL(14,2) NOT NULL DEFAULT 1,
  cost_price DECIMAL(14,2) GENERATED ALWAYS AS (
    CASE
      WHEN unit_content > 0 THEN base_price / unit_content
      ELSE 0
    END
  ) STORED,
  sale_price DECIMAL(14,2) NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_price_history_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT fk_price_history_purchase
    FOREIGN KEY (purchase_id) REFERENCES purchases(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  INDEX idx_price_history_product_date (product_id, recorded_at)
) ENGINE=InnoDB;

CREATE TABLE repacking (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  source_product_id BIGINT UNSIGNED NOT NULL,
  target_product_id BIGINT UNSIGNED NULL,
  gross_weight DECIMAL(14,2) NOT NULL,
  shrinkage DECIMAL(14,2) NOT NULL DEFAULT 0,
  net_weight DECIMAL(14,2) GENERATED ALWAYS AS (gross_weight - shrinkage) STORED,
  base_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  cost_per_unit DECIMAL(14,2) GENERATED ALWAYS AS (
    CASE
      WHEN gross_weight - shrinkage > 0 THEN base_price / (gross_weight - shrinkage)
      ELSE 0
    END
  ) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_repacking_source_product
    FOREIGN KEY (source_product_id) REFERENCES products(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT fk_repacking_target_product
    FOREIGN KEY (target_product_id) REFERENCES products(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE sales (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  sold_at DATE NOT NULL,
  unit_sold DECIMAL(14,2) NOT NULL DEFAULT 0,
  unit_content DECIMAL(14,2) NOT NULL DEFAULT 1,
  quantity_sold DECIMAL(14,2) GENERATED ALWAYS AS (unit_sold * unit_content) STORED,
  cost_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  profit_per_unit DECIMAL(14,2) GENERATED ALWAYS AS (sale_price - cost_price) STORED,
  profit DECIMAL(14,2) GENERATED ALWAYS AS ((unit_sold * unit_content) * (sale_price - cost_price)) STORED,
  notes TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sales_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT fk_sales_product
    FOREIGN KEY (product_id) REFERENCES products(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  INDEX idx_sales_sold_at (sold_at),
  INDEX idx_sales_product_date (product_id, sold_at)
) ENGINE=InnoDB;

CREATE TABLE activity_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NULL,
  activity VARCHAR(255) NOT NULL,
  detail TEXT NULL,
  ip_address VARCHAR(45) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_activity_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  INDEX idx_activity_logs_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE app_settings (
  setting_key VARCHAR(80) PRIMARY KEY,
  setting_value TEXT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
