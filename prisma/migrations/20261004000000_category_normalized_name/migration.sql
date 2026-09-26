-- Keep distinct Vietnamese accents; NFC + collapsed Unicode whitespace + lowercase.
-- Fail with the offending records before adding uniqueness; NEVER merge categories/items automatically.
CREATE OR REPLACE FUNCTION item_category_normalized_name(raw_name text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT lower(normalize(regexp_replace(btrim(raw_name), '[[:space:] ]+', ' ', 'g'), NFC));
$$;
DO $$
DECLARE duplicates text;
BEGIN
  SELECT string_agg(records, '; ' ORDER BY records) INTO duplicates FROM (
    SELECT string_agg(slug || ' (' || name || ')', ', ' ORDER BY slug) AS records
    FROM item_categories GROUP BY item_category_normalized_name(name) HAVING count(*) > 1
  ) collisions;
  IF duplicates IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate normalized item categories: %. Resolve names manually before migration; no items have been reassigned.', duplicates;
  END IF;
END $$;
ALTER TABLE item_categories ADD COLUMN normalized_name VARCHAR(100);
UPDATE item_categories SET normalized_name = item_category_normalized_name(name);
ALTER TABLE item_categories ALTER COLUMN normalized_name SET NOT NULL;
ALTER TABLE item_categories ADD CONSTRAINT item_categories_normalized_name_matches_check CHECK (normalized_name = item_category_normalized_name(name));
CREATE UNIQUE INDEX item_categories_normalized_name_key ON item_categories(normalized_name);
