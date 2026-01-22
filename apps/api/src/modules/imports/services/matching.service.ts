/**
 * @deprecated Этот файл оставлен для обратной совместимости.
 * Используйте модули из папки matching/ вместо прямого импорта из этого файла.
 *
 * Новые импорты:
 * - autoMatch: from './matching/auto-match.service'
 * - determineDirection: from './matching/direction/direction-matcher.service'
 * - matchCounterparty: from './matching/counterparty/counterparty-matcher.service'
 * - matchArticle: from './matching/article/article-matcher.service'
 * - matchAccount: from './matching/account/account-matcher.service'
 * - MatchingResult: from './matching/matching.types'
 */

// Реэкспорт для обратной совместимости
export { autoMatch } from './matching/auto-match.service';
export { determineDirection } from './matching/direction/direction-matcher.service';
export { matchCounterparty } from './matching/counterparty/counterparty-matcher.service';
export { matchArticle } from './matching/article/article-matcher.service';
export { matchAccount } from './matching/account/account-matcher.service';
export type { MatchingResult } from './matching/matching.types';
