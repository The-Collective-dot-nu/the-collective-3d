// Close-ups of every musician on the model page, front and three-quarter.
//   OUT=dir D=1.7 ONLY='[0,5]' node closeups.js
const fs = require('fs');
const { launch, open } = require('./open');
(async () => {
  const OUT = process.env.OUT || 'out/close', D = +(process.env.D || 1.7);
  fs.mkdirSync(OUT, { recursive: true });
  const b = await launch(); const p = await b.newPage({ viewport: { width: 1000, height: 600 } });
  await open(p, process.env.URL || 'http://127.0.0.1:8099/the-collective-3d/site/orkest-model.html');
  await p.waitForFunction(() => window.__people && window.__scene, null, { timeout: 0, polling: 2000 });
  await p.evaluate(() => document.querySelectorAll('aside.panel').forEach(e => e.style.display = 'none'));
  const info = await p.evaluate(() => window.__people.MUS.map((c, i) => { const v = new THREE.Vector3(); c.m.getWorldPosition(v); return { i, part: c.part, outfit: c.outfit, x: v.x, y: v.y, z: v.z }; }));
  fs.writeFileSync(OUT + '/mus.json', JSON.stringify(info, null, 1));
  const only = process.env.ONLY ? JSON.parse(process.env.ONLY) : null;
  const views = JSON.parse(process.env.VIEWS || '[["f",0],["s",1.1]]');
  for (const m of info) {
    if (only && !only.includes(m.i)) continue;
    for (const [tag, ang] of views) {
      await p.evaluate(([m, ang, D]) => {
        const t = new THREE.Vector3(m.x, m.y + 0.8, m.z);
        const mm = window.__people.MUS[m.i].m; const d = new THREE.Vector3(0, 0, 1).transformDirection(mm.matrixWorld).setY(0).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
        const pos = t.clone().add(d.multiplyScalar(D)); pos.y += 0.35; window.__scene.view(pos, t);
        window.__scene.isolate(window.__people.MUS[m.i].m, false);
      }, [m, ang, D]);
      await p.waitForTimeout(900);
      const box = await p.evaluate(() => { const r = document.getElementById('c').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
      for (let k = 0; k < 3; k++) try { await p.screenshot({ clip: box, timeout: 60000, path: `${OUT}/m${String(m.i).padStart(2, '0')}-${m.part.replace(/ /g, '_')}-${tag}.png` }); break; } catch (e) { console.log('retry', m.i, e.message.slice(0, 80)); await p.waitForTimeout(3000); }
    }
  }
  // the conductor (RUN) from the front, the side and the back
  for (const [tag, ang] of [['f', 0], ['s', 1.4], ['b', 3.14]]) {
    await p.evaluate(([ang]) => {
      let per = null; window.__scene.root.traverse(o => { if (!per && o.name === 'Persoon' && o.parent && /^Dirigent$/.test(o.parent.name)) per = o; });
      if (!per) window.__scene.root.traverse(o => { if (!per && o.name === 'Persoon') per = o; });
      const v = new THREE.Vector3(); per.getWorldPosition(v); const t = v.clone().add(new THREE.Vector3(0, 1.0, 0));
      const d = new THREE.Vector3(0, 0, 1).transformDirection(per.matrixWorld).setY(0).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
      window.__scene.isolate(per.parent, false); window.__scene.view(t.clone().add(d.multiplyScalar(3.2)).add(new THREE.Vector3(0, 0.2, 0)), t);
    }, [ang]);
    await p.waitForTimeout(1500);
    const box = await p.evaluate(() => { const r = document.getElementById('c').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height }; });
    await p.screenshot({ clip: box, timeout: 60000, path: `${OUT}/conductor-${tag}.png` }).catch(e => console.log('fail', e.message.slice(0, 80)));
  }
  await b.close();
})();
