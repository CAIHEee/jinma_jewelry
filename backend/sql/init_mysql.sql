CREATE DATABASE IF NOT EXISTS `jinma`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `jinma`;

CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) NOT NULL,
  `username` VARCHAR(64) NOT NULL,
  `display_name` VARCHAR(128) DEFAULT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `password_hash` TEXT DEFAULT NULL,
  `is_disabled` TINYINT NOT NULL DEFAULT 0 COMMENT '0=enabled,1=disabled',
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_username` (`username`),
  UNIQUE KEY `uk_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `generation_records` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) DEFAULT NULL,
  `job_id` VARCHAR(128) DEFAULT NULL,
  `kind` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `model` VARCHAR(128) NOT NULL,
  `provider` VARCHAR(64) NOT NULL,
  `status` VARCHAR(64) NOT NULL,
  `prompt` LONGTEXT NOT NULL,
  `image_url` TEXT DEFAULT NULL,
  `storage_url` TEXT DEFAULT NULL,
  `metadata_json` JSON DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_generation_records_user_id` (`user_id`),
  KEY `ix_generation_records_job_id` (`job_id`),
  KEY `ix_generation_records_kind` (`kind`),
  KEY `ix_generation_records_model` (`model`),
  KEY `ix_generation_records_provider` (`provider`),
  KEY `ix_generation_records_status` (`status`),
  KEY `ix_generation_records_created_at` (`created_at`),
  KEY `ix_generation_records_kind_status` (`kind`, `status`),
  CONSTRAINT `fk_generation_records_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `asset_records` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `source_kind` VARCHAR(64) NOT NULL,
  `module_kind` VARCHAR(64) DEFAULT NULL,
  `storage_url` TEXT NOT NULL,
  `mime_type` VARCHAR(128) DEFAULT NULL,
  `file_size` BIGINT DEFAULT NULL,
  `metadata_json` JSON DEFAULT NULL,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_asset_records_user_id` (`user_id`),
  KEY `ix_asset_records_source_kind` (`source_kind`),
  KEY `ix_asset_records_module_kind` (`module_kind`),
  KEY `ix_asset_records_created_at` (`created_at`),
  CONSTRAINT `fk_asset_records_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `username`, `display_name`, `email`, `password_hash`, `is_disabled`)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'admin',
  '系统管理员',
  'admin@example.com',
  NULL,
  0
WHERE NOT EXISTS (
  SELECT 1 FROM `users` WHERE `username` = 'admin'
);
