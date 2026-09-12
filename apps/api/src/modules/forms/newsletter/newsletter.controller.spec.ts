import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';
import { TurnstileService } from '../../../common/turnstile/turnstile.service';

describe('NewsletterController', () => {
  let controller: NewsletterController;
  let newsletter: { subscribe: jest.Mock; confirm: jest.Mock; unsubscribe: jest.Mock };
  let turnstile: { verify: jest.Mock };

  beforeEach(async () => {
    newsletter = { subscribe: jest.fn(), confirm: jest.fn(), unsubscribe: jest.fn() };
    turnstile = { verify: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [NewsletterController],
      providers: [
        { provide: NewsletterService, useValue: newsletter },
        { provide: TurnstileService, useValue: turnstile },
      ],
    }).compile();

    controller = moduleRef.get(NewsletterController);
  });

  it('verifies Turnstile before subscribing', async () => {
    await controller.subscribe({ email: 'a@example.com', turnstileToken: 'tok' }, { ip: '1.2.3.4' } as never);

    expect(turnstile.verify).toHaveBeenCalledWith('tok', '1.2.3.4');
    expect(newsletter.subscribe).toHaveBeenCalled();
  });

  it('does not subscribe if Turnstile verification fails', async () => {
    turnstile.verify.mockRejectedValueOnce(new ServiceUnavailableException());

    await expect(
      controller.subscribe({ email: 'a@example.com', turnstileToken: 'tok' }, { ip: '1.2.3.4' } as never),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(newsletter.subscribe).not.toHaveBeenCalled();
  });

  it('confirm delegates to the service without Turnstile', async () => {
    await controller.confirm({ token: 'tok' });

    expect(newsletter.confirm).toHaveBeenCalledWith('tok');
    expect(turnstile.verify).not.toHaveBeenCalled();
  });

  it('unsubscribe delegates to the service without Turnstile', async () => {
    await controller.unsubscribe({ token: 'tok' });

    expect(newsletter.unsubscribe).toHaveBeenCalledWith('tok');
    expect(turnstile.verify).not.toHaveBeenCalled();
  });
});
