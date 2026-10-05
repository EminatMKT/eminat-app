#!/usr/bin/env perl
# The pattern that broke PR #86/#87/#89 three times: a migration drops a column from a table,
# and a later migration still fires a trigger with `UPDATE OF that_column ON that_table`.
# Scoped to `CREATE TRIGGER ... UPDATE OF <cols> ON <table>` on purpose: table and column come
# from the SAME statement, so there's no need to infer which table a loose `NEW.col`/`OLD.col`
# inside a function body belongs to — that gives false positives across tables that share a
# column name (e.g. `actividades.empresa` vs `usuarios.empresa`). Check 1 (apply against a real
# Postgres) is the full safety net; this is the fast signal for the one pattern that actually
# recurred.
use strict;
use warnings;

my %dropped;  # "table\x1ccolumn" => file that dropped it
my $fail = 0;

for my $file (@ARGV) {
  open my $fh, '<', $file or die "$file: $!";
  local $/;
  my $sql = <$fh>;
  close $fh;
  $sql =~ s/--[^\n]*//g;  # strip line comments before matching anything

  while ($sql =~ /alter\s+table\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+drop\s+column(?:\s+if\s+exists)?\s+"?([a-z_][a-z0-9_]*)"?/gi) {
    $dropped{lc($1) . "\x1c" . lc($2)} //= $file;
  }

  while ($sql =~ /create\s+trigger\s+\S+\s+(?:before|after)\s+(?:insert\s+or\s+)?update\s+of\s+([a-z0-9_,\s]+?)\s+on\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi) {
    my ($cols, $table) = ($1, $2);
    for my $col (split /\s*,\s*/, $cols) {
      my $key = lc($table) . "\x1c" . lc($col);
      if (exists $dropped{$key}) {
        print "✖ columna-borrada-en-trigger: $file fires UPDATE OF $col ON $table, but $dropped{$key} already dropped it from that table\n";
        $fail = 1;
      }
    }
  }
}

print "✓ columna-borrada-en-trigger: no trigger's UPDATE OF names a column already dropped from that table\n" unless $fail;
exit $fail;
