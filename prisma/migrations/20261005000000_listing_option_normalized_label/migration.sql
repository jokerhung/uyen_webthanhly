-- Audit all kinds, active and inactive, before imposing uniqueness. Never merge referenced options.
CREATE OR REPLACE FUNCTION listing_option_normalized_label(raw_label text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT lower(normalize(regexp_replace(btrim(raw_label), '[[:space:] ]+', ' ', 'g'), NFC));
$$;
DO $$
DECLARE duplicates text;
BEGIN
  SELECT string_agg(records, '; ' ORDER BY records) INTO duplicates FROM (
    SELECT kind || ': ' || string_agg(id || ' (' || label || ')', ', ' ORDER BY id) AS records
    FROM listing_options GROUP BY kind, listing_option_normalized_label(label) HAVING count(*) > 1
  ) collisions;
  IF duplicates IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate normalized listing options: %. Resolve labels manually before migration; no items have been reassigned.', duplicates;
  END IF;
END $$;
ALTER TABLE listing_options ADD COLUMN normalized_label VARCHAR(100);
UPDATE listing_options SET normalized_label = listing_option_normalized_label(label);
ALTER TABLE listing_options ALTER COLUMN normalized_label SET NOT NULL;
ALTER TABLE listing_options ADD CONSTRAINT listing_options_normalized_label_matches_check CHECK (normalized_label = listing_option_normalized_label(label));
CREATE UNIQUE INDEX listing_options_kind_normalized_label_key ON listing_options(kind, normalized_label);
