#!/usr/bin/env perl
# The pattern that broke PR #86/#87/#89 three times: a migration drops a column from a table,
# and a later migration still fires a trigger with `UPDATE OF that_column ON that_table`.
# Scoped to `CREATE TRIGGER ... UPDATE OF <cols> ON <table>` on purpose: table and column come
# from the SAME statement, so there's no need to infer which table a loose `NEW.col`/`OLD.col`
# inside a function body belongs to — that gives false positives across tables that share a
# column name (e.g. `actividades.empresa` vs `usuarios.empresa`). Check 1 (apply against a real
# Postgres) is the full safety net; this is the fast signal for the one pattern that actually
# recurred.
#
# A later `ADD COLUMN` for the same table+column clears the drop: PR #92 re-adds
# `actividades.responsable_id` (dropped in an earlier migration) and triggers on it again, which
# is legitimate, not the dangling-reference bug this check exists for. All three statement kinds
# are matched in one pass, in file order, so drop/add/trigger apply in the order they were
# written — both within one migration file and across the sorted file list.
use strict;
use warnings;

my %dropped;  # "table\x1ccolumn" => file that (currently) has it dropped
my $fail = 0;

for my $file (@ARGV) {
  open my $fh, '<', $file or die "$file: $!";
  local $/;
  my $sql = <$fh>;
  close $fh;
  $sql =~ s/--[^\n]*//g;  # strip line comments before matching anything

  while ($sql =~ /
      alter\s+table\s+(?:public\.)?(?<drop_table>[a-z_][a-z0-9_]*)\s+drop\s+column(?:\s+if\s+exists)?\s+"?(?<drop_col>[a-z_][a-z0-9_]*)"?
    | alter\s+table\s+(?:public\.)?(?<add_table>[a-z_][a-z0-9_]*)\s+add\s+column(?:\s+if\s+not\s+exists)?\s+"?(?<add_col>[a-z_][a-z0-9_]*)"?
    | create\s+trigger\s+\S+\s+(?:before|after)\s+(?:insert\s+or\s+)?update\s+of\s+(?<trig_cols>[a-z0-9_,\s]+?)\s+on\s+(?:public\.)?(?<trig_table>[a-z_][a-z0-9_]*)
    /gix) {
    if (defined $+{drop_table}) {
      $dropped{lc($+{drop_table}) . "\x1c" . lc($+{drop_col})} //= $file;
    } elsif (defined $+{add_table}) {
      delete $dropped{lc($+{add_table}) . "\x1c" . lc($+{add_col})};
    } else {
      my ($cols, $table) = ($+{trig_cols}, $+{trig_table});
      for my $col (split /\s*,\s*/, $cols) {
        my $key = lc($table) . "\x1c" . lc($col);
        if (exists $dropped{$key}) {
          print "✖ columna-borrada-en-trigger: $file fires UPDATE OF $col ON $table, but $dropped{$key} already dropped it from that table and it was never re-added before this trigger\n";
          $fail = 1;
        }
      }
    }
  }
}

print "✓ columna-borrada-en-trigger: no trigger's UPDATE OF names a column already dropped from that table\n" unless $fail;
exit $fail;
