import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  profileImage?: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOneBy({ id });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepo.findOneBy({ googleId });
  }

  async findOrCreate(profile: GoogleProfile): Promise<User> {
    let user = await this.findByGoogleId(profile.googleId);
    if (!user) {
      user = this.usersRepo.create({
        googleId: profile.googleId,
        email: profile.email,
        name: profile.name,
        profileImage: profile.profileImage ?? null,
      });
      user = await this.usersRepo.save(user);
    }
    return user;
  }
}
