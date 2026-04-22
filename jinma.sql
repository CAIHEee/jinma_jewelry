/*
  Jinma Jewelry System bootstrap schema
  Target: MySQL 8.x

  This bootstrap file uses the new auth/permission/community-asset schema and
  carries forward selected non-test business data from `jinma_old.sql`.
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS `jinma`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `jinma`;

DROP TABLE IF EXISTS `user_module_permissions`;
DROP TABLE IF EXISTS `asset_records`;
DROP TABLE IF EXISTS `generation_records`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `schema_migrations`;

CREATE TABLE `schema_migrations` (
  `version` varchar(64) NOT NULL,
  `applied_at` datetime(6) NOT NULL,
  PRIMARY KEY (`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` varchar(36) NOT NULL,
  `username` varchar(64) NOT NULL,
  `role` varchar(32) NOT NULL DEFAULT 'user',
  `display_name` varchar(128) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password_hash` text DEFAULT NULL,
  `is_disabled` tinyint(1) NOT NULL DEFAULT 0 COMMENT '0=enabled,1=disabled',
  `deleted_at` datetime(6) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_username` (`username`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `ix_users_deleted_at` (`deleted_at`),
  KEY `ix_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `generation_records` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `job_id` varchar(128) DEFAULT NULL,
  `kind` varchar(64) NOT NULL,
  `title` varchar(255) NOT NULL,
  `model` varchar(128) NOT NULL,
  `provider` varchar(64) NOT NULL,
  `status` varchar(64) NOT NULL,
  `prompt` longtext NOT NULL,
  `image_url` text DEFAULT NULL,
  `storage_url` text DEFAULT NULL,
  `metadata_json` longtext DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_generation_records_user_id` (`user_id`),
  KEY `ix_generation_records_job_id` (`job_id`),
  KEY `ix_generation_records_kind` (`kind`),
  KEY `ix_generation_records_model` (`model`),
  KEY `ix_generation_records_provider` (`provider`),
  KEY `ix_generation_records_status` (`status`),
  KEY `ix_generation_records_created_at` (`created_at`),
  KEY `ix_generation_records_kind_status` (`kind`,`status`),
  CONSTRAINT `fk_generation_records_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `asset_records` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) DEFAULT NULL,
  `owner_user_id` varchar(36) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `source_kind` varchar(64) NOT NULL,
  `module_kind` varchar(64) DEFAULT NULL,
  `visibility` varchar(32) NOT NULL DEFAULT 'private',
  `storage_url` text NOT NULL,
  `mime_type` varchar(128) DEFAULT NULL,
  `file_size` bigint DEFAULT NULL,
  `metadata_json` longtext DEFAULT NULL,
  `published_at` datetime(6) DEFAULT NULL,
  `published_by_user_id` varchar(36) DEFAULT NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  KEY `ix_asset_records_user_id` (`user_id`),
  KEY `ix_asset_records_owner_user_id` (`owner_user_id`),
  KEY `ix_asset_records_source_kind` (`source_kind`),
  KEY `ix_asset_records_module_kind` (`module_kind`),
  KEY `ix_asset_records_visibility` (`visibility`),
  KEY `ix_asset_records_published_by_user_id` (`published_by_user_id`),
  KEY `ix_asset_records_created_at` (`created_at`),
  KEY `ix_asset_records_owner_visibility` (`owner_user_id`,`visibility`),
  CONSTRAINT `asset_records_ibfk_legacy_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `asset_records_ibfk_owner_user` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `asset_records_ibfk_published_user` FOREIGN KEY (`published_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_module_permissions` (
  `id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `module_key` varchar(64) NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_user_module_permissions_user_module` (`user_id`,`module_key`),
  KEY `ix_user_module_permissions_user_id` (`user_id`),
  KEY `ix_user_module_permissions_module_key` (`module_key`),
  CONSTRAINT `fk_user_module_permissions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (
  `id`,
  `username`,
  `role`,
  `display_name`,
  `email`,
  `password_hash`,
  `is_disabled`,
  `created_at`,
  `updated_at`
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'root',
    'root',
    '系统管理员',
    'root@example.com',
    'pbkdf2_sha256$T8DpH0njCOv3Wqt6qb9heA==$8uws_BuR-K737PTHytCxoe7K-ncBq90cMRSEwqk2tk4=',
    0,
    '2026-04-16 15:43:47.270909',
    '2026-04-20 12:00:00.000000'
  );

INSERT INTO `user_module_permissions` (`id`, `user_id`, `module_key`, `is_enabled`)
VALUES
  ('root-t2i', '00000000-0000-0000-0000-000000000001', 'text_to_image', 1),
  ('root-fusion', '00000000-0000-0000-0000-000000000001', 'multi_image_fusion', 1),
  ('root-edit', '00000000-0000-0000-0000-000000000001', 'image_edit', 1),
  ('root-product-refine', '00000000-0000-0000-0000-000000000001', 'product_refine', 1),
  ('root-gemstone-design', '00000000-0000-0000-0000-000000000001', 'gemstone_design', 1),
  ('root-upscale', '00000000-0000-0000-0000-000000000001', 'upscale', 1),
  ('root-mview', '00000000-0000-0000-0000-000000000001', 'multi_view', 1),
  ('root-msplit', '00000000-0000-0000-0000-000000000001', 'multi_view_split', 1),
  ('root-gray', '00000000-0000-0000-0000-000000000001', 'grayscale_relief', 1),
  ('root-rmbg', '00000000-0000-0000-0000-000000000001', 'remove_background', 1),
  ('root-asset', '00000000-0000-0000-0000-000000000001', 'asset_management', 1),
  ('root-history', '00000000-0000-0000-0000-000000000001', 'history', 1);

/*
  Curated real assets migrated from jinma_old.sql.
  All are assigned to root and published into the community library.
*/
INSERT INTO `asset_records` (
  `id`,
  `user_id`,
  `owner_user_id`,
  `name`,
  `source_kind`,
  `module_kind`,
  `visibility`,
  `storage_url`,
  `mime_type`,
  `file_size`,
  `metadata_json`,
  `published_at`,
  `published_by_user_id`,
  `created_at`,
  `updated_at`
) VALUES
  (
    '7acefe39-7850-4637-ad2f-40b2553e77fe',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'gemini-3.1-flash-image-preview (nano-banana-2)_a_严格遵循输入草图的线条、比例和结构。不得 (1).png',
    'input_upload',
    'multi_view',
    'community',
    'oss://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou/assets/input/multi_view/2026/04/16/gemini-3.1-flash-image-preview__nano-banana-2__a_______________________1__4895b38e.png',
    'image/png',
    1446248,
    '{\"feature\": \"multi_view\", \"model\": \"gemini-3.1-flash-image-preview\", \"filename\": \"gemini-3.1-flash-image-preview (nano-banana-2)_a_严格遵循输入草图的线条、比例和结构。不得 (1).png\"}',
    '2026-04-16 12:54:46.000000',
    '00000000-0000-0000-0000-000000000001',
    '2026-04-16 12:54:46.000000',
    '2026-04-16 12:54:46.000000'
  ),
  (
    'ab794bbd-4c4a-4bce-a2b1-a7a33aae980e',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '28d480fba255619a37a028d2bd364bd4.jpg',
    'input_upload',
    'sketch_to_realistic',
    'community',
    'oss://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou/assets/input/sketch_to_realistic/2026/04/17/28d480fba255619a37a028d2bd364bd4_04f6c5bc.jpg',
    'image/jpeg',
    160570,
    '{\"feature\": \"sketch_to_realistic\", \"model\": \"gemini-3.1-flash-image-preview\", \"filename\": \"28d480fba255619a37a028d2bd364bd4.jpg\"}',
    '2026-04-17 12:12:26.000000',
    '00000000-0000-0000-0000-000000000001',
    '2026-04-17 12:12:26.000000',
    '2026-04-17 12:12:26.000000'
  ),
  (
    '1d8673ab-adc2-464c-acf0-19ab28c9600f',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'QQ20260417-212220.png',
    'input_upload',
    'sketch_to_realistic',
    'community',
    'oss://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou/assets/input/sketch_to_realistic/2026/04/17/QQ20260417-212220_9421d652.png',
    'image/png',
    468878,
    '{\"feature\": \"sketch_to_realistic\", \"model\": \"gemini-3.1-flash-image-preview\", \"filename\": \"QQ20260417-212220.png\"}',
    '2026-04-17 13:23:25.000000',
    '00000000-0000-0000-0000-000000000001',
    '2026-04-17 13:23:25.000000',
    '2026-04-17 13:23:25.000000'
  ),
  (
    '03b58df5-63fb-4b1c-8795-0af3356f9f66',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '1.jpg',
    'input_upload',
    'fusion',
    'community',
    'oss://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou/assets/input/fusion/2026/04/18/1_38853d2e.jpg',
    'image/jpeg',
    168957,
    '{\"feature\": \"fusion\", \"model\": \"gemini-3.1-flash-image-preview\", \"primary_image_index\": 0}',
    '2026-04-18 02:56:46.000000',
    '00000000-0000-0000-0000-000000000001',
    '2026-04-18 02:56:46.000000',
    '2026-04-18 02:56:46.000000'
  ),
  (
    '6db508c2-b97f-4a41-969f-207dcb80af9f',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '2.jpg',
    'input_upload',
    'fusion',
    'community',
    'oss://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou/assets/input/fusion/2026/04/18/2_6eb6aa3a.jpg',
    'image/jpeg',
    1779129,
    '{\"feature\": \"fusion\", \"model\": \"gemini-3.1-flash-image-preview\", \"primary_image_index\": 0}',
    '2026-04-18 02:56:47.000000',
    '00000000-0000-0000-0000-000000000001',
    '2026-04-18 02:56:47.000000',
    '2026-04-18 02:56:47.000000'
  ),
  (
    '0a50f8ea-93cc-4c06-af8f-079510d9c217',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'QQ20260417-210334.png',
    'input_upload',
    'sketch_to_realistic',
    'community',
    'oss://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou/assets/input/sketch_to_realistic/2026/04/19/QQ20260417-210334_15591d75.png',
    'image/png',
    82841,
    '{\"feature\": \"sketch_to_realistic\", \"model\": \"gemini-3.1-flash-image-preview\", \"filename\": \"QQ20260417-210334.png\"}',
    '2026-04-19 09:37:55.000000',
    '00000000-0000-0000-0000-000000000001',
    '2026-04-19 09:37:55.000000',
    '2026-04-19 09:37:55.000000'
  ),
  (
    'ca90a828-c0fc-4de7-b766-840fa82dfd28',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'QQ20260420-094903.png',
    'input_upload',
    'multi_view',
    'community',
    'oss://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou/assets/input/multi_view/2026/04/20/QQ20260420-094903_dcafbfc2.png',
    'image/png',
    351742,
    '{\"feature\": \"multi_view\", \"model\": \"gemini-3.1-flash-image-preview\", \"filename\": \"QQ20260420-094903.png\"}',
    '2026-04-20 01:51:18.000000',
    '00000000-0000-0000-0000-000000000001',
    '2026-04-20 01:51:18.000000',
    '2026-04-20 01:51:18.000000'
  );

/*
  Curated real generation history migrated from jinma_old.sql.
  All records are rebound to root to avoid anonymous legacy data.
*/
INSERT INTO `generation_records` (
  `id`,
  `user_id`,
  `job_id`,
  `kind`,
  `title`,
  `model`,
  `provider`,
  `status`,
  `prompt`,
  `image_url`,
  `storage_url`,
  `metadata_json`,
  `created_at`,
  `updated_at`
) VALUES
  (
    '9f991ef4-f124-45ad-8762-f0de86ce968b',
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'text_to_image',
    'Text-to-image: Nano Banana 2',
    'gemini-3.1-flash-image-preview',
    'gemini',
    'completed',
    '爱德华风格戒指，18K玫瑰金，心形切割红宝石作为主石，六爪镶嵌，戒臂带有莲花浮雕纹样，金属表面为缎面处理，边缘排布微镶钻石，戒肩有花丝工艺细节，高级珠宝产品渲染效果，背景干净，金属光泽真实，工艺细节清晰。',
    'https://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou.oss-cn-guangzhou.aliyuncs.com/generated%2Ftext_to_image%2Fgemini-3.1-flash-image-preview%2F2026%2F04%2F16%2F6025a47f-a088-4181-8199-a0edf1650d4e.jpg?OSSAccessKeyId=LTAI5tSZXdVgXijE7a5AnbtW&Expires=1776337492&Signature=m0%2F90%2FIJHfzikTuq4THaPQMsd1M%3D',
    'oss://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou/generated/text_to_image/gemini-3.1-flash-image-preview/2026/04/16/6025a47f-a088-4181-8199-a0edf1650d4e.jpg',
    '{\"image_size\": \"1K\", \"object_key\": \"generated/text_to_image/gemini-3.1-flash-image-preview/2026/04/16/6025a47f-a088-4181-8199-a0edf1650d4e.jpg\", \"aspect_ratio\": \"1:1\", \"storage_provider\": \"aliyun\", \"upstream_platform\": \"apiyi\"}',
    '2026-04-16 10:04:52.433151',
    '2026-04-16 10:04:52.433151'
  ),
  (
    'd7ee8fff-1197-49bb-9e53-282cc6fe1527',
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'multi_view',
    'Multi-view: Nano Banana 2',
    'gemini-3.1-flash-image-preview',
    'gemini',
    'completed',
    '基于参考图生成四个标准视角：正视、左视、右视、背视。保持各视图在结构、材质、工艺与比例上完全统一，以干净的 2x2 布局呈现，背景为纯白哑光，棚拍光线，细节清晰，不允许出现任何支撑结构。',
    'https://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou.oss-cn-guangzhou.aliyuncs.com/generated%2Fmulti_view%2Fgemini-3.1-flash-image-preview%2F2026%2F04%2F16%2F7c38fc6c-827b-4145-9833-d75af0051476.jpg?OSSAccessKeyId=LTAI5tSZXdVgXijE7a5AnbtW&Expires=1776347715&Signature=azF063no4yGnX7Tc%2FPtEBQnxjYA%3D',
    'oss://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou/generated/multi_view/gemini-3.1-flash-image-preview/2026/04/16/7c38fc6c-827b-4145-9833-d75af0051476.jpg',
    '{\"feature\": \"multi_view\", \"strength\": 0.75, \"object_key\": \"generated/multi_view/gemini-3.1-flash-image-preview/2026/04/16/7c38fc6c-827b-4145-9833-d75af0051476.jpg\", \"negative_prompt\": null, \"source_filename\": \"gemini-3.1-flash-image-preview (nano-banana-2)_a_严格遵循输入草图的线条、比例和结构。不得 (1).png\", \"storage_provider\": \"aliyun\", \"upstream_platform\": \"apiyi\"}',
    '2026-04-16 12:55:15.411661',
    '2026-04-16 12:55:15.411661'
  ),
  (
    '9262c965-8250-4156-8597-599458477656',
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'text_to_image',
    'Text-to-image: Nano Banana 2',
    'gemini-3.1-flash-image-preview',
    'gemini',
    'completed',
    '做一个镶金边的翡翠戒指，冰种，微裂，缅甸矿',
    'https://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou.oss-cn-guangzhou.aliyuncs.com/generated%2Ftext_to_image%2Fgemini-3.1-flash-image-preview%2F2026%2F04%2F17%2Ff4f8116f-8cc1-4a18-9031-8779287a901c.jpg?OSSAccessKeyId=LTAI5tSZXdVgXijE7a5AnbtW&Expires=1776428086&Signature=OcQcekvT%2Bfwet5xsT0YuMM09phQ%3D',
    'oss://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou/generated/text_to_image/gemini-3.1-flash-image-preview/2026/04/17/f4f8116f-8cc1-4a18-9031-8779287a901c.jpg',
    '{\"image_size\": \"1K\", \"object_key\": \"generated/text_to_image/gemini-3.1-flash-image-preview/2026/04/17/f4f8116f-8cc1-4a18-9031-8779287a901c.jpg\", \"aspect_ratio\": \"1:1\", \"storage_provider\": \"aliyun\", \"upstream_platform\": \"apiyi\"}',
    '2026-04-17 11:14:46.175082',
    '2026-04-17 11:14:46.175082'
  ),
  (
    '7cd2e29e-b7a4-47ba-abaf-b3659aa39529',
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'sketch_to_realistic',
    'Sketch to realistic: Nano Banana 2',
    'gemini-3.1-flash-image-preview',
    'gemini',
    'completed',
    '将这张珠宝线稿转换为写实高级珠宝产品图。保留原始轮廓、宝石位置、镶口结构和设计比例，加入抛光贵金属、真实宝石材质、柔和棚拍光线、干净背景和高级商业摄影质感。',
    'https://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou.oss-cn-guangzhou.aliyuncs.com/generated%2Fsketch_to_realistic%2Fgemini-3.1-flash-image-preview%2F2026%2F04%2F17%2F198285f4-2cd4-4e5e-ba8e-79be2fbbed23.jpg?OSSAccessKeyId=LTAI5tSZXdVgXijE7a5AnbtW&Expires=1776431569&Signature=WmOZ3WFbHVduEDv%2Bs2A4FnEazKE%3D',
    'oss://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou/generated/sketch_to_realistic/gemini-3.1-flash-image-preview/2026/04/17/198285f4-2cd4-4e5e-ba8e-79be2fbbed23.jpg',
    '{\"feature\": \"sketch_to_realistic\", \"strength\": 0.75, \"object_key\": \"generated/sketch_to_realistic/gemini-3.1-flash-image-preview/2026/04/17/198285f4-2cd4-4e5e-ba8e-79be2fbbed23.jpg\", \"negative_prompt\": null, \"source_filename\": \"28d480fba255619a37a028d2bd364bd4.jpg\", \"storage_provider\": \"aliyun\", \"upstream_platform\": \"apiyi\"}',
    '2026-04-17 12:12:49.323723',
    '2026-04-17 12:12:49.323723'
  ),
  (
    '1ddb123f-644f-43a5-8eb9-58595e2d4ce9',
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'sketch_to_realistic',
    'Sketch to realistic: Nano Banana 2',
    'gemini-3.1-flash-image-preview',
    'gemini',
    'completed',
    '将这张珠宝线稿转换为写实高级珠宝产品图。保留原始轮廓、宝石位置、镶口结构和设计比例，加入抛光贵金属、真实宝石材质、柔和棚拍光线、干净背景和高级商业摄影质感。',
    'https://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou.oss-cn-guangzhou.aliyuncs.com/generated%2Fsketch_to_realistic%2Fgemini-3.1-flash-image-preview%2F2026%2F04%2F17%2F86acf6b0-51a8-415b-aaed-71cb139ec7f4.jpg?OSSAccessKeyId=LTAI5tSZXdVgXijE7a5AnbtW&Expires=1776434719&Signature=ZREjQ%2FfvvnjgkICKJ1zjqENRkdA%3D',
    'oss://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou/generated/sketch_to_realistic/gemini-3.1-flash-image-preview/2026/04/17/86acf6b0-51a8-415b-aaed-71cb139ec7f4.jpg',
    '{\"feature\": \"sketch_to_realistic\", \"strength\": 0.75, \"object_key\": \"generated/sketch_to_realistic/gemini-3.1-flash-image-preview/2026/04/17/86acf6b0-51a8-415b-aaed-71cb139ec7f4.jpg\", \"negative_prompt\": null, \"source_filename\": \"QQ20260417-210334.png\", \"storage_provider\": \"aliyun\", \"upstream_platform\": \"apiyi\"}',
    '2026-04-17 13:05:19.772231',
    '2026-04-17 13:05:19.772231'
  ),
  (
    '72b2fa29-662d-455a-81ba-832509d142f2',
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'sketch_to_realistic',
    'Sketch to realistic: Nano Banana 2',
    'gemini-3.1-flash-image-preview',
    'gemini',
    'completed',
    '将这张珠宝线稿转换为写实高级珠宝产品图。保留原始轮廓、宝石位置、镶口结构和设计比例，加入抛光贵金属、真实宝石材质、柔和棚拍光线、干净背景和高级商业摄影质感。',
    'https://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou.oss-cn-guangzhou.aliyuncs.com/generated%2Fsketch_to_realistic%2Fgemini-3.1-flash-image-preview%2F2026%2F04%2F17%2F24cfdec3-333a-416a-b119-1e4225e6cd74.jpg?OSSAccessKeyId=LTAI5tSZXdVgXijE7a5AnbtW&Expires=1776435829&Signature=Idj4Lc05gqSNtWuFIPvbU%2FOsWSQ%3D',
    'oss://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou/generated/sketch_to_realistic/gemini-3.1-flash-image-preview/2026/04/17/24cfdec3-333a-416a-b119-1e4225e6cd74.jpg',
    '{\"feature\": \"sketch_to_realistic\", \"strength\": 0.75, \"object_key\": \"generated/sketch_to_realistic/gemini-3.1-flash-image-preview/2026/04/17/24cfdec3-333a-416a-b119-1e4225e6cd74.jpg\", \"negative_prompt\": null, \"source_filename\": \"QQ20260417-212220.png\", \"storage_provider\": \"aliyun\", \"upstream_platform\": \"apiyi\"}',
    '2026-04-17 13:23:49.388592',
    '2026-04-17 13:23:49.388592'
  ),
  (
    '578e6e42-4075-4cb8-baf1-27c9b23a8e99',
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'fusion',
    'Fusion: Nano Banana 2',
    'gemini-3.1-flash-image-preview',
    'gemini',
    'completed',
    '把主图中间的玉石换成另一张参考图的玉石，主图的外框需要贴合另一张参考图的玉石轮廓，无缝贴合',
    'https://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou.oss-cn-guangzhou.aliyuncs.com/generated%2Ffusion%2Fgemini-3.1-flash-image-preview%2F2026%2F04%2F18%2F5500cd3c-01f6-425d-99f3-12e81f512e0a.jpg?OSSAccessKeyId=LTAI5tSZXdVgXijE7a5AnbtW&Expires=1776484623&Signature=xWfZupFKXwfIdq4jXgl5Q4lBTsc%3D',
    'oss://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou/generated/fusion/gemini-3.1-flash-image-preview/2026/04/18/5500cd3c-01f6-425d-99f3-12e81f512e0a.jpg',
    '{\"mode\": \"balanced\", \"strength\": 0.75, \"filenames\": [\"1.jpg\", \"2.jpg\"], \"object_key\": \"generated/fusion/gemini-3.1-flash-image-preview/2026/04/18/5500cd3c-01f6-425d-99f3-12e81f512e0a.jpg\", \"image_count\": 2, \"negative_prompt\": null, \"storage_provider\": \"aliyun\", \"upstream_platform\": \"apiyi\", \"primary_image_index\": 0}',
    '2026-04-18 02:57:03.333477',
    '2026-04-18 02:57:03.333477'
  ),
  (
    '3ce762e1-0b8f-4805-9747-51f8d9e56314',
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'multi_view',
    'Multi-view: Nano Banana 2',
    'gemini-3.1-flash-image-preview',
    'gemini',
    'completed',
    '基于参考图生成四个标准视角：正视、左视、右视、背视。保持各视图在结构、材质、工艺与比例上完全统一，以干净的 2x2 布局呈现，背景为纯白哑光，棚拍光线，细节清晰，不允许出现任何支撑结构。',
    '/api/v1/assets/content?storage_url=oss%3A%2F%2Foss-pai-r7x5470twdp2bxpuzk-cn-guangzhou%2Fgenerated%2Fmulti_view%2Fgemini-3.1-flash-image-preview%2F2026%2F04%2F20%2F72249df1-10f1-4ac2-880d-6dc71b625245.jpg',
    'oss://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou/generated/multi_view/gemini-3.1-flash-image-preview/2026/04/20/72249df1-10f1-4ac2-880d-6dc71b625245.jpg',
    '{\"feature\": \"multi_view\", \"strength\": 0.75, \"object_key\": \"generated/multi_view/gemini-3.1-flash-image-preview/2026/04/20/72249df1-10f1-4ac2-880d-6dc71b625245.jpg\", \"negative_prompt\": null, \"source_filename\": \"QQ20260420-094903.png\", \"source_image_url\": \"/api/v1/assets/content?storage_url=oss%3A%2F%2Foss-pai-r7x5470twdp2bxpuzk-cn-guangzhou%2Fassets%2Finput%2Fmulti_view%2F2026%2F04%2F20%2FQQ20260420-094903_dcafbfc2.png&filename=QQ20260420-094903.png\", \"storage_provider\": \"aliyun\", \"upstream_platform\": \"apiyi\", \"source_image_storage_url\": \"oss://oss-pai-r7x5470twdp2bxpuzk-cn-guangzhou/assets/input/multi_view/2026/04/20/QQ20260420-094903_dcafbfc2.png\"}',
    '2026-04-20 01:51:39.886494',
    '2026-04-20 01:51:39.886494'
  );

INSERT INTO `schema_migrations` (`version`, `applied_at`)
VALUES
  ('20260420_auth_assets', CURRENT_TIMESTAMP(6)),
  ('20260422_user_soft_delete', CURRENT_TIMESTAMP(6));

SET FOREIGN_KEY_CHECKS = 1;
