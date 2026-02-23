import { getEnumObjectFromArray } from '@repo/utils';

/** Reusable form/modal mode: create, edit, view. */
export const formType = ['create', 'edit', 'view'] as const;
export type TFormType = (typeof formType)[number];
export const formTypeEnumObject = getEnumObjectFromArray(formType);
