-- Soft deletion preserves the item, images and audit history.
ALTER TYPE "item_status" ADD VALUE IF NOT EXISTS 'deleted';
