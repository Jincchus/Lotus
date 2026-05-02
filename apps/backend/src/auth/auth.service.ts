import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { User } from '../users/user.entity';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  login(user: User, res: Response): void {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    const isProd = this.config.get<string>('app.env') === 'production';
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7일
    });
  }

  logout(res: Response): void {
    res.clearCookie('access_token');
  }

  getProfile(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      profileImage: user.profileImage,
    };
  }
}
