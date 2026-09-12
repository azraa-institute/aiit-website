import { Test } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailService } from '../../../common/email/email.service';
import { ContactService } from './contact.service';
import type { CreateContactMessageDto } from './dto/create-contact-message.dto';

describe('ContactService', () => {
  let service: ContactService;
  let prisma: { contactMessage: { create: jest.Mock } };
  let email: { send: jest.Mock };

  const DTO: CreateContactMessageDto = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    topic: 'course',
    message: 'Tell me more.',
    turnstileToken: 'tok',
  };

  beforeEach(async () => {
    prisma = { contactMessage: { create: jest.fn() } };
    email = { send: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ContactService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
      ],
    }).compile();

    service = moduleRef.get(ContactService);
  });

  it('stores the message and notifies staff', async () => {
    await service.create(DTO);

    expect(prisma.contactMessage.create).toHaveBeenCalledWith({
      data: { name: DTO.name, email: DTO.email, topic: DTO.topic, message: DTO.message },
    });
    expect(email.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'info@aiit.network', subject: expect.stringContaining('Ada Lovelace') }),
    );
  });

  it('escapes HTML in the notification email body', async () => {
    await service.create({ ...DTO, message: '<script>alert(1)</script>' });

    const call = email.send.mock.calls[0][0];
    expect(call.html).not.toContain('<script>');
    expect(call.html).toContain('&lt;script&gt;');
  });
});
