import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' });

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: mockSendMail })),
  },
}));

import { sendEmail } from '@/lib/email';

describe('sendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GMAIL_USER = 'sender@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'app-password';
    process.env.TEAM_EMAIL = 'team@hemut.com';
  });

  it('calls sendMail with correct subject and text', async () => {
    await sendEmail('Test Subject', 'Test Body');

    expect(mockSendMail).toHaveBeenCalledWith({
      from: 'sender@gmail.com',
      to: 'team@hemut.com',
      subject: 'Test Subject',
      text: 'Test Body',
    });
  });

  it('calls sendMail exactly once', async () => {
    await sendEmail('Subject', 'Body');
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });
});
