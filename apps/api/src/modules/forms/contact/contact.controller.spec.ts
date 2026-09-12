import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';
import { TurnstileService } from '../../../common/turnstile/turnstile.service';
import type { CreateContactMessageDto } from './dto/create-contact-message.dto';

describe('ContactController', () => {
  let controller: ContactController;
  let contact: { create: jest.Mock };
  let turnstile: { verify: jest.Mock };

  const DTO: CreateContactMessageDto = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    topic: 'course',
    message: 'Tell me more.',
    turnstileToken: 'tok',
  };

  beforeEach(async () => {
    contact = { create: jest.fn() };
    turnstile = { verify: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      controllers: [ContactController],
      providers: [
        { provide: ContactService, useValue: contact },
        { provide: TurnstileService, useValue: turnstile },
      ],
    }).compile();

    controller = moduleRef.get(ContactController);
  });

  it('verifies Turnstile before storing the message', async () => {
    await controller.create(DTO, { ip: '1.2.3.4' } as never);

    expect(turnstile.verify).toHaveBeenCalledWith('tok', '1.2.3.4');
    expect(contact.create).toHaveBeenCalledWith(DTO);
  });

  it('does not store the message if Turnstile verification fails', async () => {
    turnstile.verify.mockRejectedValueOnce(new ServiceUnavailableException());

    await expect(controller.create(DTO, { ip: '1.2.3.4' } as never)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(contact.create).not.toHaveBeenCalled();
  });
});
