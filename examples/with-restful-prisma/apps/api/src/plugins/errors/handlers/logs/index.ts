import { IncomingHttpHeaders } from 'http';

interface LogErrorInput {
  title: string;
  status: number;
  message: string;
  type: string;
  date: Date;
  stack: string[];
  body: any;
  query: any;
  headers: IncomingHttpHeaders;
}

export function logError(record: LogErrorInput) {
  console.log('\n------------------------------------------------------------');
  console.log('Uncaught RES error');
  console.log('------------------------------------------------------------');
  console.log('Date:', record.date);
  console.log('Stack:', record.stack);
  console.log('Status:', record.status);
  console.log('------------------------------------------------------------');
  console.log('Request Body:', record?.body);
  console.log('Request Query:', record?.query);
  console.log('Authorization:', record?.headers?.authorization);
  console.log('------------------------------------------------------------\n');
  console.log('Error Type:', record.type);
  console.log('Error Title:', record.title);
  console.log('Error Detail:', record.message);
  console.log('------------------------------------------------------------\n');

  if (process.env.APP_ENV === 'production') {
    const ignoreStatus: number[] = [401, 403];

    if (!ignoreStatus.includes(record.status)) {
      // TODO: Uncomment this code once Sentry is fully integrated
      //
      // const urlWithoutQuery = request.url.split('?')[0];
      //
      // Sentry.captureException(
      //   `${error.cause || 'Unknown'} - ${status}-${type}`,
      //   {
      //     tags: {
      //       status,
      //       type,
      //       url: urlWithoutQuery,
      //       method: request.method,
      //       status_code: status,
      //       transaction: `${request.method} ${urlWithoutQuery}`,
      //     },
      //     contexts: {
      //       request: {
      //         url: request.url,
      //         method: request.method,
      //         headers: request.headers,
      //         body: JSON.stringify(request.body, null, 2),
      //       },
      //     },
      //     extra: {
      //       stack,
      //       errorName: error.name,
      //       transaction: `${request.method} ${urlWithoutQuery}`,
      //       data: error instanceof Exception ? error.data : undefined,
      //     },
      //     fingerprint: [
      //       `${request.method}-${urlWithoutQuery}-${status}-${type}`,
      //     ],
      //   }
      // );
    }
  }
}
