import type { VocabWordData } from '../types';
import { adjectiveFormList } from './adjective';
import { normalize, stripAccents } from './answerCheck';
import { formatSpanish } from './wordDisplay';

const searchable = (text: string) => stripAccents(normalize(text));

export function createWordSearch(search: string): (word: VocabWordData) => boolean {
  const query = searchable(search);
  return (word) => (
    !query ||
    searchable(formatSpanish(word)).includes(query) ||
    searchable(word.plural ?? '').includes(query) ||
    adjectiveFormList(word.adjective).some((form) => searchable(form.value).includes(query)) ||
    searchable(word.english).includes(query)
  );
}
