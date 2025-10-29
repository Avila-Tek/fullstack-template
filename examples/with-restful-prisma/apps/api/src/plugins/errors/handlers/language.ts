import { FastifyRequest } from 'fastify';

const availableLanguages = ['en', 'es'] as const;
export type AvailableLanguages = (typeof availableLanguages)[number];

function processLanguages(acceptLanguageHeader: string) {
  const languages = acceptLanguageHeader.split(',').map((lang) => lang.trim());
  return languages;
}

function negotiate(requestedLanguages: string[]): AvailableLanguages {
  type NegotiationResult = { language: string; selected: boolean };
  const negotiationResult = requestedLanguages.reduce<NegotiationResult>(
    (acc, lang: string) => {
      // If already selected, skip further checks
      if (acc.selected) return acc;

      // Check if the language is available
      const language =
        typeof lang === 'string' ? lang.split(';')?.[0]?.trim() : '';
      if (
        !language ||
        !availableLanguages.includes(language as AvailableLanguages)
      )
        return acc;
      return { language, selected: true };
    },
    { language: availableLanguages[0], selected: false }
  );

  return negotiationResult.language as AvailableLanguages;
}

export function languageNegotiation(
  request: FastifyRequest
): AvailableLanguages {
  const acceptLanguages = request?.headers['accept-language'] || 'en';
  const requestedLanguages = processLanguages(acceptLanguages);
  const finalLanguage = negotiate(requestedLanguages);
  return finalLanguage;
}
