import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailService } from '../../../common/email/email.service';
import { NewsletterService } from './newsletter.service';

describe('NewsletterService', () => {
  let service: NewsletterService;
  let prisma: { newsletterSubscriber: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock } };
  let email: { send: jest.Mock };

  beforeEach(async () => {
    prisma = {
      newsletterSubscriber: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    email = { send: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        NewsletterService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
      ],
    }).compile();

    service = moduleRef.get(NewsletterService);
  });

  describe('subscribe', () => {
    it('creates a new pending subscriber and sends a confirm email', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValueOnce(null);

      await service.subscribe({ email: 'a@example.com', turnstileToken: 'tok' });

      expect(prisma.newsletterSubscriber.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ email: 'a@example.com' }) }),
      );
      expect(email.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'a@example.com', subject: expect.stringContaining('Confirm') }),
      );
    });

    it('silently no-ops for an already-confirmed subscriber', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValueOnce({ id: '1', status: 'confirmed' });

      await service.subscribe({ email: 'a@example.com', turnstileToken: 'tok' });

      expect(prisma.newsletterSubscriber.update).not.toHaveBeenCalled();
      expect(email.send).not.toHaveBeenCalled();
    });

    it('resends the existing confirm token for a pending subscriber', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValueOnce({
        id: '1',
        status: 'pending',
        confirmToken: 'existing-token',
      });

      await service.subscribe({ email: 'a@example.com', turnstileToken: 'tok' });

      expect(prisma.newsletterSubscriber.update).not.toHaveBeenCalled();
      expect(email.send).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining('existing-token') }));
    });

    it('re-opts-in an unsubscribed subscriber with a fresh token', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValueOnce({
        id: '1',
        status: 'unsubscribed',
        confirmToken: 'old-token',
      });

      await service.subscribe({ email: 'a@example.com', turnstileToken: 'tok' });

      expect(prisma.newsletterSubscriber.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: expect.objectContaining({ status: 'pending', confirmedAt: null, unsubscribedAt: null }),
        }),
      );
      expect(email.send).toHaveBeenCalled();
    });
  });

  describe('confirm', () => {
    it('throws for an unknown token', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValueOnce(null);
      await expect(service.confirm('bad-token')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('marks a pending subscriber confirmed', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValueOnce({ id: '1', status: 'pending' });

      await service.confirm('good-token');

      expect(prisma.newsletterSubscriber.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: '1' }, data: expect.objectContaining({ status: 'confirmed' }) }),
      );
    });

    it('is a no-op for an already-confirmed subscriber', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValueOnce({ id: '1', status: 'confirmed' });

      await service.confirm('good-token');

      expect(prisma.newsletterSubscriber.update).not.toHaveBeenCalled();
    });
  });

  describe('unsubscribe', () => {
    it('throws for an unknown token', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValueOnce(null);
      await expect(service.unsubscribe('bad-token')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('marks a subscriber unsubscribed', async () => {
      prisma.newsletterSubscriber.findUnique.mockResolvedValueOnce({ id: '1', status: 'confirmed' });

      await service.unsubscribe('good-token');

      expect(prisma.newsletterSubscriber.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: '1' }, data: expect.objectContaining({ status: 'unsubscribed' }) }),
      );
    });
  });
});
