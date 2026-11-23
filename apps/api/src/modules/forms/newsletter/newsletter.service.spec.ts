import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { EmailService } from '../../../common/email/email.service';
import { NewsletterService } from './newsletter.service';

describe('NewsletterService', () => {
  let service: NewsletterService;
  let prisma: {
    newsletterSubscriber: { findUnique: jest.Mock; findMany: jest.Mock; create: jest.Mock; update: jest.Mock; count: jest.Mock };
    newsletterIssue: { findMany: jest.Mock; create: jest.Mock; update: jest.Mock };
  };
  let email: { send: jest.Mock };

  beforeEach(async () => {
    prisma = {
      newsletterSubscriber: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
      newsletterIssue: { findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
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

  describe('sendIssue', () => {
    it('refuses an empty subject or body', async () => {
      await expect(service.sendIssue('admin-1', '  ', 'body')).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.sendIssue('admin-1', 'subject', '   ')).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.newsletterIssue.create).not.toHaveBeenCalled();
    });

    it('sends only to confirmed subscribers, each with their own unsubscribe link, and records the sent count', async () => {
      prisma.newsletterIssue.create.mockResolvedValueOnce({ id: 'issue-1' });
      prisma.newsletterSubscriber.findMany.mockResolvedValueOnce([
        { email: 'a@example.com', unsubscribeToken: 'tok-a' },
        { email: 'b@example.com', unsubscribeToken: 'tok-b' },
      ]);
      prisma.newsletterIssue.update.mockResolvedValueOnce({
        id: 'issue-1',
        subject: 'Hello',
        bodyText: 'Hi there',
        sentAt: new Date('2026-11-23T00:00:00Z'),
        sentCount: 2,
        createdAt: new Date('2026-11-23T00:00:00Z'),
      });

      const result = await service.sendIssue('admin-1', 'Hello', 'Hi there');

      expect(prisma.newsletterSubscriber.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'confirmed' } }));
      expect(email.send).toHaveBeenCalledTimes(2);
      expect(email.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'a@example.com', html: expect.stringContaining('tok-a') }));
      expect(email.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'b@example.com', html: expect.stringContaining('tok-b') }));
      expect(prisma.newsletterIssue.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'issue-1' }, data: expect.objectContaining({ sentCount: 2 }) }),
      );
      expect(result.sentCount).toBe(2);
    });

    it('keeps sending to the rest of the list when one recipient fails', async () => {
      prisma.newsletterIssue.create.mockResolvedValueOnce({ id: 'issue-1' });
      prisma.newsletterSubscriber.findMany.mockResolvedValueOnce([
        { email: 'bad@example.com', unsubscribeToken: 'tok-a' },
        { email: 'good@example.com', unsubscribeToken: 'tok-b' },
      ]);
      email.send.mockRejectedValueOnce(new Error('bounced')).mockResolvedValueOnce(undefined);
      prisma.newsletterIssue.update.mockResolvedValueOnce({
        id: 'issue-1',
        subject: 'Hello',
        bodyText: 'Hi',
        sentAt: new Date(),
        sentCount: 1,
        createdAt: new Date(),
      });

      await service.sendIssue('admin-1', 'Hello', 'Hi');

      expect(email.send).toHaveBeenCalledTimes(2);
      expect(prisma.newsletterIssue.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ sentCount: 1 }) }),
      );
    });
  });

  describe('countConfirmedSubscribers', () => {
    it('counts only confirmed subscribers', async () => {
      prisma.newsletterSubscriber.count.mockResolvedValueOnce(42);
      await expect(service.countConfirmedSubscribers()).resolves.toBe(42);
      expect(prisma.newsletterSubscriber.count).toHaveBeenCalledWith({ where: { status: 'confirmed' } });
    });
  });
});
