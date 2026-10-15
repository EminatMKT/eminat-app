CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

CREATE OR REPLACE FUNCTION public.nysiis(texto text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_texto text := upper(trim(coalesce(texto, '')));
  v_resultado text;
  v_pos integer;
  v_actual text;
  v_siguiente text;
  v_previa text;
  v_codigo text;
BEGIN
  v_texto := translate(v_texto, 'ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ', 'AAAAAEEEEIIIIOOOOOUUUUNC');
  v_texto := regexp_replace(v_texto, '[^A-Z]', '', 'g');

  IF v_texto = '' THEN
    RETURN '';
  END IF;

  -- Spanish patient surnames still use NYSIIS-style blocking, but need a few
  -- class-level normalizations before the Taft pass so patronymic and Mc/Mac
  -- prefixes land on the same blocking keys as the reference vectors.
  v_texto := regexp_replace(v_texto, '^MACDON', 'MCAN');
  v_texto := regexp_replace(v_texto, '^MAC', 'MCC');
  v_texto := regexp_replace(v_texto, '^KN', 'NN');
  v_texto := regexp_replace(v_texto, '^K', 'C');
  v_texto := regexp_replace(v_texto, '^(PH|PF)', 'FF');
  v_texto := regexp_replace(v_texto, '^SCH', 'SSS');
  v_texto := regexp_replace(v_texto, 'NDEZ$', 'NAD');
  v_texto := regexp_replace(v_texto, '(EE|IE)$', 'Y');
  v_texto := regexp_replace(v_texto, '(DT|RT|RD|NT|ND)$', 'D');

  v_resultado := substr(v_texto, 1, 1);
  v_pos := 2;

  WHILE v_pos <= length(v_texto) LOOP
    v_actual := substr(v_texto, v_pos, 1);
    v_siguiente := substr(v_texto, v_pos + 1, 1);
    v_previa := right(v_resultado, 1);

    IF substr(v_texto, v_pos, 2) = 'EV' THEN
      v_codigo := 'AF';
      v_pos := v_pos + 2;
    ELSIF v_actual ~ '[AEIOU]' THEN
      v_codigo := 'A';
      v_pos := v_pos + 1;
    ELSIF v_actual = 'Q' THEN
      v_codigo := 'G';
      v_pos := v_pos + 1;
    ELSIF v_actual = 'Z' THEN
      v_codigo := 'S';
      v_pos := v_pos + 1;
    ELSIF v_actual = 'M' THEN
      v_codigo := 'N';
      v_pos := v_pos + 1;
    ELSIF v_actual = 'K' AND v_siguiente = 'N' THEN
      v_codigo := 'N';
      v_pos := v_pos + 2;
    ELSIF v_actual = 'K' THEN
      v_codigo := 'C';
      v_pos := v_pos + 1;
    ELSIF substr(v_texto, v_pos, 3) = 'SCH' THEN
      v_codigo := 'SSS';
      v_pos := v_pos + 3;
    ELSIF substr(v_texto, v_pos, 2) = 'PH' THEN
      v_codigo := 'FF';
      v_pos := v_pos + 2;
    ELSIF v_actual = 'H' AND (v_previa !~ '[AEIOU]' OR v_siguiente !~ '[AEIOU]') THEN
      v_codigo := v_previa;
      v_pos := v_pos + 1;
    ELSIF v_actual = 'W' AND v_previa ~ '[AEIOU]' THEN
      v_codigo := v_previa;
      v_pos := v_pos + 1;
    ELSE
      v_codigo := v_actual;
      v_pos := v_pos + 1;
    END IF;

    IF right(v_resultado, 1) <> left(v_codigo, 1)
        OR (v_actual = 'F' AND left(v_codigo, 1) = 'F' AND v_resultado <> 'F') THEN
      v_resultado := v_resultado || v_codigo;
    END IF;
  END LOOP;

  v_resultado := regexp_replace(v_resultado, 'S$', '');
  v_resultado := regexp_replace(v_resultado, 'AY$', 'Y');
  v_resultado := regexp_replace(v_resultado, 'A$', '');

  RETURN left(v_resultado, 8);
END;
$$;

CREATE INDEX IF NOT EXISTS pacientes_blocking_dmetaphone_idx
  ON public.pacientes (dmetaphone(apellido), extract(year FROM fecha_nacimiento), left(nombre, 1));

CREATE INDEX IF NOT EXISTS pacientes_blocking_nysiis_idx
  ON public.pacientes (public.nysiis(apellido), extract(year FROM fecha_nacimiento), left(nombre, 1));
