import nodemailer, { type Transporter } from "nodemailer";
import type { EmailService } from "../../application/ports";

/**
 * Email-уведомления через SMTP. Без полного набора SMTP_* переменных работает
 * в выключенном режиме — вызывающий код обязан проверять isEnabled() и не блокировать
 * основной сценарий (создание тикета) при недоступности почты.
 */
export class SmtpEmailService implements EmailService {
  private readonly transporter?: Transporter;
  private readonly from?: string;

  constructor(options?: { host?: string; port: number; user?: string; pass?: string; from?: string }) {
    if (options?.host && options.user && options.pass && options.from) {
      this.transporter = nodemailer.createTransport({
        host: options.host,
        port: options.port,
        secure: options.port === 465,
        auth: { user: options.user, pass: options.pass }
      });
      this.from = options.from;
    }
  }

  isEnabled(): boolean {
    return !!this.transporter;
  }

  async send(params: { to: string[]; subject: string; text: string }): Promise<void> {
    if (!this.transporter || !this.from) {
      throw new Error("EmailService выключен: не заданы SMTP_* переменные окружения.");
    }

    await this.transporter.sendMail({
      from: this.from,
      to: params.to,
      subject: params.subject,
      text: params.text
    });
  }
}
