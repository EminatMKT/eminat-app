DO $$
DECLARE
  casos text[][] := ARRAY[
    ARRAY['HERNANDEZ', 'HARNANAD'],
    ARRAY['GARCIA', 'GARC'],
    ARRAY['KNIGHT', 'NAGT'],
    ARRAY['PFEIFFER', 'FAFFAR'],
    ARRAY['MACDONALD', 'MCANALD']
  ];
  fila text[];
  obtenido text;
BEGIN
  FOREACH fila SLICE 1 IN ARRAY casos LOOP
    obtenido := public.nysiis(fila[1]);
    IF obtenido IS DISTINCT FROM fila[2] THEN
      RAISE EXCEPTION 'nysiis(%) returned % instead of %', fila[1], obtenido, fila[2];
    END IF;
  END LOOP;
END $$;
