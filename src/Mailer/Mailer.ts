import * as nodemailer from 'nodemailer';
import stream from 'stream';
import Mail from 'nodemailer/lib/mailer';

export default class Mailer {
  private mailer: nodemailer.Transporter;
  private fromEmail: string;

  constructor(nodemailer: nodemailer.Transporter) {
    this.mailer = nodemailer;
    this.fromEmail = '';
  }

  public setGlobalFromEmail(email: string): void {
    this.fromEmail = email;
  }

  public async sendMail(
    to: string,
    subject: string,
    text: string | Buffer | stream.Readable | Mail.AttachmentLike | undefined,
    failOnError: boolean = true,
    from?: string
  ): Promise<void> {
    try {
      await this.mailer.sendMail({
        from: this.fromEmail || from,
        to: to,
        subject: subject,
        text: text,
      });
    } catch (error) {
      if (failOnError) {
        throw error;
      }
    }
  }
}
