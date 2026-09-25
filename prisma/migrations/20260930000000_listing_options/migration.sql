CREATE TABLE "listing_options" (
  "id" VARCHAR(100) PRIMARY KEY,
  "kind" VARCHAR(20) NOT NULL CHECK ("kind" IN ('season','material','size','brand','price')),
  "label" VARCHAR(100) NOT NULL,
  "amount" DECIMAL(14,0),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  CHECK (("kind" = 'price' AND "amount" IS NOT NULL AND "amount" > 0) OR ("kind" <> 'price' AND "amount" IS NULL))
);
CREATE INDEX "listing_options_kind_active_sort_order_idx" ON "listing_options" ("kind","active","sort_order");
ALTER TABLE "items" ADD COLUMN "season_id" VARCHAR(100) REFERENCES "listing_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "items" ADD COLUMN "material_id" VARCHAR(100) REFERENCES "listing_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "items" ADD COLUMN "size_id" VARCHAR(100) REFERENCES "listing_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "items" ADD COLUMN "brand_id" VARCHAR(100) REFERENCES "listing_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "items" ADD COLUMN "price_option_id" VARCHAR(100) REFERENCES "listing_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('season-summer','season','Hè',0);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('season-winter','season','Đông',1);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('material-cotton','material','Cotton',0);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('material-linen','material','Linen',1);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('material-denim','material','Denim',2);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('material-wool','material','Len',3);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('material-silk','material','Lụa',4);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('material-polyester','material','Polyester',5);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('material-leather','material','Da',6);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('material-blend','material','Vải pha',7);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('size-xs','size','XS',0);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('size-s','size','S',1);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('size-m','size','M',2);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('size-l','size','L',3);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('size-xl','size','XL',4);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('size-xxl','size','XXL',5);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('size-free','size','Freesize',6);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('brand-no-brand','brand','Không thương hiệu',0);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('brand-zara','brand','Zara',1);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('brand-hm','brand','H&M',2);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('brand-uniqlo','brand','Uniqlo',3);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('brand-mango','brand','Mango',4);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('brand-nike','brand','Nike',5);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('brand-adidas','brand','Adidas',6);
INSERT INTO "listing_options" ("id","kind","label","sort_order") VALUES ('brand-other','brand','Khác',7);
INSERT INTO "listing_options" ("id","kind","label","amount","sort_order") VALUES ('price-30000','price','30.000 ₫',30000,0);
INSERT INTO "listing_options" ("id","kind","label","amount","sort_order") VALUES ('price-50000','price','50.000 ₫',50000,1);
INSERT INTO "listing_options" ("id","kind","label","amount","sort_order") VALUES ('price-70000','price','70.000 ₫',70000,2);
INSERT INTO "listing_options" ("id","kind","label","amount","sort_order") VALUES ('price-90000','price','90.000 ₫',90000,3);
INSERT INTO "listing_options" ("id","kind","label","amount","sort_order") VALUES ('price-100000','price','100.000 ₫',100000,4);
INSERT INTO "listing_options" ("id","kind","label","amount","sort_order") VALUES ('price-120000','price','120.000 ₫',120000,5);
INSERT INTO "listing_options" ("id","kind","label","amount","sort_order") VALUES ('price-150000','price','150.000 ₫',150000,6);
INSERT INTO "listing_options" ("id","kind","label","amount","sort_order") VALUES ('price-180000','price','180.000 ₫',180000,7);
INSERT INTO "listing_options" ("id","kind","label","amount","sort_order") VALUES ('price-200000','price','200.000 ₫',200000,8);
INSERT INTO "listing_options" ("id","kind","label","amount","sort_order") VALUES ('price-250000','price','250.000 ₫',250000,9);
INSERT INTO "listing_options" ("id","kind","label","amount","sort_order") VALUES ('price-300000','price','300.000 ₫',300000,10);
INSERT INTO "listing_options" ("id","kind","label","amount","sort_order") VALUES ('price-350000','price','350.000 ₫',350000,11);
INSERT INTO "listing_options" ("id","kind","label","amount","sort_order") VALUES ('price-400000','price','400.000 ₫',400000,12);
INSERT INTO "listing_options" ("id","kind","label","amount","sort_order") VALUES ('price-500000','price','500.000 ₫',500000,13);
INSERT INTO "listing_options" ("id","kind","label","amount","sort_order") VALUES ('price-700000','price','700.000 ₫',700000,14);
INSERT INTO "listing_options" ("id","kind","label","amount","sort_order") VALUES ('price-1000000','price','1.000.000 ₫',1000000,15);
INSERT INTO "listing_options" ("id","kind","label","amount","sort_order") VALUES ('price-1500000','price','1.500.000 ₫',1500000,16);
INSERT INTO "listing_options" ("id","kind","label","amount","sort_order") VALUES ('price-2000000','price','2.000.000 ₫',2000000,17);
