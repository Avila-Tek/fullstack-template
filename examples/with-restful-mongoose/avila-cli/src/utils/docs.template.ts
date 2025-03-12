import { JSDocStructure, OptionalKind } from 'ts-morph';

interface IParam {
  name?: string;
  type: string;
  description: string;
}

interface IDocs {
  async?: boolean;
  description: string;
  _implements?: string;
  listens?: string;
  params?: IParam[];
  requires?: string;
  returns?: IParam;
  since: string;
  summary: string;
  todo?: string;
  version: string;
}

/**
 * @async
 * @function
 * @description creates this same JsDocs xD
 * @implements {IDocs}
 * @param {IDocs} param0 the object to construct the JsDoc
 * @returns {string[]} The array to write the docs
 * @since 1.0.0
 * @summary Creates JsDocs For file generation
 * @version 1
 */

export function docs({
  async = true,
  description,
  _implements,
  listens,
  params = [],
  requires,
  returns,
  since,
  summary,
  todo,
  version,
}: IDocs): OptionalKind<JSDocStructure>[] {
  const tags = [];
  if (async) tags.push({ tagName: 'async' });

  tags.push({ tagName: 'description', text: description });

  if (_implements) tags.push({ tagName: 'implements', text: _implements });

  if (listens) tags.push({ tagName: 'listens', text: listens });

  if (params?.length !== 0)
    tags.push(
      ...params.map(({ name, type, description }) => ({
        tagName: 'param',
        text: `{${type}} ${name} - ${description}`,
      }))
    );

  if (requires) tags.push({ tagName: 'requires', text: requires });

  if (returns)
    tags.push({
      tagName: 'returns',
      text: `{${returns?.type}} - ${returns?.description}`,
    });

  tags.push({ tagName: 'since', text: since });

  tags.push({ tagName: 'summary', text: summary });

  if (todo) tags.push({ tagName: 'todo', text: todo });

  tags.push({ tagName: 'version', text: version });

  return [
    {
      tags,
    },
  ];
}
