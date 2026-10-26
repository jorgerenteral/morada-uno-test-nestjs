import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from '../config/configuration.js';
import { User } from './user.entity.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let moduleRef: TestingModule;
  let users: UsersService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [User],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User]),
      ],
      providers: [UsersService],
    }).compile();

    users = moduleRef.get(UsersService);
  });

  afterEach(() => moduleRef.close());

  const lohgarra = {
    username: 'lohgarra',
    password: 'rwaaaaawr',
    authorPseudonym: 'Lohgarra',
  };

  it('stores the author pseudonym and never the plain password', async () => {
    const user = await users.create(lohgarra);

    expect(user.id).toBeGreaterThan(0);
    expect(user.authorPseudonym).toBe('Lohgarra');
    expect(user.password).not.toBe('rwaaaaawr');
  });

  it('verifies passwords against the stored hash', async () => {
    const user = await users.create(lohgarra);

    expect(await users.verifyPassword(user, 'rwaaaaawr')).toBe(true);
    expect(await users.verifyPassword(user, 'nope')).toBe(false);
  });

  it('finds users by id and username', async () => {
    const user = await users.create(lohgarra);

    expect((await users.findById(user.id))?.username).toBe('lohgarra');
    expect((await users.findByUsername('lohgarra'))?.id).toBe(user.id);
    expect(await users.findByUsername('ghost')).toBeNull();
  });

  it('rejects duplicated usernames', async () => {
    await users.create(lohgarra);

    await expect(users.create(lohgarra)).rejects.toThrow();
  });

  it('recognises darth vader by username', async () => {
    const vader = await users.create({
      username: 'darth_vader',
      password: 'iwanttopublish',
      authorPseudonym: 'Darth Vader',
    });

    expect(vader.isDarthVader()).toBe(true);
    expect((await users.create(lohgarra)).isDarthVader()).toBe(false);
  });
});
