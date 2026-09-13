import { ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { AllExceptionsFilter } from './all-exceptions.filter';

jest.mock('@sentry/node', () => ({ captureException: jest.fn() }));

function hostWith(response: { status: jest.Mock; json: jest.Mock }): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ id: 'req-1' }),
    }),
  } as unknown as ArgumentsHost;
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let response: { status: jest.Mock; json: jest.Mock };

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    jest.clearAllMocks();
  });

  it('joins ValidationPipe field messages into a readable top-level message instead of the generic "Bad Request Exception"', () => {
    const exception = new BadRequestException(['email must be an email']);
    filter.catch(exception, hostWith(response));

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: 'BAD_REQUEST',
        message: 'email must be an email',
        details: ['email must be an email'],
      },
    });
  });

  it('joins multiple field messages with a space', () => {
    const exception = new BadRequestException(['name should not be empty', 'email must be an email']);
    filter.catch(exception, hostWith(response));

    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'name should not be empty email must be an email' }),
      }),
    );
  });

  it('falls back to the exception message for a non-ValidationPipe HttpException', () => {
    const exception = new NotFoundException('Certificate not found.');
    filter.catch(exception, hostWith(response));

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ message: 'Certificate not found.' }) }),
    );
  });

  it('reports a generic message and captures to Sentry for a non-HTTP exception', () => {
    filter.catch(new Error('unexpected'), hostWith(response));

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred.' },
    });
    expect(Sentry.captureException).toHaveBeenCalled();
  });

  it('does not report a 4xx HttpException to Sentry', () => {
    filter.catch(new BadRequestException(['bad']), hostWith(response));
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
