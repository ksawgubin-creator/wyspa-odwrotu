// Skill tree (1 point per level). ROBOCZE effects are applied where noted in the code (player.js, crafting.js, survival.js, entity.js).
export const SKILLS = [
  { tree: 'Łowca', id: 'hunter', name: 'Siła ciosu', desc: '+8% obrażeń w walce za poziom.', max: 5 },
  { tree: 'Łowca', id: 'stealth', name: 'Ciche kroki', desc: 'Skradając się, jesteś trudniejszy do wykrycia (-10% za poziom).', max: 3 },
  { tree: 'Rzemieślnik', id: 'crafter', name: 'Oszczędny rzemieślnik', desc: 'Receptury kosztują o 7% mniej surowców za poziom.', max: 5 },
  { tree: 'Przetrwanie', id: 'hungerRes', name: 'Wytrwałość', desc: 'Głód i pragnienie rosną o 8% wolniej za poziom.', max: 5 },
  { tree: 'Przetrwanie', id: 'vitality', name: 'Twarda skóra', desc: '+10 maksymalnego zdrowia za poziom.', max: 5 },
];
