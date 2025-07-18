import { signUp, confirmSignUp, signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';

export class AuthService {
  static async signUp(email, password, firstName, lastName) {
    try {
      const { user } = await signUp({
        username: email,
        password,
        attributes: {
          email,
          given_name: firstName,
          family_name: lastName,
        },
      });
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async confirmSignUp(email, confirmationCode) {
    try {
      await confirmSignUp({
        username: email,
        confirmationCode,
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async signIn(email, password) {
    try {
      const { isSignedIn, nextStep } = await signIn({
        username: email,
        password,
      });
      return { success: true, isSignedIn, nextStep };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async signOut() {
    try {
      await signOut();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getCurrentUser() {
    try {
      const user = await getCurrentUser();
      return { success: true, user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  static async getAuthToken() {
    try {
      const session = await fetchAuthSession();
      return { success: true, token: session.tokens.idToken };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}