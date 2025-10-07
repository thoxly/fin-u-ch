import bcrypt from 'bcrypt';

jest.mock('bcrypt');

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('Hash Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const password = 'testPassword123';
      const expectedHash = '$2b$10$hashedPassword';
      
      mockedBcrypt.hash.mockResolvedValue(expectedHash as never);

      const { hashPassword } = await import('./hash');
      const hash = await hashPassword(password);

      expect(hash).toBe(expectedHash);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(password, 10);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'testPassword123';
      const hash = '$2b$10$hashedPassword';
      
      mockedBcrypt.compare.mockResolvedValue(true as never);

      const { verifyPassword } = await import('./hash');
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(password, hash);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword';
      const hash = '$2b$10$hashedPassword';
      
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const { verifyPassword } = await import('./hash');
      const isValid = await verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(wrongPassword, hash);
    });

    it('should reject empty password', async () => {
      const hash = '$2b$10$hashedPassword';
      
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const { verifyPassword } = await import('./hash');
      const isValid = await verifyPassword('', hash);

      expect(isValid).toBe(false);
      expect(mockedBcrypt.compare).toHaveBeenCalledWith('', hash);
    });
  });
});

