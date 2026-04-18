import type { PasswordService, RefreshTokenRepository, TokenService, UserRepository } from "../ports";
import { AppError, toPublicUser, type PublicUser } from "../../domain/model";

export class AuthenticationApplicationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService
  ) {}

  async login(email: string, password: string): Promise<{ user: PublicUser; tokens: { accessToken: string; refreshToken: string } }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user || user.isBlocked) {
      throw new AppError("Неверный логин или пароль.", 401, "INVALID_CREDENTIALS");
    }

    const isPasswordValid = await this.passwordService.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError("Неверный логин или пароль.", 401, "INVALID_CREDENTIALS");
    }

    const payload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      name: user.name
    };

    const accessToken = this.tokenService.generateAccessToken(payload);
    const refreshToken = this.tokenService.generateRefreshToken(payload);

    await this.refreshTokenRepository.save(refreshToken);

    return {
      user: toPublicUser(user),
      tokens: {
        accessToken,
        refreshToken: refreshToken.token
      }
    };
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const storedRefreshToken = await this.refreshTokenRepository.get(refreshToken);

    if (!storedRefreshToken) {
      throw new AppError("Refresh-токен не найден.", 401, "REFRESH_TOKEN_NOT_FOUND");
    }

    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    const user = await this.userRepository.findById(payload.sub);

    if (!user || user.isBlocked) {
      throw new AppError("Пользователь недоступен.", 401, "USER_NOT_FOUND");
    }

    await this.refreshTokenRepository.revoke(refreshToken);

    const nextPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
      name: user.name
    };

    const nextAccessToken = this.tokenService.generateAccessToken(nextPayload);
    const nextRefreshToken = this.tokenService.generateRefreshToken(nextPayload);

    await this.refreshTokenRepository.save(nextRefreshToken);

    return {
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken.token
    };
  }
}
