ALTER TABLE "listing_options" DROP CONSTRAINT "listing_options_kind_check";
ALTER TABLE "listing_options" ADD CONSTRAINT "listing_options_kind_check"
  CHECK ("kind" IN ('season','gender','material','size','brand','price'));
ALTER TABLE "items" ADD COLUMN "gender_id" VARCHAR(100)
  REFERENCES "listing_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES
  ('gender-male','gender','Nam',0),
  ('gender-female','gender','Nữ',1),
  ('gender-unisex','gender','Unisex',2);
