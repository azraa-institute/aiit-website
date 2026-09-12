import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { WebinarController } from './webinar.controller';
import { WebinarService } from './webinar.service';
import { TurnstileService } from '../../../common/turnstile/turnstile.service';
import type { RegisterWebinarDto } from './dto/register-webinar.dto';

describe('WebinarController', () => {
  let controller: WebinarController;
  let webinar: { register: jest.Mock };
  let turnstile: { verify: jest.Mock };

  const DTO: RegisterWebinarDto = {
    webinarSlug: 'mastering-modern-information-technology',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    region: 'west-africa',
    persona: 'student',
    turnstileToken: 'tok',
  };

  beforeEach(async () => {
    webinar = { register: jest.fn() };
    turnstile = { verify: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [WebinarController],
      providers: [
        { provide: WebinarService, useValue: webinar },
        { provide: TurnstileService, useValue: turnstile },
      ],
    }).compile();

    controller = moduleRef.get(WebinarController);
  });

  it('verifies Turnstile before registering', async () => {
    await controller.register(DTO, { ip: '1.2.3.4' } as never);

    expect(turnstile.verify).toHaveBeenCalledWith('tok', '1.2.3.4');
    expect(webinar.register).toHaveBeenCalledWith(DTO);
  });

  it('does not register if Turnstile verification fails', async () => {
    turnstile.verify.mockRejectedValueOnce(new ServiceUnavailableException());

    await expect(controller.register(DTO, { ip: '1.2.3.4' } as never)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(webinar.register).not.toHaveBeenCalled();
  });
});
