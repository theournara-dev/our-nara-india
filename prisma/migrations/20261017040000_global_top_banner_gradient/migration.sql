-- The client's top banner for the International store: red → blue → purple,
-- left to right (0% #F83658, 50% #0894FD, 100% #7920FB). Only the first block is
-- rewritten — the rest of the admin's blocks stay as they are — and only when it
-- does not already carry a gradient, so a later apply cannot undo an edit.
-- (The JSON column keeps its Prisma name, `topBanner`.)

UPDATE "site_configs"
SET "topBanner" = jsonb_set(
      jsonb_set(
        "topBanner",
        '{0,backgroundType}',
        '"gradient"'::jsonb,
        true
      ),
      '{0,gradientStops}',
      '[{"color":"#F83658","position":0},{"color":"#0894FD","position":50},{"color":"#7920FB","position":100}]'::jsonb,
      true
    )
WHERE "version" = 'global'
  AND jsonb_typeof("topBanner") = 'array'
  AND jsonb_array_length("topBanner") > 0
  AND COALESCE("topBanner"->0->>'backgroundType', 'solid') <> 'gradient';
