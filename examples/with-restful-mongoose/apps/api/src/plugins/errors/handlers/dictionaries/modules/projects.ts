import { ErrorTypes } from '../../types';

export const projectErrors = {
  'not-found': {
    type: ErrorTypes.NOT_FOUND_ERROR,
    code: 'PROJECT_NOT_FOUND',
    status: 404,
    title: { es: 'Proyecto no encontrado', en: 'Project not found' },
    message: {
      es: 'El proyecto no fue encontrado',
      en: 'Project could not be found',
    },
  },
};
