import assert from 'node:assert/strict';
import test from 'node:test';
import { dubaiSouthFloorplanSnapshot as snapshot, dubaiSouthReplacementShortlist } from '../lib/dubai-south-floorplans';

test('replacement shortlist contains exactly the requested 22 distinct projects', () => {
  assert.equal(dubaiSouthReplacementShortlist.length, 22);
  assert.equal(new Set(dubaiSouthReplacementShortlist.map(p=>p.id)).size,22);
  assert(!dubaiSouthReplacementShortlist.some(p=>/plaza|mag 5|golf views|terra woods/i.test(p.name)));
});
test('similarly named developments and parent buildings never fuzzy-match', () => {
  for(const name of ['Cresswell Plaza', 'Harmony II', 'Windsor House', 'Azizi Venice', 'Terra Heights']) {
    assert.equal(snapshot({slug:name.toLowerCase().replaceAll(' ','-'),name}),undefined);
  }
});
test('Building G only receives a published Building G reference, not Building A', () => {
  const result=snapshot({slug:'azizi-venice-14-building-g',name:'Azizi Venice 14 - Building G'},'1BR');
  assert(result?.references.length);
  assert(result.references.every(p=>/Building G/i.test(p.layout)));
  assert(result.references.every(p=>p.matchStatus==='building-reference'));
  assert.match(result.qualification,/remain to be confirmed/);
});
test('missing plans remain empty and do not inherit old project media', () => {
  const result=snapshot({slug:'the-harmony-2',name:'The Harmony 2'},'1BR');
  assert(result);
  assert.deepEqual(result.references,[]);
});
test('bedroom mismatch cannot show a reviewed one-bedroom plan for a two-bedroom selection', () => {
  assert.equal(snapshot({slug:'golf-vale-emaar-south-dubai',name:'Golf Vale'},'2BR')?.references.length,0);
  const result=snapshot({slug:'golf-vale-emaar-south-dubai',name:'Golf Vale'},'1BR');
  assert(result?.references.length);
  assert(result.references.every(p=>p.sourceUrl.startsWith('https://')&&p.checkedAt&&p.qualification));
});
