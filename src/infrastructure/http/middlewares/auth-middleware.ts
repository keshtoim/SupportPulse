import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { TokenService, UserRepository } from "../../../application/ports";
import { AppError, toPublicUser, type AuthenticatedUser, type UserRole } from "../../../domain/model";

// Расширяем тип Request Express для хранения авторизованного пользователя
declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

type AuthMiddlewareDependencies = {
  tokenService: TokenService;
  userRepository: UserRepository;
};

/**
 * Middleware авторизации: извлекает Bearer-токен, верифицирует его и
 * загружает пользователя из хранилища. Помещает результат в request.authUser.
 */
export const createAuthMiddleware =
  (dependencies: AuthMiddlewareDependencies): RequestHandler =>
  async (request: Request, _: Response, next: NextFunction) => {
    try {
      const header = request.headers.authorization;

      if (!header?.startsWith("Bearer ")) {
        return next(new AppError("Требуется Bearer-токен.", 401, "MISSING_BEARER_TOKEN"));
      }

      const token = header.replace("Bearer ", "").trim();
      const payload = dependencies.tokenService.verifyAccessToken(token);
      const user = await dependencies.userRepository.findById(payload.sub);

      if (!user || user.isBlocked) {
        return next(new AppError("Пользователь не найден или заблокирован.", 401, "USER_NOT_AVAILABLE"));
      }

      request.authUser = toPublicUser(user);
      return next();
    } catch (error) {
      return next(new AppError("Токен недействителен или истек.", 401, "INVALID_ACCESS_TOKEN", error));
    }
  };

/** Middleware проверки ролей — должен стоять после createAuthMiddleware */
export const requireRoles =
  (roles: UserRole[]): RequestHandler =>
  (request: Request, _: Response, next: NextFunction) => {
    if (!request.authUser) {
      return next(new AppError("Пользователь не авторизован.", 401, "UNAUTHORIZED"));
    }

    if (!roles.includes(request.authUser.role)) {
      return next(new AppError("Недостаточно прав.", 403, "FORBIDDEN"));
    }

    return next();
  };

/** Извлекает authUser из запроса; выбрасывает, если middleware не был применён */
export const getRequiredAuthUser = (request: Request): AuthenticatedUser => {
  if (!request.authUser) {
    throw new AppError("Пользователь не авторизован.", 401, "UNAUTHORIZED");
  }

  return request.authUser;
};
