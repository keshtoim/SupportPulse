import { compare } from "bcryptjs";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import type { AuthTokenPayload, PasswordService, TokenService } from "../../application/ports";

/** Парсит строку вида "15m", "2h", "7d" в миллисекунды */
const parseDurationToMilliseconds = (value: string): number => {
  const match = value.trim().match(/^(\d+)([mhd])$/i);

  if (!match) {
    throw new Error(`Неподдерживаемый формат времени: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  if (unit === "m") {
    return amount * 60 * 1000;
  }

  if (unit === "h") {
    return amount * 60 * 60 * 1000;
  }

  return amount * 24 * 60 * 60 * 1000;
};

/** Сравнивает открытый пароль с bcrypt-хешем */
export class BcryptPasswordService implements PasswordService {
  async compare(plainText: string, hash: string): Promise<boolean> {
    return compare(plainText, hash);
  }
}

/** Подписывает и верифицирует JWT access/refresh токены */
export class JwtTokenService implements TokenService {
  constructor(
    private readonly options: {
      accessSecret: string;
      refreshSecret: string;
      accessTtl: string;
      refreshTtl: string;
    }
  ) {}

  generateAccessToken(payload: AuthTokenPayload): string {
    return jwt.sign(payload, this.options.accessSecret, {
      expiresIn: this.options.accessTtl as SignOptions["expiresIn"]
    });
  }

  generateRefreshToken(payload: AuthTokenPayload) {
    const token = jwt.sign(payload, this.options.refreshSecret, {
      expiresIn: this.options.refreshTtl as SignOptions["expiresIn"]
    });

    return {
      token,
      userId: payload.sub,
      expiresAt: new Date(Date.now() + parseDurationToMilliseconds(this.options.refreshTtl)).toISOString()
    };
  }

  verifyAccessToken(token: string): AuthTokenPayload {
    return this.parseToken(token, this.options.accessSecret);
  }

  verifyRefreshToken(token: string): AuthTokenPayload {
    return this.parseToken(token, this.options.refreshSecret);
  }

  /** Верифицирует токен и проверяет наличие обязательных полей в payload */
  private parseToken(token: string, secret: string): AuthTokenPayload {
    const payload = jwt.verify(token, secret) as JwtPayload & Partial<AuthTokenPayload>;

    if (!payload.sub || !payload.role || !("email" in payload) || !("name" in payload)) {
      throw new Error("Токен не содержит обязательных полей.");
    }

    return {
      sub: String(payload.sub),
      tenantId: payload.tenantId ?? null,
      role: payload.role,
      email: String(payload.email),
      name: String(payload.name)
    };
  }
}
