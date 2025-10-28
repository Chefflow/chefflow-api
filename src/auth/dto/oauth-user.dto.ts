import { AuthProvider } from '@prisma/client';
export interface OAuthUserData {
  provider: AuthProvider;
  providerId: string;
  email: string;
  name?: string;
  image?: string;
}
