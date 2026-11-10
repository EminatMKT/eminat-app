// Shapes the guard core shares: the rules file, a parsed shell command and the verdict.
export type Language = 'es' | 'en'
export type Texts = Record<Language, string>
export type WordLists = Record<string, string[]>
type RuleListKey =
  | 'programs' | 'tokens' | 'envNames' | 'readOnly' | 'requireTokens' | 'paths'
  | 'protectedBranches' | 'forceFlags' | 'branchRewriteFlags' | 'configKeys'
  | 'areas' | 'exceptFlags' | 'configReads' | 'valueOptions'
type RuleTextKey = 'pattern' | 'exceptPattern' | 'pathPattern' | 'shortForceLetters' | 'doc'
type RuleCore = {
  id: string
  kind: string
  route: string
  does: Texts
  prefixes?: string[][]
  noVerify?: WordLists
}
type RuleLists = Partial<Record<RuleListKey, string[]>>
type RuleTexts = Partial<Record<RuleTextKey, string>>
export type Rule = RuleCore & RuleLists & RuleTexts
type MutationKey =
  | 'mutators' | 'copiers' | 'copyTargetFlags' | 'inPlaceEditors' | 'gitSubcommands' | 'redirects'
type ParsingListKey = 'shells' | 'evaluators' | 'gitValueOptions' | 'wrappers' | 'xargsProbes'
type ParsingShapes = {
  runners: string[][]
  runnerValueOptions: WordLists
  inlineCodeFlags: WordLists
  fileMutation: Record<MutationKey, string[]>
}
export type Parsing = Record<ParsingListKey, string[]> & ParsingShapes
export type RulesFile = {
  framing: Texts
  unavailable: Texts
  routes: Record<string, Texts>
  parsing: Parsing
  rules: Rule[]
}
type Committed = { committed: string[]; changed: string[] }
export type Context = Record<'cwd' | 'root' | 'branch', string> & Committed
export type GuardRequest = { command?: string; paths?: string[] }
export type Verdict = { decision: string; rule: string | null; message: string }
export type Peeled = { env: string[]; words: string[] }
export type Command = Peeled & { xargs?: boolean; alias?: boolean }
export type Piece = { operator?: string; word?: string }
export type GitCommand = { configs: string[]; sub: string; args: string[] }
export type Matcher = (command: Command, rule: Rule, context?: Context) => boolean
export type PathSource = (rule: Rule, context: Context) => string[]
type CaseField = 'command' | 'path' | 'rule' | 'branch'
type Expected = { expect: string; changed?: string[] }
export type CaseRow = Partial<Record<CaseField, string>> & Expected
