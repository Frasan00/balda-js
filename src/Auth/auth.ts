import { AuthOptions } from '../Server/ServerTypes';
import * as typeorm from 'typeorm';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import express from '../Server/Customization';

type AuthCodes = 400 | 401 | 403 | 404;

export default class AuthService {
  protected accessTokenSecret: string;
  protected refreshTokenSecret: string;
  protected accessTokenExpiresIn: string;
  protected refreshTokenExpiresIn: string;
  public userRepository: typeorm.Repository<typeorm.BaseEntity>;

  constructor(authOptions: AuthOptions) {
    this.accessTokenSecret = authOptions.accessTokenSecret;
    this.refreshTokenSecret = authOptions.refreshTokenSecret;
    this.accessTokenExpiresIn = authOptions.accessTokenExpiresIn;
    this.refreshTokenExpiresIn = authOptions.refreshTokenExpiresIn;
    this.userRepository = authOptions.UserModel.getRepository();
  }

  /**
   * @description Registers a user and saves it to the database with a hashed password
   * @param user - TypeORM Entity for the user model, user must have a 'password' field and an 'email' field
   */
  public async register<T extends typeorm.BaseEntity>(user: T): Promise<T> {
    const givenUser = user as T & { email: string; password: string };
    if (!givenUser['password'] || !givenUser['email']) {
      throw new Error('User must have a password field');
    }

    const existingUser = await this.userRepository
      .createQueryBuilder(this.userRepository.metadata.targetName)
      .where('email = :email', { email: givenUser.email })
      .getOne();
    if (existingUser) {
      throw new Error('User already exists');
    }

    const randomSalt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(givenUser.password, randomSalt);
    givenUser.password = hashedPassword;

    return await this.userRepository.save(givenUser);
  }

  /**
   * @description Logs a user in and returns a JWT token
   * @param {string} email - The email of the user
   * @param {string} password - The password of the user
   * @returns {string} - The JWT tokens both access and refresh for the user
   * @returns {null} - If the user does not exist
   */
  public async attemptLogin(
    email: string,
    password: string
  ): Promise<
    | { status: string; accessToken: string; refreshToken: string }
    | { status: string; code: AuthCodes }
  > {
    const user = (await this.userRepository
      .createQueryBuilder(this.userRepository.metadata.targetName)
      .where('email = :email', { email })
      .getOne()) as
      | (typeorm.BaseEntity & { id: any; email: string; password: string; active?: boolean })
      | null;
    if (!user) {
      return { status: 'failed', code: 404 };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return { status: 'failed', code: 401 };
    }

    if (user.active === false) {
      return { status: 'failed', code: 403 };
    }

    const jti = crypto.randomUUID();
    const accessToken = this.generateAccessToken(user.id, jti);
    const refreshToken = jwt.sign({ id: user.id }, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiresIn,
    });
    return { status: 'success', accessToken, refreshToken };
  }

  public getAccessTokenPayload(token: string): any {
    return jwt.verify(token, this.accessTokenSecret);
  }

  public getRefreshTokenPayload(token: string): any {
    return jwt.verify(token, this.refreshTokenSecret);
  }

  public generateAccessToken(id: any, jti: string): string {
    return jwt.sign({ id, jti: jti }, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiresIn,
    });
  }

  public generateRefreshToken(id: any, jti: string): string {
    return jwt.sign({ id, acccessTokenJti: jti }, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiresIn,
    });
  }

  /**
   * @description Refreshes the JWT token
   * @param req
   * @param res
   * @param auth
   * @returns {string} token
   */
  public async refreshToken(req: express.Request, res: express.Response, auth: AuthService) {
    if (!req.body.token) {
      return res.badRequest({
        error: 'Bad Request',
        message: 'Missing token field in request body',
      });
    }

    const refreshToken = req.body.token;
    try {
      const payload = auth.getRefreshTokenPayload(refreshToken) as {
        id: any;
        acccessTokenJti: string;
        exp: number;
      };
      if (!payload) {
        return res.unauthorized({
          message: 'Invalid refresh token',
        });
      }

      if (payload.exp && Date.now() >= payload.exp * 1000) {
        return res.forbidden({
          message: 'Refresh token expired',
        });
      }

      const associatedUser = auth.userRepository
        .createQueryBuilder(auth.userRepository.metadata.targetName)
        .where('id = :id', { id: payload.id })
        .getOne();
      if (!associatedUser) {
        return res.notFound({
          message: 'User not found',
        });
      }

      const jti = crypto.randomUUID();
      const accessToken = auth.generateAccessToken(payload.id, jti);
      return res.send({ accessToken });
    } catch (e) {
      return res.unauthorized({
        message: 'Unauthorized',
      });
    }
  }
}

/**
 * @description Middleware to check if the user is authenticated via bearer token, only valid if auth server is enabled
 * @param req
 * @param res
 * @param next
 */
export function authMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
  auth: AuthService
) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.unauthorized({
      message: 'No token provided in Authorization header',
    });
  }

  try {
    const payload = auth.getAccessTokenPayload(token) as { id: any; jti: string; exp: number };
    if (!payload) {
      return res.unauthorized({
        message: 'No payload found in token',
      });
    }

    if (payload.id !== req.user.id) {
        return res.forbidden({
            message: 'Invalid token',
        });
    }

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return res.forbidden({
        message: 'Token expired',
      });
    }

    req.user = auth.userRepository
      .createQueryBuilder(auth.userRepository.metadata.targetName)
      .where('id = :id', { id: payload.id })
      .getOne();
    if (!req.user) {
      return res.notFound({
        message: 'User not found',
      });
    }

    next();
  } catch (e) {
    return res.unauthorized({
      message: 'Unauthorized',
    });
  }
}
