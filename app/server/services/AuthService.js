import { ValidationError } from "../domain/errors.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Application service encapsulating authentication and user profile workflows.
 */
export class AuthService {
  constructor(authProvider) {
    this.authProvider = authProvider;
  }

  async getCurrentUser() {
    return this.authProvider.getSessionUser();
  }

  async login(email, password) {
    if (!email || !EMAIL_PATTERN.test(String(email).trim())) {
      throw new ValidationError("Please enter a valid email address");
    }
    if (!password) {
      throw new ValidationError("Please enter your password");
    }
    return this.authProvider.signIn(String(email), String(password));
  }

  async register({ email, password, firstName = "", lastName = "" }) {
    if (!firstName.trim() || !lastName.trim()) {
      throw new ValidationError("First and last name are required");
    }
    if (!email || !EMAIL_PATTERN.test(String(email).trim())) {
      throw new ValidationError("Please enter a valid email address");
    }
    if (!password || String(password).length < 6) {
      throw new ValidationError("Password must be at least 6 characters");
    }
    return this.authProvider.signUp({ email, password, firstName, lastName });
  }

  async logout() {
    return this.authProvider.signOut();
  }

  async requestPasswordReset(email, origin) {
    if (!email || !EMAIL_PATTERN.test(String(email).trim())) {
      throw new ValidationError("Please enter a valid email address");
    }
    return this.authProvider.requestPasswordReset(String(email), origin);
  }

  async resetPassword({ password, token = null }) {
    if (!password || String(password).length < 6) {
      throw new ValidationError("Password must be at least 6 characters");
    }
    return this.authProvider.resetPassword({ password, token });
  }

  async updateProfile(userId, profile) {
    return this.authProvider.updateProfile(userId, profile);
  }
}

