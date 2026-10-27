import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const base=path.resolve(import.meta.dirname,'../dist');
const routes=['/','/empresas/soporte-tecnico/','/reparacion-computadoras/'];
const read=(route)=>fs.readFileSync(path.join(base,route,'index.html'),'utf8');
const titles=new Set();
for(const route of routes){
  const html=read(route);
  assert.equal([...html.matchAll(/<h1\b/g)].length,1,route+' has one H1');
  assert.match(html,/<html lang="es-MX"/);
  assert.ok(html.includes(`rel="canonical" href="https://soportechict.com${route}"`));
  assert.ok(!html.includes('noindex'));
  const title=html.match(/<title>(.*?)<\/title>/)[1];titles.add(title);
  assert.ok(html.includes('name="description"'));
  const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(schema['@context'],'https://schema.org');
  const business=schema['@graph'][0];assert.equal(business.telephone,'+523332238265');
  assert.equal(business['@id'],'https://soportechict.com/#business');
  assert.ok(!html.includes('schema.org/ComputerRepair'));
  for(const [,href] of html.matchAll(/href="([^"]+)"/g)){
    if(href.startsWith('https://wa.me/')){
      const url=new URL(href.replaceAll('&amp;','&'));assert.equal(url.pathname,'/523332238265');assert.match(url.searchParams.get('text'),/Origen: web \| silo=/);
    }
    if(href.startsWith('#')) assert.ok(html.includes(`id="${href.slice(1)}"`),`Missing anchor ${route} ${href}`);
    if(href.startsWith('/')){
      const target=href.split(/[?#]/)[0];
      assert.ok(fs.existsSync(path.join(base,target,target.endsWith('/')?'index.html':'')),`Missing ${href}`);
    }
    if(route===routes[1])assert.ok(!href.startsWith(routes[2]));
    if(route===routes[2])assert.ok(!href.startsWith(routes[1]));
  }
  for(const [,tag] of html.matchAll(/(<img\b[^>]*>)/g)){
    assert.match(tag,/width="\d+"/);assert.match(tag,/height="\d+"/);assert.match(tag,/alt="[^"]+"/);
    const src=tag.match(/src="([^"]+)"/)?.[1];
    if(src?.startsWith('/')) assert.ok(fs.existsSync(path.join(base,src)),`Missing image ${route} ${src}`);
  }
  assert.ok(Buffer.byteLength(html)<40000,'HTML budget exceeded');
  const visible=html.replace(/<script\b[\s\S]*?<\/script>/g,'').replace(/<[^>]+>/g,' ');
  if(route===routes[1])assert.ok(!/laptop|formateo|hogar|equipos personales/i.test(visible),'B2B semantic leak');
  if(route===routes[2])assert.ok(!/servidor|corporativ|póliza|empresarial/i.test(visible),'B2C semantic leak');
  console.log('PASS',route,Buffer.byteLength(html),'bytes');
}
assert.equal(titles.size,3);
const sitemap=fs.readFileSync(path.join(base,'sitemap.xml'),'utf8');
assert.equal([...sitemap.matchAll(/<loc>/g)].length,3);
for(const route of routes)assert.ok(sitemap.includes(`https://soportechict.com${route}</loc>`));
for(const [old,target] of [['particulares',routes[2]],['soporte-ti-empresas-zmg',routes[1]],['soporte-tecnico-empresas-guadalajara',routes[1]]]){
 const html=read('/'+old+'/');assert.ok(html.includes('http-equiv="refresh"'));assert.ok(html.includes('0;url='+target));assert.ok(html.includes('https://soportechict.com'+target));assert.ok(!sitemap.includes('/'+old+'/'));
}
assert.ok(fs.readFileSync(path.join(base,'robots.txt'),'utf8').includes('Sitemap: https://soportechict.com/sitemap.xml'));
console.log('PASS canonical sitemap, legacy redirects, semantic isolation, assets, accessibility markup and attributed WhatsApp links.');
