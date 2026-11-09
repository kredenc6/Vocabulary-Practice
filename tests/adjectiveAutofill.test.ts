import assert from 'node:assert/strict';
import test from 'node:test';
import { autofillAdjective, createAdjectiveAutofillSession, suggestAdjective } from '../src/lib/adjectiveAutofill.ts';
import type { AdjectiveFormState } from '../src/lib/adjective.ts';

const empty = (): AdjectiveFormState => ({
  kind: 'four', feminine: '', masculinePlural: '', femininePlural: '', plural: '',
});

test('different gender forms, accents, nationality exceptions and case', () => {
  const examples = [
    ['bonito', 'bonita', 'bonitos', 'bonitas'],
    ['trabajador', 'trabajadora', 'trabajadores', 'trabajadoras'],
    ['alemán', 'alemana', 'alemanes', 'alemanas'],
    ['francés', 'francesa', 'franceses', 'francesas'],
    ['español', 'española', 'españoles', 'españolas'],
    ['andaluz', 'andaluza', 'andaluces', 'andaluzas'],
    ['llorón', 'llorona', 'llorones', 'lloronas'],
    ['pequeñín', 'pequeñina', 'pequeñines', 'pequeñinas'],
    ['grandote', 'grandota', 'grandotes', 'grandotas'],
    ['regordete', 'regordeta', 'regordetes', 'regordetas'],
    ['constructor', 'constructora', 'constructores', 'constructoras'],
    ['rápido', 'rápida', 'rápidos', 'rápidas'],
    ['  Alemán  ', 'Alemana', 'Alemanes', 'Alemanas'],
    ['ESPAÑOL', 'ESPAÑOLA', 'ESPAÑOLES', 'ESPAÑOLAS'],
    ['france\u0301s', 'francesa', 'franceses', 'francesas'],
  ];
  for (const [base, feminine, masculinePlural, femininePlural] of examples) {
    assert.deepEqual(suggestAdjective(base), {
      kind: 'four', forms: { feminine, masculinePlural, femininePlural },
    }, base);
  }
});

test('shared gender forms, spelling changes and preferred plural alternatives', () => {
  const examples = [
    ['verde', 'verdes'], ['inteligente', 'inteligentes'], ['optimista', 'optimistas'],
    ['azul', 'azules'], ['feliz', 'felices'], ['joven', 'jóvenes'], ['popular', 'populares'],
    ['difícil', 'difíciles'], ['común', 'comunes'], ['afín', 'afines'],
    ['mejor', 'mejores'], ['superior', 'superiores'], ['cortés', 'corteses'],
    ['marrón', 'marrones'], ['gris', 'grises'], ['naranja', 'naranjas'],
    ['marroquí', 'marroquíes'], ['hindú', 'hindúes'], ['bilingüe', 'bilingües'],
    ['isósceles', 'isósceles'], ['gratis', 'gratis'], ['unisex', 'unisex'],
  ];
  for (const [base, plural] of examples) {
    assert.deepEqual(suggestAdjective(base), { kind: 'two', forms: { plural } }, base);
  }
});

test('uncertain input is left for manual completion', () => {
  for (const word of ['', ' ', 'azul claro', 'bueno / malo', 'teórico-práctico', 'bonita', 'bonitos', 'light', 'modelo', 'buen', 'gran', '123', 'constructor.prototype']) {
    assert.equal(suggestAdjective(word), undefined, word);
  }
});

test('generated forms follow word changes and clear when input becomes uncertain', () => {
  const first = autofillAdjective('bonito', empty(), createAdjectiveAutofillSession());
  const second = autofillAdjective('verde', first.adjective, first.session);
  assert.deepEqual(second.adjective, { ...empty(), kind: 'two', plural: 'verdes' });
  const third = autofillAdjective('azul claro', second.adjective, second.session);
  assert.deepEqual(third.adjective, { ...empty(), kind: 'two' });
});

test('manual corrections and deliberate empty fields survive subsequent autofill', () => {
  const first = autofillAdjective('bonito', empty(), createAdjectiveAutofillSession());
  first.adjective.feminine = 'my correction';
  first.adjective.femininePlural = '';
  first.session.edited.add('feminine');
  first.session.edited.add('femininePlural');
  const next = autofillAdjective('alto', first.adjective, first.session);
  assert.equal(next.adjective.feminine, 'my correction');
  assert.equal(next.adjective.femininePlural, '');
  assert.equal(next.adjective.masculinePlural, 'altos');
  assert.equal(autofillAdjective('verde', next.adjective, next.session).adjective.kind, 'four');
});

test('saved values and an explicitly selected kind are protected', () => {
  const saved = { ...empty(), kind: 'two' as const, plural: 'marroquís' };
  const result = autofillAdjective('marroquí', saved, createAdjectiveAutofillSession(true));
  assert.deepEqual(result.adjective, saved);
  const locked = autofillAdjective('verde', empty(), createAdjectiveAutofillSession(true));
  assert.deepEqual(locked.adjective, empty());
});

test('editing a field to the suggested value still makes it manual', () => {
  const first = autofillAdjective('bonito', empty(), createAdjectiveAutofillSession());
  first.session.edited.add('feminine');
  const next = autofillAdjective('verde', first.adjective, first.session);
  assert.equal(next.adjective.kind, 'four');
  assert.equal(next.adjective.feminine, 'bonita');
});

test('manual kind changes clear generated hidden forms but preserve manual hidden forms', () => {
  const first = autofillAdjective('bonito', empty(), createAdjectiveAutofillSession());
  first.adjective.feminine = 'custom';
  first.session.edited.add('feminine');
  first.session.kindLocked = true;
  const next = autofillAdjective('bonito', { ...first.adjective, kind: 'two' }, first.session);
  assert.deepEqual(next.adjective, { ...empty(), kind: 'two', feminine: 'custom' });
});

test('a fresh session has no manual locks from the previous word', () => {
  const first = createAdjectiveAutofillSession(true);
  first.edited.add('plural');
  const next = autofillAdjective('verde', empty(), createAdjectiveAutofillSession());
  assert.equal(next.adjective.kind, 'two');
  assert.equal(next.adjective.plural, 'verdes');
});
