-- Keep existing enum values and audit history intact.
ALTER TYPE "item_status" ADD VALUE IF NOT EXISTS 'negotiating';
ALTER TYPE "item_status" ADD VALUE IF NOT EXISTS 'received';
ALTER TYPE "item_status" ADD VALUE IF NOT EXISTS 'settled';
