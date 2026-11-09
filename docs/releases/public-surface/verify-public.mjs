import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const root = new URL('./', import.meta.url);
const before = readFileSync(new URL('public-homepage-before.html',root),'utf8');
const after = readFileSync(new URL('public/index.html',root),'utf8');
const section = (html,id) => html.slice(html.indexOf(`<section`,html.indexOf(`id="${id}"`)-100),html.indexOf('</section>',html.indexOf(`id="${id}"`))+10);
// Preserve all price tables and unrelated homepage sections verbatim.
for(const id of ['planes','sedes','preguntas','incluye','alcance','inscribirse']) {
  assert.ok(before.includes(`id="${id}"`),id);
  assert.equal(section(after,id),section(before,id),id);
}
assert.equal((after.match(/<p class="price-qualifier"/g)||[]).length,2);
for(const amount of ['$49.99','$59.99','$119.98'])assert.ok(after.includes(amount));
const desc={content:'Spanish'},buttons=['es','en'].map(lang=>({dataset:{lang},setAttribute(){}}));
const doc={documentElement:{lang:'es'},title:'Spanish',querySelectorAll:selector=>selector==='.lang button'?buttons:[],querySelector:()=>desc,getElementById:id=>id==='hamb'?{addEventListener(){}}:id==='menu'?{addEventListener(){}}:id==='anio'?{}:null};
const script=after.match(/<script>\s*(\(function\(\)\{[\s\S]*?)<\/script>/)[1];
// Execute the production language switch against a minimal DOM, without a browser or network.
const handlers={};buttons.forEach(b=>b.addEventListener=(_,fn)=>handlers[b.dataset.lang]=fn);
vm.runInNewContext(script,{document:doc,window:{},sessionStorage:{getItem:()=>null,setItem(){}},Date,Math});
handlers.en();assert.equal(doc.documentElement.lang,'en');assert.match(doc.title,/Medical Services Membership/);assert.match(desc.content,/primary care/);
handlers.es();assert.equal(doc.documentElement.lang,'es');assert.match(doc.title,/Programa de membresía/);assert.match(desc.content,/médico de cabecera/);
const sitemap=readFileSync(new URL('public/sitemap.xml',root),'utf8');
assert.deepEqual([...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1]),['https://corazonsalud.health/','https://corazonsalud.health/privacy/','https://corazonsalud.health/terms/']);
assert.match(readFileSync(new URL('public/robots.txt',root),'utf8'),/Sitemap: https:\/\/corazonsalud.health\/sitemap.xml/);
console.log('PASS: unchanged sections/pricing, both qualifiers, ES/EN metadata, public-only sitemap.');
